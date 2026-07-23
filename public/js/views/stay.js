import { api } from '../api.js';
import { reqCardHtml, wireReqCards } from '../reqcard.js';

export async function renderStay(container) {
  const rows = await api.listRequests({ stayStatus: 'Pending' });

  container.innerHTML = `
    <div class="card">
      <h2>Accommodation desk</h2>
      <p class="sub">Assign stay for the requested dates.</p>
      ${rows.length ? rows.map((r) => reqCardHtml(r, { mode: 'stay' })).join('') : '<div class="empty">Nothing to allocate.</div>'}
    </div>
  `;

  wireReqCards(container, {
    onAllocate: async (team, id, value) => {
      if (!value) return;
      await api.allocateStay(id, value);
      await renderStay(container);
    },
  });
}
