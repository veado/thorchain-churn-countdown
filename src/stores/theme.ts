import { writable } from "svelte/store";
import * as FP from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import { derived } from "svelte/store";
import { Theme } from "./types";

const DEFAULT_THEME: Theme = Theme.DARK;
const LS_KEY_THEME = "tcc-theme";

// type guard
const isTheme = (v: string): v is Theme =>
  v === Theme.DARK || v === Theme.LIGHT;

// Update DOM - needed for theming
const setAttribute = (t: Theme) =>
  document.documentElement.setAttribute("data-theme", t);

// Try to get initial value from local storage or use default theme
const getInitialTheme = (): Theme =>
  FP.pipe(
    localStorage.getItem(LS_KEY_THEME),
    O.fromNullable,
    O.chain(O.fromPredicate(isTheme)),
    O.getOrElse(() => DEFAULT_THEME)
  );

// @private
const _theme = writable<Theme>(DEFAULT_THEME);

export const initTheme = () => {
  const t = getInitialTheme();
  setAttribute(t);
  _theme.set(t);
};

export const updateTheme = (t: Theme) => {
  setAttribute(t);
  localStorage.setItem(LS_KEY_THEME, t);
  _theme.set(t);
};

// readable only
export const theme = derived(_theme, FP.identity);
