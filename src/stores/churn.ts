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

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import {
  ChurnNodes,
  ChurnPools,
  type Churn,
  type HumanTime,
  type MidgardConstants,
  type MidgardNetwork,
  type Mimir,
  type NewBlock,
  type WSNewBlock,
} from "./types";
import {
  midgardConstantsIO,
  mimirIO,
  midgardNetworkIO,
  wsNewBlockIO,
} from "./types";
import {
  APP_IDENTIFIER,
  INITIAL_BLOCK_TIME,
  INITIAL_HUMAN_TIME,
  INITIAL_NEW_BLOCK,
} from "./const";

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

const mimir$ = FP.pipe(
  RxAjax.ajax.getJSON<Mimir>(`${THORNODE_API_URL}/thorchain/mimir`, headers),
  RxOp.map((response) => mimirIO.decode(response)),
  RxOp.map((result) =>
    // t.Errors -> Error
    E.mapLeft((_: t.Errors) =>
      Error(`Failed to load mimir ${PathReporter.report(result)}`)
    )(result)
  )
);

const mimirInterval$ = FP.pipe(
  Rx.timer(0 /* trigger w/o delays */, 5 * 60 * 1000 /* 5 min  */),
  Rx.switchMap(() => mimir$),
  RxOp.shareReplay(1)
);

const mimirNodeChurnInterval$ = FP.pipe(
  mimirInterval$,
  RxOp.map(E.map((v) => v.CHURNINTERVAL))
);

const mimirPoolCycle$ = FP.pipe(
  mimirInterval$,
  RxOp.map(E.map((v) => v.POOLCYCLE))
);

const midgardConstants$ = FP.pipe(
  RxAjax.ajax.getJSON<MidgardConstants>(
    `${MIDGARD_API_URL}/thorchain/constants`,
    headers
  ),
  RxOp.map((response) => midgardConstantsIO.decode(response)),
  RxOp.map((result) =>
    // t.Errors -> Error
    E.mapLeft((_: t.Errors) =>
      Error(
        `Failed to load constants from Midgard ${PathReporter.report(result)}`
      )
    )(result)
  ),
  RxOp.shareReplay(1)
);

const midgardConstantsNodeChurnInterval$ = FP.pipe(
  midgardConstants$,
  RxOp.map(E.map((v) => v.int_64_values.ChurnInterval))
);

export const nodeChurnInterval$: Rx.Observable<number> = FP.pipe(
  mimirNodeChurnInterval$,
  RxOp.switchMap((eResult) =>
    FP.pipe(
      eResult,
      // In case of failure (no mimir set), load data from `constants`
      E.fold(
        () => midgardConstantsNodeChurnInterval$,
        (v) => Rx.of(E.right(v))
      )
    )
  ),
  RxOp.map(E.getOrElse(() => 0)),
  RxOp.startWith(0)
);

const midgardConstantsPoolCycle$ = FP.pipe(
  midgardConstants$,
  RxOp.map(E.map((v) => v.int_64_values.PoolCycle))
);

export const poolChurnInterval$: Rx.Observable<number> = FP.pipe(
  mimirPoolCycle$,
  RxOp.switchMap((eResult) =>
    FP.pipe(
      eResult,
      // In case of failure (no mimir set), load data from `constants`
      E.fold(
        () => midgardConstantsPoolCycle$,
        (v) => Rx.of(E.right(v))
      )
    )
  ),
  RxOp.map(E.getOrElse(() => 0)),
  RxOp.startWith(0)
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

const midgardNetwork$ = () =>
  FP.pipe(
    RxAjax.ajax.getJSON<MidgardNetwork>(`${MIDGARD_API_URL}/network`, headers),
    RxOp.map((response) => midgardNetworkIO.decode(response)),
    RxOp.map((result) =>
      // t.Errors -> Error
      E.mapLeft((_: t.Errors) =>
        Error(
          `Failed to load network data from Midgard ${PathReporter.report(
            result
          )}`
        )
      )(result)
    )
  );

// Reload Midgard `network` every 5 min
const midgardNetworkInterval$ = FP.pipe(
  Rx.timer(0 /* trigger w/o delays */, 5 * 60 * 1000 /* 5 min  */),
  Rx.switchMap(() => midgardNetwork$()),
  Rx.shareReplay(1)
);

const blockTimes$ = new Rx.BehaviorSubject<number[]>([]);

const ws$$ = webSocket(THORNODE_WS_URL);

export const newBlock$: Rx.Observable<NewBlock> = ws$$
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
          () => INITIAL_NEW_BLOCK,
          (v) => ({
            time: v.result.data.value.block.header.time,
            timestamp: dayjs(v.result.data.value.block.header.time).valueOf(),
            height: parseInt(v.result.data.value.block.header.height),
          })
        )
      )
    ),
    RxOp.startWith(INITIAL_NEW_BLOCK),
    RxOp.pairwise(),
    RxOp.map(([prev, current]) => {
      // ignore initial zero value
      if (prev.timestamp > 0) {
        const diffMs = dayjs(current.timestamp).diff(dayjs(prev.timestamp));
        // update list of all current blocktimes
        blockTimes$.next([...blockTimes$.getValue(), diffMs]);
      }
      return current;
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

export const blockHeight$: Rx.Observable<number> = FP.pipe(
  newBlock$,
  RxOp.map(({ height }) => height),
  RxOp.startWith(0),
  RxOp.shareReplay(1)
);

// MOCKING data - for debugging only
// export const blockHeight$: Rx.Observable<number> = FP.pipe(
//   Rx.interval(250),
//   Rx.map((v) => 3802330 + v),
//   RxOp.startWith(0)
// );

// Block height of next Node churn
const nextNodeChurn$: Rx.Observable<number> = FP.pipe(
  midgardNetworkInterval$,
  RxOp.map((eResult) =>
    FP.pipe(
      eResult,
      E.map(({ nextChurnHeight }) => parseInt(nextChurnHeight))
    )
  ),
  RxOp.map(E.getOrElse(() => 0)),
  RxOp.startWith(0)
);

export const poolActivationCountdown$: Rx.Observable<number> = FP.pipe(
  midgardNetworkInterval$,
  RxOp.map((eResult) =>
    FP.pipe(
      eResult,
      E.map(({ poolActivationCountdown }) => parseInt(poolActivationCountdown))
    )
  ),
  RxOp.map(E.getOrElse(() => 0)),
  RxOp.startWith(0)
);

// Next pool churn does some internal calculations to keep requests to Midgard small
const nextPoolChurn$ = (): Rx.Observable<number> => {
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
    RxOp.map((blockHeight) => {
      // With each new block height, we increase counter ...
      counter++;
      // ... to calculate next pool churn height
      return blockHeight + countdown - counter;
    }),
    RxOp.startWith(0)
  );
};

export const nextChurn$: Rx.Observable<number> = FP.pipe(
  churnType$,
  RxOp.switchMap((churnType) =>
    FP.pipe(
      churnType,
      E.fold(
        (_ /* pools */) => nextPoolChurn$(),
        (_ /* nodes */) => nextNodeChurn$
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

export const blocksLeft$: Rx.Observable<number> = FP.pipe(
  Rx.combineLatest([nextChurn$, blockHeight$]),
  RxOp.map(([nextChurn, blockHeight]) => {
    // values can be zero
    if (!nextChurn || !blockHeight) return 0;

    const blocksLeft = nextChurn - blockHeight;

    // Don't accept negative values (happens right after a churn)
    return blocksLeft > 0 ? blocksLeft : 0;
  })
);

export const percentLeft$: Rx.Observable<number> = FP.pipe(
  Rx.combineLatest([churnInterval$, blocksLeft$]),
  RxOp.map(([churnInterval, blocksLeft]) => {
    // ignore zero values
    if (!churnInterval || !blocksLeft) return 0;

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
