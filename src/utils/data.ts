import * as FP from "fp-ts/lib/function";
import { derived, type Readable, type Writable } from "svelte/store";

/** Helper to convert Writable -> Readable */
export const toReadable = <T>(v$$: Writable<T>): Readable<T> =>
  derived(v$$, FP.identity);
