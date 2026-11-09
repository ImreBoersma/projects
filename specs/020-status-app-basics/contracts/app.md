# Contract: the installable app

Files next to `index.html`:

| File | Content |
|---|---|
| `manifest.webmanifest` | `name` "Project status", `short_name` "Status", `start_url` "./", `scope` "./", `display` "standalone", `background_color` "#ffffff", `theme_color` `#fdc700` (bumblebee primary), `icons`: `icon.svg` (`any`) and `icon-maskable.svg` (`maskable`), both `sizes: "any"`, `type: "image/svg+xml"` |
| `icon.svg`, `icon-maskable.svg` | the "correct" favicon shape of spec 012; the maskable one with 20% padding on a white square |
| `sw.js` | network first for navigation requests and `status.json`; store each good answer; give the stored copy only when the network fails; nothing else is cached |

Page head: `<link rel="manifest" href="manifest.webmanifest">`, `<meta name="theme-color">`.
The page script registers `sw.js` when `navigator.serviceWorker` exists, and sets the app badge
to the problem count (`setAppBadge` / `clearAppBadge`) when those exist.
