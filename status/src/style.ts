// Spec 012: colour tokens, CSS and favicons of the page (research.md §1, §5, §7).

const LIGHT = {
  bg: "#ffffff",
  fg: "#1a1a1a",
  muted: "#666666",
  line: "#dddddd",
  problemRow: "#fdecea",
  stale: "#b3261e",
  link: "#0b57d0",
  markUp: "#1e8e3e",
  markDown: "#d93025",
  markNone: "#c8c8c8",
  goodFg: "#0d652d",
  goodBg: "#e6f4ea",
  warnFg: "#7a4a00",
  warnBg: "#fef7e0",
  badFg: "#a50e0e",
  badBg: "#fce8e6",
  unknownFg: "#3c4043",
  unknownBg: "#eceff1",
};

export type Tokens = typeof LIGHT;

export const TOKENS: { light: Tokens; dark: Tokens } = {
  light: LIGHT,
  dark: {
    bg: "#161616",
    fg: "#eeeeee",
    muted: "#999999",
    line: "#333333",
    problemRow: "#3a1d1b",
    stale: "#f2b8b5",
    link: "#8ab4f8",
    markUp: "#81c995",
    markDown: "#f28b82",
    markNone: "#5f5f5f",
    goodFg: "#a8dab5",
    goodBg: "#0f2e1a",
    warnFg: "#fdd663",
    warnBg: "#3a2c00",
    badFg: "#f6aea9",
    badBg: "#3c1412",
    unknownFg: "#c4c7c5",
    unknownBg: "#2d2f31",
  },
};

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const vars = (t: Tokens) =>
  Object.entries(t)
    .map(([k, v]) => `--${kebab(k)}: ${v};`)
    .join(" ");

export function css(): string {
  return `:root { ${vars(TOKENS.light)} }
@media (prefers-color-scheme: dark) {
  :root { ${vars(TOKENS.dark)} }
}
body { margin: 0 auto; padding: 16px; max-width: 1100px; background: var(--bg); color: var(--fg);
  font: 15px/1.4 system-ui, sans-serif; }
h2 { font-size: 17px; font-weight: 600; margin: 16px 0 8px; }
.wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
small, .meta { color: var(--muted); }
tr.problem { background: var(--problem-row); }
tr.problem td:first-child { font-weight: 600; }
#stale { color: var(--stale); font-weight: 600; }
a { color: var(--link); text-decoration: underline; }
a:focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }
.nt { font-size: 12px; margin-left: 2px; text-decoration: none; display: inline-block; }
.sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.summary { font-weight: 600; }
.badge { display: inline-block; padding: 0 8px; border-radius: 6px; font-weight: 600; }
.badge.good, .total.correct { color: var(--good-fg); background: var(--good-bg); }
.badge.warn { color: var(--warn-fg); background: var(--warn-bg); }
.badge.bad, .total.problems { color: var(--bad-fg); background: var(--bad-bg); }
.badge.unknown, .total.not-available { color: var(--unknown-fg); background: var(--unknown-bg); }
.badge small { color: inherit; font-weight: 400; }
a:has(> .badge) { white-space: nowrap; }
.total { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 6px;
  font-size: 20px; font-weight: 600; margin: 0 0 12px; }
.total svg { width: 20px; height: 20px; }
.bar { display: inline-flex; gap: 1px; flex-wrap: wrap; max-width: 100%; }
.mark { display: inline-block; width: 5px; height: 12px; border-radius: 1px; background: var(--mark-none); }
.mark.up { background: var(--mark-up); }
.mark.down { background: var(--mark-down); }
/* Spec 007: cards on a phone, without horizontal scroll. */
@media (max-width: 600px) {
  .wrap { overflow-x: visible; }
  table, tbody, tr, td { display: block; width: 100%; box-sizing: border-box; }
  thead { display: none; }
  tr { border: 1px solid var(--line); border-radius: 6px; margin-bottom: 12px; padding: 4px 0; }
  td { border: 0; padding: 4px 12px; overflow-wrap: anywhere; }
  td:empty { display: none; }
  td::before { content: attr(data-label); display: block; font-size: 12px; color: var(--muted); }
}`;
}

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
