import { envOrDefault } from "../utils/env";

import * as Rx from "rxjs";
import * as RxOp from "rxjs/operators";
import * as FP from "fp-ts/lib/function";

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import type { HumanTime } from "./types";
import { INITIAL_BLOCK_TIME, INITIAL_HUMAN_TIME } from "./const";

// https://day.js.org/docs/en/plugin/duration
dayjs.extend(duration);

const MIDGARD_URL = envOrDefault(
  import.meta.env.VITE_MIDGARD_API_URL,
  "not- set"
);
const THORCHAIN_RPC_URL = envOrDefault(
  import.meta.env.VITE_THORCHAIN_API_URL,
  "not- set"
);
const THORCHAIN_WS_URL = envOrDefault(
  import.meta.env.VITE_THORCHAIN_WS_URL,
  "not- set"
);

console.log("MIDGARD_URL:", MIDGARD_URL);
console.log("THORCHAIN_RPC_URL:", THORCHAIN_RPC_URL);
console.log("THORCHAIN_WS_URL:", THORCHAIN_WS_URL);

// TODO: Get it from thorchain + mimir
export const churnInterval$ = Rx.of(43200);

const MOCK_INITIAL_BLOCKHEIGHT = 3288195;
const MOCK_LAST_CHURN = MOCK_INITIAL_BLOCKHEIGHT - 15888;

// TODO: Get it from thorchain (via websocket)
export const blockHeight$: Rx.Observable<number> = FP.pipe(
  Rx.timer(0, 6000),
  RxOp.map((v) => MOCK_INITIAL_BLOCKHEIGHT + v),
  RxOp.startWith(0)
);

// TODO: Get it from Midgard
export const lastChurn$ = Rx.of(MOCK_LAST_CHURN);

export const nextChurn$: Rx.Observable<number> = FP.pipe(
  Rx.combineLatest([churnInterval$, lastChurn$]),
  RxOp.map(([churnInterval, lastChurn]) => churnInterval + lastChurn)
);

export const blockChecked$ = Rx.of("14");
export const blockTime$ = Rx.of(INITIAL_BLOCK_TIME);

export const blocksLeft$: Rx.Observable<number> = FP.pipe(
  Rx.combineLatest([nextChurn$, blockHeight$]),
  RxOp.map(([nextChurn, blockHeight]) => nextChurn - blockHeight)
);

export const percentDone$: Rx.Observable<number> = FP.pipe(
  Rx.combineLatest([churnInterval$, blocksLeft$]),
  RxOp.map(([churnInterval, blocksLeft]) => (100 / churnInterval) * blocksLeft)
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

    console.log("timeLeft:", timeLeft);

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

    console.log("churnIntervalTime:", timeLeft);

    return timeLeft;
  }),
  RxOp.startWith(INITIAL_HUMAN_TIME)
);
