// Spec 020 US3, contracts/app.md: the files that make the page an installable app.
import { ICON } from "./style";

// The bumblebee primary oklch(85% 0.199 91.936) in hex (research.md §5).
export const THEME_COLOR = "#fdc700";

export function manifest(): string {
  const icon = (src: string, purpose: string) => ({
    src,
    sizes: "any",
    type: "image/svg+xml",
    purpose,
  });
  return JSON.stringify({
    name: "Project status",
    short_name: "Status",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: THEME_COLOR,
    icons: [icon("icon.svg", "any"), icon("icon-maskable.svg", "maskable")],
  });
}

// The "correct" shape of spec 012; the maskable one on a white square with the shape at 80%.
export function icons(): { "icon.svg": string; "icon-maskable.svg": string } {
  const inner = ICON.correct.replace(/^<svg[^>]*>|<\/svg>$/g, "");
  return {
    "icon.svg": ICON.correct,
    "icon-maskable.svg": `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' fill='#ffffff'/><g transform='translate(1.6 1.6) scale(0.8)'>${inner}</g></svg>`,
  };
}

// Network first for the page and status.json; the stored copy only when the network fails
// (FR-007). Nothing else is cached.
export function serviceWorker(): string {
  return `const CACHE = "project-status-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const wanted = request.mode === "navigate" || url.pathname.endsWith("/status.json");
  if (request.method !== "GET" || !wanted || url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then((hit) => hit ?? Response.error()),
      ),
  );
});
`;
}
