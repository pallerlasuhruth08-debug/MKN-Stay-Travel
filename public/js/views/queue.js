import { api } from '../api.js';
import { go } from '../app.js';
import { reqCardHtml, wireReqCards } from '../reqcard.js';

function cardWithHighlight(r, lastId) {
  const html = reqCardHtml(r, { mode: 'queue' });
  return r.id === lastId ? html.replace('class="req"', 'class="req new"') : html;
}

export async function renderQueue(container) {
  const rows = await api.listRequests();
  const lastId = sessionStorage.getItem('mkn_last_id');

  container.innerHTML = `
    <div class="card">
      <h2>Coordinator queue</h2>
      <p class="sub">Every request lands here, then routes to the two backend desks.</p>
      <div class="flowbar"><b>How the flow works:</b> Request (self, or POC row + traveller-uploaded ID) → <b>Accommodation</b> assigns stay &amp; <b>Travel desk</b> books the preferred train/flight and arranges the ride to SSB → once ID is received and both are done, the traveller is <b>confirmed</b>.</div>
      ${rows.length ? rows.map((r) => cardWithHighlight(r, lastId)).join('') : '<div class="empty">No requests yet.</div>'}
    </div>
  `;

  wireReqCards(container, { onNavigate: (view, id) => go(view, id) });
}
