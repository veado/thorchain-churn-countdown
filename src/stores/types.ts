import * as t from "io-ts";

export enum Theme {
  DARK = "dark",
  LIGHT = "light",
}

export type HumanTime = {
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
};

/**
 * IO type for Midgard's `mimir` endpoint
 * It includes few (not all) values we do need here only
 * https://midgard.thorchain.info/v2/thorchain/mimir
 */
export const mimirIO = t.type({
  "mimir//CHURNINTERVAL": t.union([t.number, t.undefined]),
  CHURNINTERVAL: t.union([t.number, t.undefined]),
});

export type Mimir = t.TypeOf<typeof mimirIO>;

/**
 * IO type for Midgards `thorchain/constants` endpoint
 * It includes few (not all) values we do need here only
 * https://midgard.thorchain.info/v2/doc#operation/GetProxiedConstants
 */
export const midgardConstantsIO = t.type({
  int_64_values: t.type({
    ChurnInterval: t.number,
  }),
});

export type MidgardConstants = t.TypeOf<typeof midgardConstantsIO>;

/**
 * IO type for Midgards `thorchain/constants` endpoint
 * It includes few (not all) values we do need here only
 * https://midgard.thorchain.info/v2/doc#operation/GetProxiedConstants
 */
export const midgardNetworkIO = t.type({
  nextChurnHeight: t.string,
});

export type MidgardNetwork = t.TypeOf<typeof midgardNetworkIO>;

/**
 * IO type for subscribing Tendermints `NewBlock`events
 * https://docs.tendermint.com/master/rpc/#/Websocket/subscribe
 */
export const wsNewBlockIO = t.type({
  result: t.type({
    query: t.string,
    data: t.type({
      value: t.type({
        block: t.type({
          header: t.type({
            time: t.string,
            height: t.string,
          }),
        }),
      }),
    }),
  }),
});

export type WSNewBlock = t.TypeOf<typeof wsNewBlockIO>;

export type NewBlock = { timestamp: number; time: string; height: number };
