// Demo rows for store screenshots (no real data). Stubs the chrome APIs the panel uses.
const now = Date.now();
const row = (key, title, surface, status, min, extra = {}) =>
  ({ key, url: `https://example.com/${key}`, title, surface, status, since: now - min * 60000, tabId: 1, excerpt: '', ...extra });
const rows = {
  a: row('mail', 'Mail – Outlook', 'outlook', 'input', 1),
  b: row('launch', 'Product launch plan.pptx', 'powerpoint', 'done', 3, {
    excerpt: 'I added a timeline on slide 4 and moved the pricing table to the appendix. Slide 7 still needs your numbers.',
    docUrl: 'x',
  }),
  c: row('strategy', 'Q4 strategy review.pptx', 'powerpoint', 'working', 2),
  d: row('board', 'Board update – October.pptx', 'powerpoint', 'working', 6),
  e: row('budget', 'Budget 2027.pptx', 'powerpoint', 'idle', 45),
  f: row('kickoff', 'Team kickoff.pptx', 'powerpoint', 'reviewed', 1440),
};
window.chrome = {
  storage: { local: { get: async () => ({ rows }) }, onChanged: { addListener() {} } },
  runtime: { sendMessage: async () => {} },
};
