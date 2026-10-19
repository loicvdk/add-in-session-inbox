// Runs in the PowerPoint for the web page (top frame). Reports the deck's
// direct file URL so the panel can offer "Open in desktop app".

const S = self.CLAUDE_SELECTORS;

function docUrl() {
  for (const script of document.scripts) {
    const m = !script.src && script.textContent.match(S.pptDocUrl);
    if (m) return JSON.parse(`"${m[1]}"`);
  }
  return null;
}

const url = docUrl();
if (url) chrome.runtime.sendMessage({ type: 'doc-url', docUrl: url }).catch(() => {});
