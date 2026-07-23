import { renderRequest } from './views/request.js';
import { renderShare } from './views/share.js';
import { renderUpload } from './views/upload.js';
import { renderQueue } from './views/queue.js';
import { renderStay } from './views/stay.js';
import { renderTransport } from './views/transport.js';
import { renderConfirm } from './views/confirm.js';
import { renderAdmin } from './views/admin.js';

const STAGES = [
  { id: 'request', label: 'Raise Request', n: 1 },
  { id: 'queue', label: 'Coordinator Queue', n: 2 },
  { id: 'stay', label: 'Accommodation Desk', n: 3 },
  { id: 'transport', label: 'Travel Desk', n: 4 },
  { id: 'confirm', label: 'Confirmation', n: 5 },
];

// Client-side only — a role picker for convenience, not access control.
// The API enforces masking/visibility rules regardless of the picked role.
const ROLES = ['All', 'Requester', 'Coordinator', 'Accommodation desk', 'Travel desk'];
const ROLE_STAGES = {
  All: ['request', 'queue', 'stay', 'transport', 'confirm'],
  Requester: ['request'],
  Coordinator: ['queue', 'confirm'],
  'Accommodation desk': ['stay'],
  'Travel desk': ['transport'],
};

const VIEW_RENDERERS = {
  request: renderRequest,
  share: renderShare,
  upload: renderUpload,
  queue: renderQueue,
  stay: renderStay,
  transport: renderTransport,
  confirm: renderConfirm,
  admin: renderAdmin,
};

function getRole() {
  return localStorage.getItem('mkn_role') || 'All';
}

function setRole(role) {
  localStorage.setItem('mkn_role', role);
  renderChrome();
}

function parseHash() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [view, param] = hash.split('/');
  return { view: view || 'request', param: param ? decodeURIComponent(param) : undefined };
}

export function go(view, param) {
  location.hash = param ? `/${view}/${encodeURIComponent(param)}` : `/${view}`;
}
window.go = go;

function renderChrome() {
  const { view } = parseHash();
  const role = getRole();
  const visible = ROLE_STAGES[role] || ROLE_STAGES.All;

  const pipe = document.getElementById('pipe');
  const visibleStages = STAGES.filter((s) => visible.includes(s.id));
  pipe.innerHTML = visibleStages
    .map((s, i) => `
      <button class="stage ${view === s.id ? 'active' : ''}" data-view="${s.id}">
        <span class="dot">${s.n}</span><span>${s.label}</span>
      </button>${i < visibleStages.length - 1 ? '<span class="arrow">›</span>' : ''}
    `)
    .join('');
  pipe.querySelectorAll('.stage').forEach((btn) => {
    btn.addEventListener('click', () => go(btn.dataset.view));
  });

  const roleSwitch = document.getElementById('roleSwitch');
  roleSwitch.innerHTML = ROLES.map(
    (r) => `<button class="role-btn ${r === role ? 'on' : ''}" data-role="${r}">${r}</button>`
  ).join('');
  roleSwitch.querySelectorAll('.role-btn').forEach((btn) => {
    btn.addEventListener('click', () => setRole(btn.dataset.role));
  });
}

async function render() {
  renderChrome();
  const { view, param } = parseHash();
  const app = document.getElementById('app');
  const renderer = VIEW_RENDERERS[view];
  if (!renderer) {
    app.innerHTML = `<div class="card"><div class="empty">Unknown view.</div></div>`;
    return;
  }
  try {
    await renderer(app, param);
  } catch (err) {
    app.innerHTML = `<div class="card"><div class="error-msg">${err.message}</div></div>`;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('hashchange', render);
render();
