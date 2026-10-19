# CLAUDE.md

Chrome extension (Manifest V3) "Add-in Session Inbox" (formerly "Claude Inbox"): a side panel listing the status of Claude sessions running in PowerPoint for the web (`idle` / `working` / `needs input` / `done – to check` / `reviewed` / `unknown`). Click a row to jump to that deck.

**Read `PROJECT_GUIDELINES.md` before starting work.** It is the spec. Items marked "(decided)" are agreed with the user. Don't change them without asking.

## Stack and conventions
- Plain JavaScript (ES modules where MV3 allows), HTML and CSS. **No build step, no npm dependencies, no framework.** The folder must load as is via "Load unpacked".
- Manifest V3. The background is a service worker that can be suspended at any time, so persist all state in `chrome.storage.local` and never rely on in-memory state.
- **All DOM selectors for the Claude add-in go in `src/selectors.js`**, with a comment giving the date they were last checked. No selectors anywhere else.
- If detection fails, report `unknown`. Never guess a status.
- Rows are identified by the normalized page URL, not the tab ID.
- Minimal permissions. No network requests, analytics or external scripts: chat content never leaves the browser.
- Keep code small and readable. v1 is allowed to break easily, so prefer simple over defensive.

## Detection in short
A content script runs in the Claude add-in iframe (`all_frames: true`) and polls **every 1 s**: is Claude thinking? Changing from thinking to not thinking means `done – to check`. It sends messages to the service worker, which updates storage, the badge and notifications.

## First task
The add-in iframe origin and the "thinking" selector are **not known yet**. Start by inspecting a live PowerPoint web deck with the Claude add-in open (ask the user to open DevTools, or use a browser tool if one is available). Record the findings in `src/selectors.js` and `manifest.json` before writing the detection logic. Don't invent origins or selectors.

## Running and testing
- Load: `chrome://extensions` → Developer mode → Load unpacked → select this folder.
- After changes: click the reload icon on the extension card, then reload the PowerPoint tabs (content scripts don't re-inject into tabs that are already open).
- Debug: service worker console via "Inspect views: service worker" on the extension card. Content script logs are in the PowerPoint tab's DevTools: select the Claude add-in iframe in the console's context dropdown.
- No automated tests in v1. Use the manual acceptance test in `PROJECT_GUIDELINES.md` §13.

## User context
- Mac, Chrome, decks stored in OneDrive and opened in PowerPoint for the web.
- Single user and personal tool: no accounts, no sync.
