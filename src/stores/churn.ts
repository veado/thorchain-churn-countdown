import { envOrDefault } from "../utils/env";

import * as Rx from "rxjs";
import * as RxOp from "rxjs/operators";
import * as FP from "fp-ts/lib/function";
import type * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import * as RxAjax from "rxjs/ajax";
import * as E from "fp-ts/lib/Either";
import { webSocket } from "rxjs/webSocket";
import * as A from "fp-ts/lib/Array";
import * as O from "fp-ts/lib/Option";
import * as RD from "@devexperts/remote-data-ts";

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import {
  ChurnNodes,
  ChurnPools,
  type Churn,
  type HumanTime,
  type MidgardNetwork,
  type Mimir,
  type NewBlock,
  type WSNewBlock,
  type WS_STATUS,
} from "./types";
import {
  mimirIO,
  midgardNetworkIO,
  wsNewBlockIO,
} from "./types";
import {
  APP_IDENTIFIER,
  INITIAL_BLOCK_TIME,
  INITIAL_HUMAN_TIME,
} from "./const";
import { writable } from "svelte/store";
import { toReadable } from "../utils/data";
import { sequenceTRD } from "../utils/fp";
import { triggerStream } from "../utils/rx";

// https://day.js.org/docs/en/plugin/duration
dayjs.extend(duration);

const headers = { "x-client-id": `${APP_IDENTIFIER}` };

const LS_CHURNTYPE = "tcc-ctype";
/* Try to get's intital churn type from LS */
const getInitialChurnType = (): Churn =>
  FP.pipe(
    localStorage.getItem(LS_CHURNTYPE),
    O.fromNullable,
    O.chain(
      O.fromPredicate<"pools" | "nodes">((v) => v === "pools" || v === "nodes")
    ),
    // string -> Churn
    O.map((v) => (v === "pools" ? ChurnPools : ChurnNodes)),
    O.getOrElse(() => ChurnNodes)
  );

export const churnType$ = new Rx.BehaviorSubject<Churn>(getInitialChurnType());

// export const changeChurnType = (type: Churn) => churnType$.next(type);
export const toggleChurnType = () => {
  // get next value
  const next = E.isLeft(churnType$.value) ? ChurnNodes : ChurnPools;
  // update LS
  FP.pipe(next, E.fold(FP.identity, FP.identity), (value) =>
    localStorage.setItem(LS_CHURNTYPE, value)
  );
  // update state
  churnType$.next(next);
};

const MIDGARD_API_URL = envOrDefault(
  import.meta.env.VITE_MIDGARD_API_URL,
  "https://midgard.ninerealms.com/v2"
);

const THORNODE_API_URL = envOrDefault(
  import.meta.env.VITE_THORNODE_API_URL,
  "https://thornode.ninerealms.com"
);

const THORNODE_WS_URL = envOrDefault(
  import.meta.env.VITE_THORNODE_WS_URL,
  "wss://rpc.ninerealms.com/websocket"
);

export const mimirError$ = new Rx.BehaviorSubject<O.Option<Error>>(O.none);

const { stream$: reloadMimir$, trigger: reloadMimir } = triggerStream();

export { reloadMimir };

const mimirRD$: Rx.Observable<RD.RemoteData<Error, Mimir>> = FP.pipe(
  Rx.combineLatest([
    reloadMimir$,
    // reload mimir every 5 min
    Rx.timer(0 /* trigger w/o delays */, 5 * 60 * 1000 /* 5 min  */),
  ]),
  RxOp.debounceTime(300),
  RxOp.switchMap(() => {
    // clear errors before reloading
    mimirError$.next(O.none);
    return FP.pipe(
      RxAjax.ajax.getJSON<Mimir>(
        `${THORNODE_API_URL}/thorchain/mimir`,
        headers
      ),
      RxOp.map((response) => mimirIO.decode(response)),
      RxOp.map((decodedResult) =>
        FP.pipe(
          decodedResult,
          // t.Errors -> Error
          E.mapLeft((_: t.Errors) => {
            const error = Error(
              `Failed to load mimir ${PathReporter.report(decodedResult)}`
            );
            // update error state
            mimirError$.next(O.some(error));
            return error;
          })
        )
      ),
      RxOp.map(RD.fromEither),
      RxOp.startWith(RD.pending)
    );
  }),
  RxOp.shareReplay(1)
);

const mimir$: Rx.Observable<E.Either<Error, Mimir>> = FP.pipe(
  mimirRD$,
  RxOp.map(
    RD.toEither(
      () => new Error("Mimir not fetched"),
      () => new Error("Mimir fetching")
    )
  )
);

export const INITIAL_NODE_CHURNINTERVAL = 0;

export const nodeChurnInterval$: Rx.Observable<number> = FP.pipe(
  mimir$,
  RxOp.map(E.map((v) => v.CHURNINTERVAL)),
  RxOp.catchError((error) => {
    // store error
    mimirError$.next(O.some(error));
    return Rx.of(E.left(error));
  }),
  RxOp.map(E.getOrElse(() => 0)),
  RxOp.startWith(INITIAL_NODE_CHURNINTERVAL)
);

export const INITIAL_POOL_CHURNINTERVAL = 0;

const poolChurnInterval$: Rx.Observable<number> = FP.pipe(
  mimir$,
  RxOp.map(E.map((v) => v.POOLCYCLE)),
  RxOp.catchError((error) => {
    // store error
    mimirError$.next(O.some(error));
    return Rx.of(E.left(error));
  }),
  RxOp.map(E.getOrElse(() => 0)),
  RxOp.startWith(INITIAL_POOL_CHURNINTERVAL)
);

export const churnInterval$: Rx.Observable<number> = FP.pipe(
  churnType$,
  Rx.switchMap((type) =>
    FP.pipe(
      type,
      E.fold(
        (_ /* pools */) => poolChurnInterval$,
        (_ /* nodes */) => nodeChurnInterval$
      )
    )
  ),
  RxOp.shareReplay(1)
);

export const midgardNetworkError$ = new Rx.BehaviorSubject<O.Option<Error>>(
  O.none
);

const { stream$: reloadMidgardNetwork$, trigger: reloadMidgardNetwork } =
  triggerStream();

export { reloadMidgardNetwork };

const midgardNetworkRD$: Rx.Observable<RD.RemoteData<Error, MidgardNetwork>> =
  FP.pipe(
    Rx.combineLatest([
      reloadMidgardNetwork$,
      // Reload Midgard `network` every 5 min
      Rx.timer(0 /* trigger w/o delays */, 5 * 60 * 1000 /* 5 min  */),
    ]),
    RxOp.debounceTime(300),
    RxOp.switchMap((_) => {
      // clear errors before reloading
      midgardNetworkError$.next(O.none);
      return FP.pipe(
        RxAjax.ajax.getJSON<MidgardNetwork>(
          `${MIDGARD_API_URL}/network`,
          headers
        ),
        RxOp.map((response) => midgardNetworkIO.decode(response)),
        RxOp.map((result) =>
          FP.pipe(
            result,
            // t.Errors -> Error
            E.mapLeft((_: t.Errors) => {
              const error = Error(
                `Failed to load network data from Midgard ${PathReporter.report(
                  result
                )}`
              );
              // update error state
              midgardNetworkError$.next(O.some(error));
              return error;
            })
          )
        ),
        RxOp.map(RD.fromEither),
        RxOp.startWith(RD.pending)
      );
    }),
    Rx.shareReplay(1)
  );

const midgardNetwork$: Rx.Observable<E.Either<Error, MidgardNetwork>> = FP.pipe(
  midgardNetworkRD$,
  RxOp.map(
    RD.toEither(
      () => new Error("Midgard network not fetched"),
      () => new Error("Midgard network fetching")
    )
  )
);

const blockTimes$ = new Rx.BehaviorSubject<number[]>([]);

const wsStatus$$ = writable<WS_STATUS>("connecting");
export const wsStatus$ = toReadable(wsStatus$$);

const ws$$ = webSocket({
  url: THORNODE_WS_URL,
  openObserver: {
    next: () => {
      wsStatus$$.set("connected");
    },
  },
});

export const newBlock$: Rx.Observable<RD.RemoteData<Error, NewBlock>> = ws$$
  .multiplex(
    () => ({
      jsonrpc: "2.0",
      id: 1,
      method: "subscribe",
      params: ["tm.event='NewBlock'"],
    }),
    () => ({
      method: "unsubscribe",
      params: ["tm.event='NewBlock'"],
    }),
    // filter out messages if data is not available
    (event: WSNewBlock) =>
      FP.pipe(
        wsNewBlockIO.decode(event),
        E.fold(
          () => false,
          (v) => v.result.query === "tm.event='NewBlock'"
        )
      )
  )
  .pipe(
    RxOp.map((event: WSNewBlock) =>
      FP.pipe(
        wsNewBlockIO.decode(event),
        E.fold(
          () => RD.failure(Error("Could not parse block data")),
          (v): RD.RemoteData<Error, NewBlock> =>
            RD.success({
              time: v.result.data.value.block.header.time,
              timestamp: dayjs(v.result.data.value.block.header.time).valueOf(),
              height: parseInt(v.result.data.value.block.header.height),
            })
        )
      )
    ),
    RxOp.startWith(RD.pending),
    RxOp.pairwise(),
    RxOp.map(([prev, current]) => {
      FP.pipe(
        sequenceTRD(prev, current),
        RD.map(([p, c]) => {
          const diffMs = dayjs(c.timestamp).diff(dayjs(p.timestamp));
          // update list of all current blocktimes
          blockTimes$.next([...blockTimes$.getValue(), diffMs]);
        })
      );
      return current;
    }),
    RxOp.retry({
      delay: (_) => {
        wsStatus$$.set("closed");
        if (window.navigator.onLine) {
          // retry to re-open connection
          return Rx.timer(1000).pipe(
            RxOp.tap(() => wsStatus$$.set("connecting"))
          );
        } else {
          // wait to be online first to retry a connection
          return Rx.fromEvent(window, "online").pipe(
            RxOp.tap(() => wsStatus$$.set("connecting"))
          );
        }
      },
    }),
    RxOp.shareReplay(1)
  );

const LS_BLOCKTIME = "tcc-btime";

/* Get's intital block time from LS or use initial (guessed) value */
const getInitialBlockTime = () =>
  FP.pipe(
    localStorage.getItem(LS_BLOCKTIME),
    O.fromNullable,
    O.map(parseInt),
    O.chain(O.fromPredicate(Number.isInteger)),
    O.getOrElse(() => INITIAL_BLOCK_TIME)
  );

/**
 * Block time is a calculated, average block time for observed blocks
 * The more block are observed, the more precise the average value we get.
 *
 * Following adjustments are included:
 * - Values are flatten to be two decimal seconds only (e.g. 5512ms -> 5500ms or 58999 -> 59000 )
 * - Min. value 5500
 * - Max. value 6000
 *
 * ^ That's needed to calculate a human block time for a range of blocks (churn interval) as precise as possible
 */
export const blockTime$ = blockTimes$.pipe(
  RxOp.map((times) => {
    if (!times.length) return getInitialBlockTime();

    return FP.pipe(
      times,
      // sum
      A.reduce(0, (prev, next) => prev + next),
      // ignore initial zero value
      O.fromPredicate((v) => v > 0),
      // average values
      O.map((v) => Math.round(v / times.length)),
      // Flatten average values ignore small interferences
      // Just because we check few (not all possible) blocks at front-end side only
      // and don't want to be strict with some possible block time peeks (aka heavy blocks)
      O.map((v) => Math.round(v / 100) * 100),
      // Adjust to <= 6 sec. - ignore higher values
      O.map((v) => Math.min(v, 6000)),
      // Adjust to >= 5.5 sec. - ignore lower values
      O.map((v) => Math.max(v, 5500)),
      // persistent value to local storage
      O.map((v) => {
        localStorage.setItem(LS_BLOCKTIME, v.toString());
        return v;
      }),
      O.getOrElse(() => getInitialBlockTime())
    );
  }),
  RxOp.shareReplay(1),
  RxOp.startWith(getInitialBlockTime())
);

export const INITIAL_BLOCK_HEIGHT = 0;

export const blockHeight$: Rx.Observable<RD.RemoteData<Error, number>> =
  FP.pipe(
    newBlock$,
    RxOp.map(FP.flow(RD.map(({ height }) => height))),
    RxOp.startWith(RD.pending),
    RxOp.shareReplay(1)
  );

// MOCKING data - for debugging only
// export const blockHeight$: Rx.Observable<number> = FP.pipe(
//   Rx.interval(250),
//   Rx.map((v) => 3802330 + v),
//   RxOp.startWith(0)
// );

export const INITIAL_NEXT_CHURN_HEIGHT = 0;

// Block height of next Node churn
const nextNodeChurnRD$: Rx.Observable<RD.RemoteData<Error, number>> = FP.pipe(
  midgardNetworkRD$,
  RxOp.map(RD.map(({ nextChurnHeight }) => parseInt(nextChurnHeight))),
  RxOp.startWith(RD.pending)
);

export const poolActivationCountdown$: Rx.Observable<number> = FP.pipe(
  midgardNetwork$,
  RxOp.map((eResult) =>
    FP.pipe(
      eResult,
      E.map(({ poolActivationCountdown }) => parseInt(poolActivationCountdown))
    )
  ),
  RxOp.catchError((error) => {
    // store error
    midgardNetworkError$.next(O.some(error));
    return Rx.of(E.left(error));
  }),
  RxOp.map(E.getOrElse(() => 0)),
  RxOp.startWith(0)
);

// Next pool churn does some internal calculations to keep requests to Midgard small
const nextPoolChurnRD$ = (): Rx.Observable<RD.RemoteData<Error, number>> => {
  // Local state to count number of new block height coming in
  let counter = 0;
  // Local state of `poolActivationCountdown` we get from Midgard
  let countdown = 0;
  return FP.pipe(
    poolActivationCountdown$,
    Rx.tap((value) => {
      // Update countdown state
      countdown = value;
      // Reset counter
      counter = 0;
    }),
    Rx.switchMap(() => blockHeight$),
    RxOp.map(
      FP.flow(
        RD.map((blockHeight) => {
          // With each new block height, we increase counter ...
          counter++;
          // ... to calculate next pool churn height
          const nextChurn = blockHeight + countdown - counter;
          return nextChurn;
        })
      )
    ),
    RxOp.startWith(RD.pending)
  );
};

export const nextChurn$: Rx.Observable<RD.RemoteData<Error, number>> = FP.pipe(
  churnType$,
  RxOp.switchMap((churnType) =>
    FP.pipe(
      churnType,
      E.fold(
        (_ /* pools */) => nextPoolChurnRD$(),
        (_ /* nodes */) => nextNodeChurnRD$
      )
    )
  ),
  RxOp.shareReplay(1)
);

// MOCKING data - for debugging only
// export const nextChurn$: Rx.Observable<number> = FP.pipe(
//   Rx.of(3802440),
//   RxOp.startWith(0)
// );

const INITIAL_BLOCKS_LEFT = 0;

export const blocksLeft$: Rx.Observable<number> = FP.pipe(
  Rx.combineLatest([nextChurn$, blockHeight$]),
  RxOp.map(([nextChurnRD, blockHeightRD]) => {
    if (!RD.isSuccess(nextChurnRD) && !RD.isSuccess(blockHeightRD))
      return INITIAL_BLOCKS_LEFT;

    return FP.pipe(
      sequenceTRD(nextChurnRD, blockHeightRD),
      RD.map(([nextChurn, blockHeight]) => {
        const blocksLeft = nextChurn - blockHeight;
        // Don't accept negative values (happens right after a churn)
        return blocksLeft > 0 ? blocksLeft : INITIAL_BLOCKS_LEFT;
      }),
      RD.getOrElse(() => INITIAL_BLOCKS_LEFT)
    );
  })
);

export const INITIAL_PERCENT_LEFT = 0;

export const percentLeft$: Rx.Observable<number> = FP.pipe(
  Rx.combineLatest([churnInterval$, blocksLeft$]),
  RxOp.map(([churnInterval, blocksLeft]) => {
    // ignore zero values
    if (!churnInterval || !blocksLeft) return INITIAL_PERCENT_LEFT;

    return (blocksLeft * 100) / churnInterval;
  })
);

export const timeLeft$: Rx.Observable<HumanTime> = FP.pipe(
  Rx.combineLatest([blocksLeft$, blockTime$]),
  RxOp.map(([blocksLeft, blockTime]) => {
    const secondsLeftMs = blocksLeft * blockTime;

    const d = dayjs.duration(secondsLeftMs);

    const timeLeft: HumanTime = {
      seconds: d.get("seconds"),
      minutes: d.get("minutes"),
      hours: d.get("hours"),
      days: d.get("days"),
    };

    return timeLeft;
  }),
  RxOp.startWith(INITIAL_HUMAN_TIME)
);

export const churnIntervalTime$: Rx.Observable<HumanTime> = FP.pipe(
  Rx.combineLatest([churnInterval$, blockTime$]),
  RxOp.map(([churnInterval, blockTime]) => {
    const secondsLeftMs = churnInterval * blockTime;
    const d = dayjs.duration(secondsLeftMs);
    const timeLeft: HumanTime = {
      // ignore seconds
      seconds: 0,
      minutes: d.get("minutes"),
      hours: d.get("hours"),
      days: d.get("days"),
    };

    return timeLeft;
  }),
  RxOp.startWith(INITIAL_HUMAN_TIME)
);
