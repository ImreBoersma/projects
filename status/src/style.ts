// Spec 012: colour tokens, CSS and favicons of the page (research.md §1, §5, §7).

// Spec 012 design revision (research.md §9): warm neutrals, colour only for states that need
// attention.
const LIGHT = {
  bg: "#fbfbfa",
  fg: "#1f2328",
  muted: "#5f6670",
  line: "#e8e8e5",
  lineStrong: "#b8bcc2",
  link: "#1f2328",
  stale: "#b42318",
  markUp: "#4aa36b",
  markDown: "#d9534f",
  markNone: "#d5d7da",
  dotWarn: "#d4a017",
  goodFg: "#1a6b33",
  goodBg: "#edf5ef",
  warnFg: "#734700",
  warnBg: "#fdf2d8",
  badFg: "#a8231a",
  badBg: "#fcebe9",
  unknownFg: "#474e56",
  unknownBg: "#eff0f1",
};

export type Tokens = typeof LIGHT;

export const TOKENS: { light: Tokens; dark: Tokens } = {
  light: LIGHT,
  dark: {
    bg: "#121314",
    fg: "#e6e6e3",
    muted: "#9aa0a6",
    line: "#26292c",
    lineStrong: "#4a4f55",
    link: "#e6e6e3",
    stale: "#ffb4a9",
    markUp: "#5fbf80",
    markDown: "#f08a80",
    markNone: "#3b3f43",
    dotWarn: "#e0b43a",
    goodFg: "#86d3a0",
    goodBg: "#15261b",
    warnFg: "#f2cc60",
    warnBg: "#2c230f",
    badFg: "#ffb4a9",
    badBg: "#33191a",
    unknownFg: "#c4c7cb",
    unknownBg: "#22252a",
  },
};

// Research.md §7: a different shape for each total state (FR-003).
export const ICON = {
  correct:
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><circle cx='8' cy='8' r='7' fill='#1e8e3e'/><path d='M4.5 8.5l2.5 2.5 4.5-5' stroke='#fff' stroke-width='2' fill='none'/></svg>",
  problems:
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect x='1' y='1' width='14' height='14' rx='2' fill='#d93025'/><path d='M8 3.5v6' stroke='#fff' stroke-width='2.2'/><circle cx='8' cy='12.3' r='1.3' fill='#fff'/></svg>",
  "not-available":
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M8 1L15.5 15H.5z' fill='#5f6368'/><path d='M6.4 7.4a1.7 1.7 0 1 1 2.4 1.5c-.5.3-.8.6-.8 1.3' stroke='#fff' stroke-width='1.4' fill='none'/><circle cx='8' cy='12.6' r='.9' fill='#fff'/></svg>",
};

export const FAVICON = Object.fromEntries(
  Object.entries(ICON).map(([k, svg]) => [k, `data:image/svg+xml,${encodeURIComponent(svg)}`]),
) as Record<keyof typeof ICON, string>;
