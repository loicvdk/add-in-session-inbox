// Workers: little figures shown on working / done / idle rows.
// Colour comes from CSS (--w): yellow while working, green when done,
// grey when idle. Only working rows animate (see panel.css).
// viewBox 0 0 32 32; tools rotate around the hand at (24, 24).

const SVG_NS = 'http://www.w3.org/2000/svg';

const TORSO = '<path class="w-suit" d="M9 31v-8a7 7 0 0 1 14 0v8z"/>';
const HEAD = '<circle class="w-skin" cx="16" cy="12" r="3.6"/>';
const HAND = '<circle class="w-skin" cx="24" cy="23.5" r="1.6"/>';
const HARD_HAT = '<path class="w-suit" d="M12 11.2a4 4 0 0 1 8 0z"/><path class="w-line" d="M10.8 11.2h10.4"/>';

const WORKERS = {
  construction: `
    ${TORSO}<path class="w-line" d="M9.6 26.5h12.8"/>${HEAD}${HARD_HAT}
    <g class="w-tool w-hammer">
      <path class="w-line" d="M24 24V14"/>
      <rect class="w-metal" x="21.5" y="12" width="5" height="3" rx=".6"/>${HAND}
    </g>`,

  architect: `
    <g transform="translate(-3 0)">
      ${TORSO}<path class="w-ink" d="M16 16.5l-1 1.5 1 5 1-5z"/>${HEAD}
      <path class="w-ink" d="M12.4 11.6a3.6 3.6 0 0 1 7.2 0c-1.6-.9-4.6-1.2-7.2 0z"/>
    </g>
    <rect class="w-paper" x="20.5" y="13" width="10" height="12" rx="1"/>
    <path class="w-line" d="M22 25l-1.5 6M29 25l1.5 6"/>
    <path class="w-line w-draw" d="M22.5 22l2-3.5 2 2.5 2.5-5"/>
    <g class="w-pencil" transform="translate(29 16)">
      <path class="w-suit" d="M0 0l.6-2.4 4-4 1.8 1.8-4 4z"/>
    </g>`,

  developer: `
    ${TORSO}${HEAD}
    <path class="w-line" d="M12 12a4 4 0 0 1 8 0"/>
    <rect class="w-suit" x="10.8" y="11" width="2" height="3.4" rx="1"/>
    <rect class="w-suit" x="19.2" y="11" width="2" height="3.4" rx="1"/>
    <rect class="w-metal" x="9" y="21" width="14" height="9" rx="1.2"/>
    <circle class="w-paper" cx="16" cy="25.5" r="1.1"/>
    <path class="w-line" d="M7.5 30.5h17"/>
    <circle class="w-skin w-tap" cx="10" cy="21" r="1.5"/>
    <circle class="w-skin w-tap" cx="22" cy="21" r="1.5"/>
    <g class="w-bits"><circle cx="24.5" cy="8" r="1"/><circle cx="27" cy="6.5" r="1"/><circle cx="29.5" cy="5" r="1"/></g>`,

  miner: `
    <path class="w-beam" d="M15.2 9.4L8 4l-1 3.5z"/>
    ${TORSO}${HEAD}${HARD_HAT}
    <circle class="w-paper" cx="16" cy="9.6" r="1.1"/>
    <path class="w-metal" d="M26 31l1.2-3 2.6-.8 1.7 2.3.5 1.5z"/>
    <g class="w-tool w-pick">
      <path class="w-line" d="M24 24V13"/>
      <path class="w-line w-thick" d="M19.5 14.6q4.5-3.2 9 0"/>${HAND}
    </g>`,

  painter: `
    ${TORSO}<path class="w-line" d="M13 17.2v5.8h6v-5.8"/>${HEAD}
    <path class="w-suit" d="M12.4 11a3.6 3.6 0 0 1 7.2 0z"/><path class="w-line" d="M12 11h9.5"/>
    <g class="w-tool w-roll">
      <path class="w-line" d="M24 24v-8h3.5v-2.8"/>
      <rect class="w-suit" x="24" y="10" width="7" height="3.2" rx="1.2"/>${HAND}
    </g>`,

  technician: `
    ${TORSO}<path class="w-line" d="M9.6 26.5h12.8"/>${HEAD}
    <path class="w-suit" d="M12.3 11.4a3.7 3.7 0 0 1 7.4 0z"/><path class="w-line" d="M12.2 11.4h7.6"/>
    <circle class="w-suit" cx="16" cy="7.2" r=".9"/>
    <rect class="w-paper" x="24" y="25.5" width="7.5" height="5" rx="1"/>
    <path class="w-line" d="M29.8 25.5v-3"/>
    <g class="w-leds"><circle cx="25.8" cy="28" r=".7"/><circle cx="27.6" cy="28" r=".7"/><circle cx="29.4" cy="28" r=".7"/></g>
    <g class="w-tool w-wrench">
      <path class="w-line" d="M24 23.5v-7.4"/>
      <path class="w-line w-thick" d="M22.6 14.2a1.9 1.9 0 1 0 2.8 0"/>${HAND}
    </g>`,
};

const ROLES = Object.keys(WORKERS);

// Same row always gets the same worker.
function roleFor(key) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ROLES[h % ROLES.length];
}

export function worker(key) {
  const role = roleFor(key);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('class', `worker worker-${role}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = WORKERS[role]; // static markup above, no user data
  return svg;
}
