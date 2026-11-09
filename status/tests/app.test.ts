import { describe, expect, test } from "bun:test";
import { icons, manifest, serviceWorker, THEME_COLOR } from "../src/app";

describe("the installable app (spec 020 US3, contracts/app.md)", () => {
  test("manifest", () => {
    const m = JSON.parse(manifest());
    expect(m).toMatchObject({
      name: "Project status",
      short_name: "Status",
      start_url: "./",
      scope: "./",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#fdc700",
    });
    expect(THEME_COLOR).toBe("#fdc700");
    expect(m.icons).toEqual([
      { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ]);
  });

  test("icons: the correct shape; the maskable one on white at 80%", () => {
    const i = icons();
    expect(i["icon.svg"]).toStartWith("<svg");
    expect(i["icon-maskable.svg"]).toContain("<rect width='16' height='16' fill='#ffffff'/>");
    expect(i["icon-maskable.svg"]).toContain("scale(0.8)");
    expect(i["icon-maskable.svg"].match(/<svg/g)).toHaveLength(1);
  });

  test("service worker: network first, the stored copy only on a network error", () => {
    const sw = serviceWorker();
    expect(sw).toContain('addEventListener("fetch"');
    expect(sw).toContain('request.mode === "navigate"');
    expect(sw).toContain('url.pathname.endsWith("/status.json")');
    expect(sw.indexOf("fetch(request)")).toBeLessThan(sw.indexOf("caches.match"));
    expect(sw).toMatch(/\.catch\(\(\) =>\s*caches\.match/);
    expect(() => new Function(sw)).not.toThrow();
  });
});
