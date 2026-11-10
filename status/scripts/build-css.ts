// Spec 019, research.md §1 and §4: build the DaisyUI CSS with the themes THEME and THEME_DARK of src/style.ts.
import { mkdir } from "node:fs/promises";
import { THEME, THEME_DARK } from "../src/style";

const block = (
  name: string,
  scheme: string,
  vars: Record<string, string>,
) => `@plugin "daisyui/theme" {
  name: "${name}";
  default: ${scheme === "light"};
  prefersdark: ${scheme === "dark"};
  color-scheme: ${scheme};
${Object.entries(vars)
  .map(([k, v]) => `  ${k}: ${v};`)
  .join("\n")}
}`;
const theme = `${block("bumblebee", "light", THEME)}\n${block("bumblebee-dark", "dark", THEME_DARK)}`;

const input = (await Bun.file("src/page.css").text()).replace("/* THEMES */", theme);
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
