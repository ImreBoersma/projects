// Spec 019, research.md §1 and §4: build the DaisyUI CSS with the theme THEME of src/style.ts.
import { mkdir } from "node:fs/promises";
import { THEME } from "../src/style";

const theme = `@plugin "daisyui/theme" {
  name: "bumblebee";
  default: true;
  prefersdark: true;
  color-scheme: light;
${Object.entries(THEME)
  .map(([k, v]) => `  ${k}: ${v};`)
  .join("\n")}
}`;

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
