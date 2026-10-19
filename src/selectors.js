// All DOM selectors for the Claude add-in live here. Nothing else in the
// extension may hard-code a selector.
//
// Last checked: 2026-10-18, PowerPoint for the web (SharePoint/OneDrive for
// Business), add-in "Claude in Microsoft Office" served from
// https://pivot.claude.ai (see manifest.json content_scripts.matches).
//
// Loaded as a classic script (content scripts can't be ES modules), so it sets
// a global instead of exporting.

self.CLAUDE_SELECTORS = {
  // Present whenever the Claude chat UI is rendered (idle and while thinking).
  // Missing => `unknown`.
  root: '[data-testid="chat-input"]',

  // Any of these present => Claude is thinking / generating. The Stop button
  // only exists during a run (the send button stays, relabelled "Queue message").
  thinking: ['[data-testid="stop-button"]'],

  // Claude is blocked waiting for the user (checked before `thinking`: the Stop
  // button stays visible meanwhile). `text` is optional; when given, the match
  // must also contain it.
  needsInput: [
    // "Permission required" card. role="dialog" is also used by popovers, hence the text.
    { selector: '[role="dialog"]', text: 'Permission required' },
    // "Ask User Question" bottom sheet (checked 2026-10-19): numbered option
    // buttons plus a free-text <input>. No role or test id; option labels are
    // written by Claude, so match on structure. The chat box is not fixed and
    // has no <input>.
    { selector: 'div.fixed.bottom-0:has(button):has(input)' },
  ],

  // All assistant message containers; the last one gives the excerpt.
  assistantMessage: 'article[data-testid="assistant-message"]',

  // PowerPoint for the web page (top frame, *.sharepoint.com/:p:/), not the
  // add-in: the deck's direct file URL sits in an inline script as
  // `var _wopiContextJson = {... "DocUrl":"https://.../file.pptx" ...}`.
  // Used for "Open in desktop app".
  pptDocUrl: /"DocUrl":"((?:[^"\\]|\\.)*)"/,
};
