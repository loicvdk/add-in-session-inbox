import { STATUS, getRows } from '../src/state.js';
import { worker } from './workers.js';

const GROUPS = [
  { status: STATUS.INPUT, label: 'Needs input', short: 'Needs input' },
  { status: STATUS.DONE, label: 'Done – to check', short: 'To check' },
  { status: STATUS.WORKING, label: 'Working', short: 'Working' },
  { status: STATUS.IDLE, label: 'Idle', short: 'Idle' },
  { status: STATUS.UNKNOWN, label: 'Unknown', short: 'Unknown' },
  { status: STATUS.REVIEWED, label: 'Reviewed', short: 'Reviewed', collapsed: true },
];

const SURFACES = {
  powerpoint: { letter: 'P', name: 'PowerPoint' },
  outlook: { letter: 'O', name: 'Outlook' },
  other: { letter: '•', name: 'Other' },
};

const list = document.getElementById('list');
const empty = document.getElementById('empty');
const summary = document.getElementById('summary');
const logo = document.getElementById('logo');
const addForm = document.getElementById('add-form');
const addUrl = document.getElementById('add-url');
let reviewedOpen = false;

const SVG_NS = 'http://www.w3.org/2000/svg';

// Inbox tray logo. While any session works, the dot keeps dropping into it.
function trayLogo() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'tray');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = // static markup, no user data
    '<circle class="tray-dot" cx="12" cy="7" r="2.2"/>' +
    '<path class="tray-box" d="M3.5 13.5V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4.5M3.5 13.5h4.6l1.4 2.6h5l1.4-2.6h4.6M3.5 13.5l2.4-6.2M20.5 13.5l-2.4-6.2"/>';
  return svg;
}

function send(msg) {
  return chrome.runtime.sendMessage(msg);
}

function ago(ts) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h` : `${Math.floor(h / 24)} d`;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function button(cls, text, title, onClick) {
  const b = el('button', cls, text);
  b.title = title;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

function renderRow(row) {
  const group = GROUPS.find((g) => g.status === row.status);
  const li = el('li', `row status-${row.status}`);
  li.title = row.url;
  li.tabIndex = 0;
  li.addEventListener('click', () => send({ type: 'focus', key: row.key }));
  li.addEventListener('keydown', (e) => e.key === 'Enter' && send({ type: 'focus', key: row.key }));

  const icon = el('span', 'status-icon');
  if (row.status === STATUS.REVIEWED) icon.textContent = '✓';
  else if (row.status === STATUS.INPUT) icon.textContent = '!';
  else if (row.status === STATUS.UNKNOWN) icon.textContent = '?';
  else {
    icon.classList.add('has-worker');
    icon.append(worker(row.key));
  }

  const body = el('div', 'body');
  const titleLine = el('div', 'title-line');
  const surface = SURFACES[row.surface] || SURFACES.other;
  const badge = el('span', `surface surface-${row.surface}`, surface.letter);
  badge.title = surface.name;
  titleLine.append(badge);
  titleLine.append(el('span', 'title', row.title));
  body.append(titleLine);

  const meta = el('div', 'meta');
  meta.append(el('span', 'pill', group.short), el('span', null, ago(row.since)));
  if (row.tabId == null) meta.append(el('span', 'closed', 'tab closed'));
  body.append(meta);
  if (row.status === STATUS.DONE && row.excerpt) body.append(el('div', 'excerpt', row.excerpt));

  const actions = el('div', 'actions');
  if (row.docUrl) {
    actions.append(button('desktop', '⧉', 'Open in PowerPoint desktop app', () => send({ type: 'desktop', key: row.key })));
  }
  if (row.status !== STATUS.REVIEWED && row.status !== STATUS.INPUT) {
    actions.append(button('review', '✓', 'Mark reviewed', () => send({ type: 'review', key: row.key })));
  }
  actions.append(button('remove', '✕', 'Stop tracking', () => send({ type: 'remove', key: row.key })));

  li.append(icon, body, actions);
  return li;
}

function renderSummary(rows) {
  const count = (s) => rows.filter((r) => r.status === s).length;
  const working = count(STATUS.WORKING);
  const done = count(STATUS.DONE);
  const input = count(STATUS.INPUT);
  const parts = [];
  if (input) parts.push(`${input} needs input`);
  if (working) parts.push(`${working} working`);
  if (done) parts.push(`${done} to check`);
  summary.textContent = parts.join(' · ') || (rows.length ? 'All quiet' : '');
  logo.classList.toggle('working', working > 0);
}

async function render() {
  const rows = Object.values(await getRows());
  renderSummary(rows);
  list.replaceChildren();
  empty.hidden = rows.length > 0;
  for (const g of GROUPS) {
    const group = rows.filter((r) => r.status === g.status).sort((a, b) => b.since - a.since);
    if (!group.length) continue;
    const section = el('section', `group group-${g.status}`);
    const h = el('h2');
    h.append(el('span', null, g.label), el('span', 'count', String(group.length)));
    section.append(h);
    const ul = el('ul');
    group.forEach((r) => ul.append(renderRow(r)));
    if (g.collapsed) {
      h.classList.add('toggle');
      h.prepend(el('span', 'chevron', reviewedOpen ? '▾' : '▸'));
      h.addEventListener('click', () => {
        reviewedOpen = !reviewedOpen;
        render();
      });
      ul.hidden = !reviewedOpen;
    }
    section.append(ul);
    list.append(section);
  }
}

logo.append(trayLogo());
document.getElementById('empty-logo').append(trayLogo());

document.getElementById('add-toggle').addEventListener('click', () => {
  addForm.hidden = !addForm.hidden;
  if (!addForm.hidden) addUrl.focus();
});

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await send({ type: 'add', url: addUrl.value.trim() });
  addUrl.value = '';
  addForm.hidden = true;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.rows) render();
});
setInterval(render, 30000); // keep the "3 min" labels fresh
render();
