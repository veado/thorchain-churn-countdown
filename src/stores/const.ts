import type { HumanTime, NewBlock } from "./types";

export const APP_IDENTIFIER = import.meta.env?.VITE_APP_IDENTIFIER ?? "";

export const INITIAL_HUMAN_TIME: HumanTime = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

/* Initial (guessed) block time in millisecond */
export const INITIAL_BLOCK_TIME = 5850;
export const INITIAL_NEW_BLOCK: NewBlock = {
  timestamp: 0,
  height: 0,
  time: "0",
};
