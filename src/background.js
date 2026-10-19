// Service worker: owns the rows in storage, matches tabs to rows by URL,
// auto-tracks Office tabs, and drives the badge and notifications.
// It can be suspended at any time, so every handler reads state from storage.

import { STATUS, REVIEWED_TTL_MS, isAutoTracked, surfaceOf, normalizeUrl, getRows, setRows } from './state.js';

// Serialize read-modify-write cycles so concurrent messages don't clobber
// each other. This is only a lock; the state itself is in storage.
let queue = Promise.resolve();
function update(fn) {
  const run = queue.then(async () => {
    const rows = await getRows();
    const result = await fn(rows);
    pruneReviewed(rows);
    await setRows(rows);
    await refreshBadge(rows);
    return result;
  });
  queue = run.catch((e) => console.error('[Session Inbox]', e));
  return run;
}

function newRow(url, title, tabId) {
  return {
    key: normalizeUrl(url),
    url,
    title: title || url,
    surface: surfaceOf(url),
    status: STATUS.UNKNOWN,
    since: Date.now(),
    tabId,
    excerpt: '',
    reviewedAt: null,
  };
}

function setStatus(row, status) {
  if (row.status === status) return;
  row.status = status;
  row.since = Date.now();
  row.reviewedAt = status === STATUS.REVIEWED ? Date.now() : null;
}

function findRow(rows, tab) {
  return rows[normalizeUrl(tab.url)] || Object.values(rows).find((r) => r.tabId === tab.id);
}

function pruneReviewed(rows) {
  const now = Date.now();
  for (const [key, r] of Object.entries(rows)) {
    if (r.status === STATUS.REVIEWED && now - r.reviewedAt > REVIEWED_TTL_MS) delete rows[key];
  }
}

async function refreshBadge(rows) {
  const n = Object.values(rows).filter((r) => r.status === STATUS.DONE || r.status === STATUS.INPUT).length;
  await chrome.action.setBadgeText({ text: n ? String(n) : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#d97757' });
}

function notify(row) {
  const input = row.status === STATUS.INPUT;
  chrome.notifications.create(row.key, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: `${input ? 'Claude needs your input' : 'Claude finished'}: ${row.title}`,
    message: input ? 'Waiting for your answer in the add-in' : row.excerpt || 'Done – to check',
    requireInteraction: input,
  });
}

// States that only make sense while we can still see the add-in.
function isLive(row) {
  return row.status === STATUS.WORKING || row.status === STATUS.INPUT || row.status === STATUS.IDLE;
}

// --- Content script reports -------------------------------------------------

async function onFrameState(msg, tab) {
  let toNotify = null;
  await update((rows) => {
    let row = findRow(rows, tab);
    if (!row) {
      // The Claude add-in is open in this tab, so track it whatever the app.
      row = newRow(tab.url, tab.title, tab.id);
      rows[row.key] = row;
    }
    row.tabId = tab.id;
    row.title = tab.title || row.title;

    if (msg.fresh && msg.state === 'idle' && (row.status === STATUS.WORKING || row.status === STATUS.INPUT)) {
      // The add-in was reloaded mid-run, which interrupts the run: not a finish.
      setStatus(row, STATUS.IDLE);
    } else if (msg.state === 'thinking') {
      setStatus(row, STATUS.WORKING);
    } else if (msg.state === 'input') {
      if (row.status !== STATUS.INPUT) toNotify = row;
      setStatus(row, STATUS.INPUT);
    } else if (msg.state === 'idle') {
      if (row.status === STATUS.WORKING || row.status === STATUS.INPUT) {
        row.excerpt = msg.excerpt || '';
        setStatus(row, STATUS.DONE);
        toNotify = row;
      } else if (row.status === STATUS.UNKNOWN) {
        setStatus(row, STATUS.IDLE);
      }
    } else if (isLive(row)) {
      // Detection failed. done/reviewed are about the past, so they stay.
      setStatus(row, STATUS.UNKNOWN);
    }
  });
  if (toNotify) notify(toNotify);
}

// --- Tabs -------------------------------------------------------------------

async function trackTab(tab) {
  await update((rows) => {
    const row = findRow(rows, tab);
    if (row) {
      row.tabId = tab.id;
      row.title = tab.title || row.title;
    } else if (isAutoTracked(tab.url)) {
      const r = newRow(tab.url, tab.title, tab.id);
      rows[r.key] = r;
    }
  });
}

async function scanTabs() {
  for (const tab of await chrome.tabs.query({})) await trackTab(tab);
}

// A reload restarts the add-in, whose first report is flagged `fresh` (see
// onFrameState). No reset here: Outlook "navigates" every time you open an email.
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.url || info.title || info.status === 'complete') await trackTab(tab);
});

chrome.tabs.onRemoved.addListener((tabId) =>
  update((rows) => {
    for (const row of Object.values(rows)) {
      if (row.tabId !== tabId) continue;
      row.tabId = null;
      if (isLive(row)) setStatus(row, STATUS.UNKNOWN);
    }
  })
);

// --- Panel actions ----------------------------------------------------------

async function focusRow(key) {
  const row = (await getRows())[key];
  if (!row) return;
  const tab = row.tabId != null && (await chrome.tabs.get(row.tabId).catch(() => null));
  if (tab) {
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    const created = await chrome.tabs.create({ url: row.url });
    await update((rows) => {
      if (rows[key]) rows[key].tabId = created.id;
    });
  }
}

async function onDocUrl(msg, tab) {
  await update((rows) => {
    let row = findRow(rows, tab);
    if (!row && isAutoTracked(tab.url)) {
      row = newRow(tab.url, tab.title, tab.id);
      rows[row.key] = row;
    }
    if (row) row.docUrl = msg.docUrl;
  });
}

// Same handoff PowerPoint for the web uses for "Open in Desktop App".
async function openDesktop(key) {
  const row = (await getRows())[key];
  if (!row?.docUrl) return;
  const url = `ms-powerpoint:ofe|u|${encodeURI(row.docUrl)}`;
  const tab = row.tabId != null && (await chrome.tabs.get(row.tabId).catch(() => null));
  // Launching a protocol handler doesn't navigate the tab away.
  if (tab) await chrome.tabs.update(tab.id, { url });
  else await chrome.tabs.create({ url, active: false });
}

async function addSession(url) {
  const tab = await chrome.tabs.create({ url });
  await update((rows) => {
    const key = normalizeUrl(url);
    if (!rows[key]) rows[key] = newRow(url, url, tab.id);
    else rows[key].tabId = tab.id;
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  let p;
  if (msg.type === 'frame-state' && sender.tab) p = onFrameState(msg, sender.tab);
  else if (msg.type === 'doc-url' && sender.tab) p = onDocUrl(msg, sender.tab);
  else if (msg.type === 'focus') p = focusRow(msg.key);
  else if (msg.type === 'desktop') p = openDesktop(msg.key);
  else if (msg.type === 'review') p = update((rows) => rows[msg.key] && setStatus(rows[msg.key], STATUS.REVIEWED));
  else if (msg.type === 'remove') p = update((rows) => delete rows[msg.key]);
  else if (msg.type === 'add') p = addSession(msg.url);
  if (!p) return false;
  p.then(() => sendResponse({ ok: true }), (e) => sendResponse({ ok: false, error: String(e) }));
  return true;
});

chrome.notifications.onClicked.addListener((id) => {
  focusRow(id);
  chrome.notifications.clear(id);
});

// --- Startup ----------------------------------------------------------------

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
chrome.runtime.onInstalled.addListener(scanTabs);
chrome.runtime.onStartup.addListener(async () => {
  // Tab IDs don't survive a browser restart; scanTabs finds them again by URL.
  await update((rows) => {
    for (const row of Object.values(rows)) {
      row.tabId = null;
      if (row.status === STATUS.WORKING || row.status === STATUS.INPUT) setStatus(row, STATUS.UNKNOWN);
    }
  });
  await scanTabs();
});
