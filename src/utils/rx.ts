import * as Rx from "rxjs";

/**
 * Helper to create a stream based state to trigger changes of it
 *
 * Originally written for ASGDX https://github.com/thorchain/asgardex-electron/blob/develop/src/renderer/helpers/stateHelper.ts
 */
export const triggerStream = () => {
  const subject$$ = new Rx.BehaviorSubject("");
  return {
    stream$: subject$$.asObservable(),
    trigger: () => subject$$.next("trigger"),
  };
};
