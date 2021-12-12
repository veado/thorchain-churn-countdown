import { envOrDefault } from "../utils/env";

import * as Rx from "rxjs";
import * as RxOp from "rxjs/operators";
import * as FP from "fp-ts/lib/function";
import type * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import * as RxAjax from "rxjs/ajax";
import * as E from "fp-ts/lib/Either";
import { webSocket } from "rxjs/webSocket";

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import type {
  HumanTime,
  MidgardConstants,
  MidgardNetwork,
  Mimir,
  WSNewBlock,
} from "./types";
import {
  midgardConstantsIO,
  mimirIO,
  midgardNetworkIO,
  wsNewBlockIO,
} from "./types";
import { INITIAL_BLOCK_TIME, INITIAL_HUMAN_TIME } from "./const";

// https://day.js.org/docs/en/plugin/duration
dayjs.extend(duration);

const MIDGARD_API_URL = envOrDefault(
  import.meta.env.VITE_MIDGARD_API_URL,
  "https://midgard.thorchain.info/v2"
);
const THORCHAIN_API_URL = envOrDefault(
  import.meta.env.VITE_THORCHAIN_API_URL,
  "https://thornode.thorchain.info"
);
const THORCHAIN_WS_URL = envOrDefault(
  import.meta.env.VITE_THORCHAIN_WS_URL,
  "wss://rpc.thorchain.info/websocket"
);

const mimir$ = FP.pipe(
  RxAjax.ajax.getJSON<Mimir>(`${THORCHAIN_API_URL}/thorchain/mimir`),
  RxOp.map((response) => mimirIO.decode(response)),
  RxOp.map((result) =>
    // t.Errors -> Error
    E.mapLeft((_: t.Errors) =>
      Error(`Failed to load mimir ${PathReporter.report(result)}`)
    )(result)
  ),
  RxOp.shareReplay(1)
);

const mimirChurnInterval$ = FP.pipe(
  mimir$,
  RxOp.map(E.map((v) => v["mimir//CHURNINTERVAL"]))
);

const midgardConstants$ = FP.pipe(
  RxAjax.ajax.getJSON<MidgardConstants>(
    `${MIDGARD_API_URL}/thorchain/constants`
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

const midgardConstantsChurnInterval$ = FP.pipe(
  midgardConstants$,
  RxOp.map(E.map((v) => v.int_64_values.ChurnInterval))
);

export const churnInterval$ = FP.pipe(
  Rx.combineLatest([
    mimirChurnInterval$,
    Rx.timer(0 /* trigger w/o delays */, 5 * 60 * 1000 /* 5 min  */),
  ]),
  RxOp.switchMap(([eResult, _]) =>
    FP.pipe(
      eResult,
      // In case of failure (no mimir set), load data from Midgard
      E.fold(
        () => midgardConstantsChurnInterval$,
        (v) => Rx.of(E.right(v))
      )
    )
  ),
  RxOp.map((v) => E.getOrElse(() => 0)(v)),
  RxOp.startWith(0)
);

const midgardNetwork$ = FP.pipe(
  RxAjax.ajax.getJSON<MidgardNetwork>(`${MIDGARD_API_URL}/network`),
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
  ),
  RxOp.shareReplay(1)
);

const ws$$ = webSocket(THORCHAIN_WS_URL);

export const newBlock$ = ws$$
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
          () => ({ time: dayjs(0), height: 0 }),
          (v) => ({
            time: dayjs(v.result.data.value.block.header.time),
            height: parseInt(v.result.data.value.block.header.height),
          })
        )
      )
    ),
    RxOp.shareReplay(1)
  );

export const blockHeight$: Rx.Observable<number> = FP.pipe(
  newBlock$,
  RxOp.map(({ height }) => height),
  RxOp.startWith(0)
);

export const nextChurn$: Rx.Observable<number> = FP.pipe(
  midgardNetwork$,
  RxOp.map((eResult) =>
    FP.pipe(
      eResult,
      E.map(({ nextChurnHeight }) => parseInt(nextChurnHeight))
    )
  ),
  RxOp.map(E.getOrElse(() => 0)),
  RxOp.startWith(0)
);

// TODO: Get average block-time
export const blockTime$ = Rx.of(INITIAL_BLOCK_TIME);

export const blocksLeft$: Rx.Observable<number> = FP.pipe(
  Rx.combineLatest([nextChurn$, blockHeight$]),
  RxOp.map(([nextChurn, blockHeight]) => {
    // values can be zero
    if (!nextChurn || !blockHeight) return 0;

    return nextChurn - blockHeight;
  })
);

export const percentDone$: Rx.Observable<number> = FP.pipe(
  Rx.combineLatest([churnInterval$, blocksLeft$]),
  RxOp.map(([churnInterval, blocksLeft]) => {
    // ignore zero values
    if (!churnInterval || !blocksLeft) return 1;

    return 100 - (blocksLeft * 100) / churnInterval;
  })
);

export const timeLeft$: Rx.Observable<HumanTime> = FP.pipe(
  Rx.combineLatest([blocksLeft$, blockTime$]),
  RxOp.map(([blocksLeft, blockTime]) => {
    const secondsLeftMs = blocksLeft * blockTime * 1000;

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
    const secondsLeftMs = churnInterval * blockTime * 1000;
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
