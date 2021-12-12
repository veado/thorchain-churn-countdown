// Copied from `thorchain/asgardex-electron`
// https://github.com/thorchain/asgardex-electron/blob/d5fde3cf3715fe5e536f5417852126b6667083b8/src/shared/utils/env.ts

export type ENV = string;

/**
 * Type guard to check whether a value is an ENV
 **/
export const isEnv = (env: ENV | undefined): env is ENV => !!env;

/**
 * Returns a given ENV if it's valid only or returns a default value
 * @param env {string} ENV
 * @param defaultValue {string} Default value
 */
export const envOrDefault = (env: ENV | undefined, defaultValue: string) =>
  isEnv(env) ? env : defaultValue;
