# Claude Inbox — Project Guidelines

A Chrome extension that shows, in Chrome's side panel, the status of every Claude session running in PowerPoint for the web. You work on 3–4 decks at once and need to see at a glance which Claude sessions are still working and which are done and need checking. Clicking a row takes you to that deck.

This document is the spec. Decisions marked **(decided)** came out of a design interview and should not change without asking the user.

---

## 1. Problem

- The user runs Claude in PowerPoint (the Anthropic add-in) on several decks in parallel, plus other Claude sessions.
- There's no single view of which sessions are still working and which have finished.
- Goal: an "inbox" on the right-hand side that is always visible while switching between decks, shows each session's status, and lets you jump to the right deck in one click.

## 2. Approach (decided)

- **Chrome extension (Manifest V3)**, not an Office add-in or an MCP connector.
  - Office task panes are per document (no global pane), and Office.js cannot switch to another open file.
  - A connector would require every session to report its own status. The extension reads the status directly from the page instead.
- **PowerPoint for the web only** in v1. The Claude add-in runs there inside an iframe, and the extension injects a content script into that iframe.
- **Breaking easily is acceptable** in v1. Detection depends on the Claude add-in's page structure, which Anthropic can change at any time.

## 3. Scope

### In v1
- PowerPoint for the web tabs with the Claude add-in.
- Sessions added manually through **"Add session"** (any URL, e.g. a claude.ai chat or Outlook web). These are tracked as tabs (open/closed, title). Status detection for non-PowerPoint pages is best effort and may show `unknown`.

### Out of v1 (later)
- Desktop PowerPoint, desktop Outlook, Claude desktop app, Claude Code sessions. Possible v2: a small connector or hook bridge feeding the same panel.
- "Needs input" for free-text questions (Claude asking something in its reply looks like "finished"). Permission prompts are covered in v1, see §4.
- Jumping to or highlighting the specific slides that changed.
- Multiple users or syncing between devices.

## 4. Statuses (decided)

| Status | Meaning | How detected |
|---|---|---|
| `idle` | Tracked, Claude has not run since tracking started | Not thinking, and never seen thinking |
| `working` | Claude is thinking or generating | "Thinking" indicator visible (e.g. Stop button or streaming indicator) |
| `needs input` | Claude is blocked on the user | A "Permission required" prompt is showing (the Stop button stays visible meanwhile) |
| `done – to check` | Claude was working and stopped | Changed from `working` to not thinking |
| `reviewed` | User has checked the result | User clicks ✓ on the row. Simply opening the tab does **not** mark it reviewed |
| `unknown` | Detection failed | Claude add-in iframe or selectors not found |

- No `stalled` status: a long run is just `working`.
- `needs input` added 2026-10-18 at the user's request (decided): permission prompts only. It counts in the badge, sends a notification, and goes back to `working` once answered, or to `done – to check` if the run ends.
- Reviewed rows fold into a collapsed section and are deleted after **7 days**.
- When Claude starts working again on a `done` or `reviewed` row, it goes back to `working`.

## 5. Detection (decided)

- **Poll once per second** in each PowerPoint web tab: "Is Claude still thinking?"
  - If yes, the status is `working`.
  - If not, and the previous status was `working`, it becomes `done – to check`.
- The check runs in a content script injected into the **Claude add-in iframe** (`all_frames: true`). It sends status messages to the background service worker, which knows the tab from `sender.tab`.
- **All DOM selectors live in one file** (`src/selectors.js`) so they can be updated quickly when the Claude UI changes. If no selector matches, the status is `unknown`, never a guess.
- **Background tab throttling (accepted):** after about 5 min hidden, Chrome slows repeating timers to roughly once a minute. A background deck may therefore show `done` up to ~1 min late. The visible tab updates every second.
- **Last message excerpt:** when a session goes to `done`, grab the last assistant message text from the add-in (first ~200 characters) and show it on the row.

### First build step: find the selectors
The add-in iframe's web address and its "thinking" indicator are **not known yet**. Before writing detection code:
1. Open a PowerPoint web deck, open the Claude add-in, and inspect it with Chrome DevTools.
2. Note: the iframe `src` origin (needed in `manifest.json` → `host_permissions` and `content_scripts.matches`), the element that exists only while Claude is thinking, and the container of the last assistant message.
3. Write these down in `src/selectors.js` with a comment giving the date they were checked.

## 6. Side panel UI (decided)

- Uses `chrome.sidePanel`, so it stays visible while switching tabs (the main reason for choosing an extension).
- Rows grouped by status, in this order: `needs input`, `done – to check`, `working`, `idle`, `unknown`, then a collapsed `reviewed` section.
- Each row shows the deck or tab title, a surface icon (PowerPoint / other), the status, how long it has been in that status ("3 min"), and the last-message excerpt (when `done`).
- Row actions:
  - **Click the row:** focus that tab and its window (`chrome.tabs.update` + `chrome.windows.update`). If the tab is closed, open the saved URL in a new tab.
  - **✓:** mark as `reviewed`.
  - **✕:** stop tracking.
  - **⧉ (PowerPoint rows):** open the deck in the PowerPoint desktop app, the same handoff as "Open in Desktop App" in the web app (`ms-powerpoint:ofe|u|<file URL>`). The file URL is read from the deck page (added 2026-10-18 at the user's request, decided).
- **"Add session" button:** takes a link, opens it in a new tab and tracks it. The extension can only watch a session while its tab is open.
- Keep it plain and compact; it's a narrow side panel.

## 7. Alerts (decided)

- **Badge** on the extension icon showing the number of `needs input` + `done – to check` rows.
- **Desktop notification** (`chrome.notifications`) when a row changes to `needs input` or `done – to check`. Clicking it focuses the tab.

## 8. State and persistence (decided)

- All state lives in **`chrome.storage.local`**: local only, survives Chrome restarts and the service worker being suspended. The side panel reloads from it on open.
- **A row is identified by its page URL**, normalized by removing volatile query parameters and the hash, but keeping whatever identifies the document. Tab IDs are stored only as a current pointer and are refreshed when the tab is found again.
- A tab that is reloaded or restored finds its saved row by URL and re-checks its status.
- The MV3 service worker can be suspended at any time, so **never keep state only in memory**.

### Memory Saver
Chrome's Memory Saver can freeze or discard background tabs, which stops detection and may stop the Claude session itself. Setup instruction for the user (put this in the README): add the PowerPoint web sites to **Settings → Performance → Always keep these sites active**.

## 9. Startup behaviour (decided)

- On extension start or install: scan the open tabs and **automatically track every PowerPoint web tab**.
- **Any tab where the Claude add-in reports in is tracked automatically**, whatever the Office app (Outlook web confirmed 2026-10-18; decided). The app is recognised from the tab URL and shown as an icon.
- Outlook web gets **one row per Outlook tab** (keyed on the mailbox, not the open email, since the URL changes with every email) (decided).
- Other pages (claude.ai, …) are tracked **only via "Add session"**.
- PowerPoint web tabs opened later are also tracked automatically.

## 10. Privacy and distribution (decided)

- The extension reads chat content in the add-in. **No data leaves the browser**: no server, no analytics, no external requests.
- Distributed as an **unlisted Chrome Web Store** item (decided 2026-10-19, replaces "unpacked only"); unpacked stays the development setup. Public name **"Add-in Session Inbox"** with a neutral inbox-tray icon: no Claude/Anthropic or Telenet branding in the name, icon or visuals. Source is public on GitHub, which also hosts the privacy policy (`docs/privacy.html`).
- Ask for as few permissions as possible: `sidePanel`, `storage`, `tabs`, `notifications`, plus host permissions for the PowerPoint web and Claude add-in origins only.

## 11. Suggested structure

Plain JavaScript, no build step, no framework (so it loads unpacked as is).

```
manifest.json
src/
  selectors.js        # all DOM selectors + date they were last checked
  content/claude-frame.js   # runs in Claude add-in iframe: 1s poll, sends status
  background.js       # service worker: state, URL matching, badge, notifications, auto-track
  state.js            # chrome.storage.local helpers, URL normalization
sidepanel/
  index.html
  panel.js
  panel.css
icons/
README.md             # install + Memory Saver setup + how to update selectors
```

## 12. Build order

1. Find the iframe origin and selectors (§5) → `selectors.js`, `manifest.json`.
2. Content script: 1 s poll that logs status to the console. Check it against a real deck.
3. Background: state in storage, URL-keyed rows, auto-track PowerPoint tabs.
4. Side panel: list, grouping, click to focus, ✓, ✕, Add session.
5. Badge and notifications.
6. README and a manual test with 2–3 decks at the same time.

## 13. Acceptance test (v1)

- Open 3 PowerPoint web decks and start Claude tasks in two of them.
- The side panel shows all 3: two `working`, one `idle`.
- When a task ends: the row changes to `done – to check` (within 1 s if the tab is visible, within ~1 min if hidden), the badge count goes up and a notification appears.
- Clicking the row focuses the right tab. ✓ moves it to reviewed and the badge count goes down.
- After restarting Chrome, rows and statuses are restored.
- If you break a selector on purpose, the row shows `unknown` and nothing crashes.
