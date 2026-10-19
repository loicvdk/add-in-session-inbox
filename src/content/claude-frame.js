// Runs in the Claude add-in iframe. Polls once per second and tells the
// service worker when the raw state changes:
// 'thinking' | 'input' | 'idle' | 'unknown'.
// The worker turns that into idle / working / input / done.

const S = self.CLAUDE_SELECTORS;
let last = null;
let seenRoot = false;
let fresh = true; // first report since this add-in frame loaded

function lastExcerpt() {
  const all = document.querySelectorAll(S.assistantMessage);
  const el = all[all.length - 1];
  return el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
}

function needsInput() {
  return S.needsInput.some(({ selector, text }) =>
    [...document.querySelectorAll(selector)].some((e) => e.textContent.includes(text))
  );
}

function check() {
  const root = document.querySelector(S.root);
  let state;
  if (!root) {
    // Frames that never showed the chat UI stay silent.
    if (!seenRoot) return;
    state = 'unknown';
  } else {
    seenRoot = true;
    if (needsInput()) state = 'input';
    else if (S.thinking.some((sel) => document.querySelector(sel))) state = 'thinking';
    else state = 'idle';
  }
  if (state === last) return;
  last = state;
  const msg = { type: 'frame-state', state, fresh };
  fresh = false;
  if (state === 'idle') msg.excerpt = lastExcerpt();
  try {
    chrome.runtime.sendMessage(msg).catch(() => {});
  } catch {
    // Extension was reloaded; this orphaned script can't talk any more.
    clearInterval(timer);
  }
}

const timer = setInterval(check, 1000);
check();
