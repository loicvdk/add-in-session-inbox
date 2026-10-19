// chrome.storage.local helpers and URL normalization. Shared by the service
// worker and the side panel.
//
// Storage shape: { rows: { [key]: Row } }
// Row: { key, url, title, surface: 'powerpoint'|'outlook'|'other', status,
//        since, tabId|null, excerpt, reviewedAt|null, docUrl? }

export const STATUS = {
  IDLE: 'idle',
  WORKING: 'working',
  INPUT: 'input',
  DONE: 'done',
  REVIEWED: 'reviewed',
  UNKNOWN: 'unknown',
};

export const REVIEWED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Office web apps, recognised from the top-level tab URL (checked 2026-10-18).
// `autoTrack`: track the tab even before the Claude add-in reports in.
// `key`: optional custom row key, for apps whose URL changes while you work.
// Tabs whose add-in frame reports in are tracked anyway, as 'other' if no match.
const SURFACES = [
  // https://<tenant>-my.sharepoint.com/:p:/g/personal/...
  { id: 'powerpoint', re: /^https:\/\/[^/]+\.sharepoint\.com\/:p:\//, autoTrack: true },
  // https://outlook.office.com/mail/inbox/id/<message>: one row per mailbox tab.
  { id: 'outlook', re: /^https:\/\/outlook\.office\.com\//, key: (u) => `${u.origin}/mail/` },
];

function surfaceFor(url) {
  return SURFACES.find((s) => s.re.test(url || ''));
}

export function surfaceOf(url) {
  return surfaceFor(url)?.id || 'other';
}

export function isAutoTracked(url) {
  return !!surfaceFor(url)?.autoTrack;
}

// Query params that change between visits of the same document.
// TODO: check against real deck URLs and adjust.
const VOLATILE_PARAMS = [/^utm_/, /^wdOrigin$/i, /^wdPreviousSession/i, /^ct$/];

export function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    const custom = surfaceFor(raw)?.key;
    if (custom) return custom(u);
    u.hash = '';
    for (const name of [...u.searchParams.keys()]) {
      if (VOLATILE_PARAMS.some((re) => re.test(name))) u.searchParams.delete(name);
    }
    u.searchParams.sort();
    return u.toString();
  } catch {
    return raw;
  }
}

export async function getRows() {
  const { rows } = await chrome.storage.local.get('rows');
  return rows || {};
}

export async function setRows(rows) {
  await chrome.storage.local.set({ rows });
}
