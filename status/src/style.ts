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

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const vars = (t: Tokens) =>
  Object.entries(t)
    .map(([k, v]) => `--${kebab(k)}: ${v};`)
    .join(" ");

// Spacing 4/8/12/16/24/40 px; type 13/14/16/20/24 px; weights 400, 500, 600.
export function css(): string {
  return `:root { ${vars(TOKENS.light)} }
@media (prefers-color-scheme: dark) {
  :root { ${vars(TOKENS.dark)} }
}
* { box-sizing: border-box; }
body { margin: 0 auto; padding: 40px 24px 64px; max-width: 760px; background: var(--bg);
  color: var(--fg); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased; }
p { margin: 0; }
.top { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between;
  gap: 8px 24px; margin-bottom: 24px; }
h1 { font-size: 20px; font-weight: 600; margin: 0; }
.top nav { display: flex; gap: 16px; font-size: 14px; }
a { color: var(--link); text-decoration: underline; text-decoration-color: var(--line-strong);
  text-decoration-thickness: 1px; text-underline-offset: 3px; }
a:hover { text-decoration-color: currentColor; }
a:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; border-radius: 2px; }
.nt { font-size: 0.75em; margin-left: 2px; color: var(--muted); }
.sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.total { padding: 24px; border-radius: 12px; margin-bottom: 40px; }
.total.correct { background: var(--good-bg); }
.total.problems { background: var(--bad-bg); }
.total.not-available { background: var(--unknown-bg); }
.total .state { display: flex; align-items: center; gap: 12px; font-size: 24px; font-weight: 600;
  line-height: 1.3; margin-bottom: 8px; }
.total.correct .state { color: var(--good-fg); }
.total.problems .state { color: var(--bad-fg); }
.total.not-available .state { color: var(--unknown-fg); }
.total svg { display: block; width: 24px; height: 24px; }
.total .meta { color: var(--muted); font-size: 14px; margin-top: 4px; }
#stale { color: var(--stale); font-weight: 600; margin-top: 8px; }
section { margin-bottom: 40px; }
h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--muted); margin: 0 0 4px; }
.count { font-weight: 400; margin-left: 4px; }
.projects, .problems, .facts { list-style: none; padding: 0; }
.projects { margin: 0; }
.project { padding: 16px 0; border-top: 1px solid var(--line); }
.project:first-child { border-top: 0; }
.name { display: flex; align-items: center; gap: 12px; font-weight: 600; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--mark-up); }
.dot.warn { background: var(--dot-warn); }
.dot.bad { background: var(--mark-down); }
.dot.unknown { background: var(--mark-none); }
.tag { font-weight: 400; font-size: 13px; color: var(--muted); }
.problems { margin: 8px 0 0 20px; }
.problems li + li { margin-top: 8px; }
.problems > li > a { color: var(--bad-fg); }
.since, .rules { color: var(--muted); font-size: 14px; }
.rules a { color: var(--muted); }
.facts { margin: 4px 0 0 20px; display: flex; flex-wrap: wrap; gap: 4px 20px; font-size: 14px;
  color: var(--muted); }
.facts a { color: var(--muted); }
.badge { display: inline-block; padding: 0 8px; border-radius: 999px; font-weight: 500; }
.badge.warn { color: var(--warn-fg); background: var(--warn-bg); }
.badge.bad { color: var(--bad-fg); background: var(--bad-bg); }
.badge.unknown { color: var(--unknown-fg); background: var(--unknown-bg); }
a:has(> .badge) { text-decoration: none; }
.bar { display: inline-flex; gap: 1px; vertical-align: middle; margin-left: 4px; }
.mark { display: inline-block; width: 3px; height: 12px; border-radius: 1px; background: var(--mark-none); }
.mark.up { background: var(--mark-up); }
.mark.down { background: var(--mark-down); }
@media (max-width: 600px) {
  body { padding: 24px 16px 48px; }
  .total { padding: 20px; margin-bottom: 32px; }
  .total .state { font-size: 20px; }
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
