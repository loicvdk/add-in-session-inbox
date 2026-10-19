# Add-in Session Inbox

Chrome side panel listing the status of Claude add-in sessions in PowerPoint and Outlook for the web
(`idle` / `working` / `needs input` / `done – to check` / `reviewed` / `unknown`). Click a row to jump to that tab.
Works in Chrome on Windows and macOS.

Not affiliated with or endorsed by Anthropic or Microsoft. "Claude" is a trademark of Anthropic;
it is used here only to say which add-in this tool works with.

Spec: [`PROJECT_GUIDELINES.md`](PROJECT_GUIDELINES.md) · Privacy policy: [`docs/privacy.html`](docs/privacy.html)

## Install

From the Chrome Web Store (unlisted link, once published), or for development:

1. `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → select this folder.
2. Click the extension icon to open the side panel (pin it to the toolbar first).
3. After changing code: click the reload icon on the extension card, then reload the PowerPoint tabs
   (content scripts are not re-injected into tabs that are already open).

### Memory Saver (important)

Chrome's Memory Saver can freeze background tabs, which stops detection and may stop the Claude
session itself. Go to **Settings → Performance → Always keep these sites active** and add the
PowerPoint for the web sites (e.g. `[*.]sharepoint.com`, `[*.]officeapps.live.com` and `pivot.claude.ai`).

## Open in desktop app

PowerPoint rows have a ⧉ button that opens the deck in the PowerPoint desktop app (Windows or Mac). Chrome asks once whether
to allow opening Microsoft PowerPoint; tick "Always allow" to skip it next time.

## Privacy

Everything stays in `chrome.storage.local`. No network requests, no analytics, no external scripts.

## Updating selectors

All Claude add-in selectors are in [`src/selectors.js`](src/selectors.js). When the add-in UI changes and
rows show `unknown`:

1. Open a deck, open the Claude add-in, open DevTools (`⌥⌘I` on Mac, `Ctrl+Shift+I` on Windows).
2. In the Elements panel, find the add-in `<iframe>` and note its `src` origin (was `https://pivot.claude.ai`, nested inside the `*.officeapps.live.com` PowerPoint frame).
3. In the Console, pick that iframe in the context dropdown (top-left, default "top") and run:

   ```js
   [...document.querySelectorAll('button,[role=button],[aria-busy],[data-testid],[aria-live]')]
     .map(e => [e.tagName, e.getAttribute('aria-label'), e.getAttribute('data-testid'),
                e.getAttribute('aria-busy'), e.className?.toString().slice(0, 60), e.textContent.trim().slice(0, 40)])
   ```

   Run it once while Claude is idle and once while it is thinking. Whatever only appears while thinking
   (often a Stop button) is the `thinking` selector.
4. Update `src/selectors.js` (selectors + "Last checked" date). If the origin changed, update
   `content_scripts.matches` in `manifest.json`.

## Debugging

- Service worker: `chrome://extensions` → Add-in Session Inbox → **Inspect views: service worker**.
- Content script: PowerPoint tab DevTools → Console → choose the Claude add-in iframe in the context
  dropdown.

## Release

1. Bump `version` in `manifest.json`.
2. `./scripts/package.sh` → `dist/add-in-session-inbox-<version>.zip` (only the files the extension needs).
3. Upload the zip in the Chrome Web Store Developer Dashboard and attach it to a GitHub release.

Store listing text, form answers and images: [`store/listing.md`](store/listing.md).

## Status of v1

- [x] Add-in iframe origin (`https://pivot.claude.ai`) → `manifest.json` (`content_scripts`)
- [x] `thinking`, `root`, `assistantMessage` selectors → `src/selectors.js` (checked 2026-10-18)
- [x] PowerPoint page URL pattern (`*.sharepoint.com/:p:/…`) → `src/state.js`
- [x] Background state, badge, notifications, side panel
- [x] Outlook web (same add-in origin, one row per Outlook tab)
- [x] Open in PowerPoint desktop
- [ ] Volatile query params in deck URLs (e.g. is `?e=` stable per deck?) → `src/state.js`
- [ ] Manual acceptance test (`PROJECT_GUIDELINES.md` §13)
