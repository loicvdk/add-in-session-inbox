# Chrome Web Store listing – Add-in Session Inbox

Copy-paste material for the Developer Dashboard. Images are in this folder; regenerate them from
`screenshot.html` / `promo.html` (see the end of this file).

## Package

- File: `dist/add-in-session-inbox-<version>.zip` from `./scripts/package.sh`
  (also attached to each GitHub release).

## Store listing tab

**Name** (from the manifest): Add-in Session Inbox

**Summary** (max 132 characters):

> See at a glance which Claude add-in sessions in PowerPoint and Outlook for the web are working, done or waiting for you.

**Description:**

> Running the Claude add-in in several PowerPoint decks and Outlook at once? Add-in Session Inbox keeps a
> side panel open next to all your tabs and shows the state of every session:
>
> • Needs input – Claude is waiting for your permission to continue
> • Done – to check – Claude finished; the first lines of its reply are shown
> • Working – Claude is still busy, so you can carry on elsewhere
> • Idle – the add-in is open, nothing is running
>
> Features
> • Click a row to jump straight to that tab (or reopen it if you closed it)
> • Badge with the number of sessions that need you, plus desktop notifications
> • Mark a result as reviewed with one click; reviewed rows clear themselves after 7 days
> • Open a deck in the PowerPoint desktop app from the panel
> • PowerPoint tabs are picked up automatically; any tab where the add-in is open is tracked
>
> Privacy
> Everything stays in your browser. No servers, no analytics, no network requests.
> Privacy policy: https://loicvdk.github.io/add-in-session-inbox/privacy.html
>
> Tip: in Chrome Settings → Performance, add your SharePoint, Office and pivot.claude.ai sites to
> "Always keep these sites active", so Memory Saver doesn't pause background tabs.
>
> Not affiliated with or endorsed by Anthropic or Microsoft. Claude is a trademark of Anthropic,
> PowerPoint and Outlook are trademarks of Microsoft; they are named only to describe compatibility.
> Source code: https://github.com/loicvdk/add-in-session-inbox

**Category:** Productivity (Workflow & Planning) · **Language:** English

**Graphic assets:**
- Store icon 128×128: `icons/icon128.png`
- Screenshot 1280×800: `store/screenshot-1.png`
- Small promo tile 440×280: `store/promo-small.png`

**Additional fields:**
- Homepage URL: https://github.com/loicvdk/add-in-session-inbox
- Support URL: https://github.com/loicvdk/add-in-session-inbox/issues

## Privacy practices tab

**Single purpose:**

> Shows, in Chrome's side panel, the status of Claude add-in sessions running in PowerPoint and
> Outlook for the web (working, needs input, done), so the user can see which tab needs attention
> and switch to it.

**Permission justifications:**

| Permission | Justification |
|---|---|
| `sidePanel` | The session list is displayed in Chrome's side panel so it stays visible while switching tabs. |
| `tabs` | Reads the title and address of the tabs where sessions run, to list them, match a reloaded tab to its row, and focus or reopen the tab when the user clicks a row. |
| `storage` | Keeps the session list locally (`chrome.storage.local`) so it survives browser restarts. Nothing is synced or sent anywhere. |
| `notifications` | Tells the user when a session finishes or needs their input. |
| Host access `https://pivot.claude.ai/*` (content script) | This is the page of the Claude add-in inside PowerPoint/Outlook. The script checks once per second whether Claude is working, waiting for permission or done, and reads the start of the last reply for the row preview. |
| Host access `https://*.sharepoint.com/:p:/*` (content script) | On PowerPoint for the web pages only: reads the deck's file address so the "Open in desktop app" button can hand the deck to PowerPoint. |

**Remote code:** No, I am not using remote code. (All JavaScript is in the package; no external scripts.)

**Data usage** – tick what the extension handles, even though it stays on the device:
- [x] **Website content** – Claude's status and a short excerpt of its last reply.
- [x] **Web history** – titles and addresses of the tracked tabs.
- Everything else: not collected.

**Certifications** (tick all three):
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://loicvdk.github.io/add-in-session-inbox/privacy.html

## Distribution tab

- **Visibility:** Unlisted (only people with the link can find it)
- **Regions:** All regions (or limit to where your colleagues are)
- **Pricing:** Free

## Regenerating the images

From the repo root (needs Google Chrome and Python 3):

```sh
python3 -m http.server 8766 &
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"   # Windows: path to chrome.exe
"$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=3000 \
  --window-size=1280,800 --screenshot="$PWD/store/screenshot-1.png" http://localhost:8766/store/screenshot.html
"$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=1000 \
  --window-size=440,280 --screenshot="$PWD/store/promo-small.png" http://localhost:8766/store/promo.html
kill %1
```

The screenshot uses the real side panel code with demo rows from `store/demo-data.js`.
