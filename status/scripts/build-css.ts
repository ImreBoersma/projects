// Spec 019, research.md §1 and §4: build the DaisyUI CSS with the colours of TOKENS.
// DaisyUI uses the strong colour (`--color-error`) as the text of a soft badge (analysis C1).
import { mkdir } from "node:fs/promises";
import { TOKENS, type Tokens } from "../src/style";

const theme = (name: string, t: Tokens, dark: boolean) => `@plugin "daisyui/theme" {
  name: "${name}";
  default: ${!dark};
  prefersdark: ${dark};
  color-scheme: ${dark ? "dark" : "light"};
  --color-base-100: ${t.bg};
  --color-base-200: ${t.line};
  --color-base-300: ${t.lineStrong};
  --color-base-content: ${t.fg};
  --color-primary: ${t.link};
  --color-primary-content: ${t.bg};
  --color-neutral: ${t.unknownFg};
  --color-neutral-content: ${t.bg};
  --color-success: ${t.goodFg};
  --color-success-content: ${t.bg};
  --color-warning: ${t.warnFg};
  --color-warning-content: ${t.bg};
  --color-error: ${t.badFg};
  --color-error-content: ${t.bg};
  --radius-box: 0.75rem;
  --radius-field: 0.5rem;
  --radius-selector: 1rem;
}`;

const input = (await Bun.file("src/page.css").text()).replace(
  "/* THEMES */",
  `${theme("calm", TOKENS.light, false)}\n${theme("calm-dark", TOKENS.dark, true)}`,
);
await mkdir("build", { recursive: true });
await Bun.write("build/page-input.css", input.replaceAll('@source "./', '@source "../src/'));
const out = await Bun.$`bunx @tailwindcss/cli -i build/page-input.css -o build/page.css --minify`
  .quiet()
  .nothrow();
if (out.exitCode !== 0) {
  console.error(out.stderr.toString());
  process.exit(1);
}
console.log(`CSS: build/page.css, ${(await Bun.file("build/page.css").size) / 1000} KB`);
