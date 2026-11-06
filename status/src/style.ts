// Spec 012: colour tokens, CSS and favicons of the page (research.md §1, §5, §7).

// Spec 019: the DaisyUI theme of the page: "bumblebee" (Maintainer's choice, 2026-11-06), with
// two changes for spec 019 FR-010: color-scheme light (the base is white) and a darker
// error-content (4.95:1 on the error colour; the original 39% gives 3.5:1).
export const THEME: Record<string, string> = {
  "--color-base-100": "oklch(100% 0 0)",
  "--color-base-200": "oklch(97% 0 0)",
  "--color-base-300": "oklch(92% 0 0)",
  "--color-base-content": "oklch(20% 0 0)",
  "--color-primary": "oklch(85% 0.199 91.936)",
  "--color-primary-content": "oklch(42% 0.095 57.708)",
  "--color-secondary": "oklch(75% 0.183 55.934)",
  "--color-secondary-content": "oklch(40% 0.123 38.172)",
  "--color-accent": "oklch(0% 0 0)",
  "--color-accent-content": "oklch(100% 0 0)",
  "--color-neutral": "oklch(37% 0.01 67.558)",
  "--color-neutral-content": "oklch(92% 0.003 48.717)",
  "--color-info": "oklch(74% 0.16 232.661)",
  "--color-info-content": "oklch(39% 0.09 240.876)",
  "--color-success": "oklch(76% 0.177 163.223)",
  "--color-success-content": "oklch(37% 0.077 168.94)",
  "--color-warning": "oklch(82% 0.189 84.429)",
  "--color-warning-content": "oklch(41% 0.112 45.904)",
  "--color-error": "oklch(70% 0.191 22.216)",
  "--color-error-content": "oklch(28% 0.141 25.723)",
  "--radius-selector": "2rem",
  "--radius-field": "2rem",
  "--radius-box": "2rem",
  "--size-selector": "0.1875rem",
  "--size-field": "0.1875rem",
  "--border": "1px",
  "--depth": "1",
  "--noise": "1",
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
