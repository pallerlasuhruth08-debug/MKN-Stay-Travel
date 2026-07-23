import { api } from '../api.js';
import { go } from '../app.js';
import { reqCardHtml, wireReqCards } from '../reqcard.js';

export async function renderTransport(container) {
  const rows = await api.listRequests({ travelStatus: 'Pending' });

  container.innerHTML = `
    <div class="card">
      <h2>Travel desk</h2>
      <p class="sub">Book the preferred train/flight, or confirm the bus, and arrange the ride to SSB. <a data-go-admin>Manage recommended trains/flights →</a></p>
      ${rows.length ? rows.map((r) => reqCardHtml(r, { mode: 'transport' })).join('') : '<div class="empty">Nothing to allocate.</div>'}
    </div>
  `;

  container.querySelector('[data-go-admin]')?.addEventListener('click', () => go('admin'));

  wireReqCards(container, {
    onAllocate: async (team, id, value) => {
      if (!value) return;
      await api.allocateTravel(id, value);
      await renderTransport(container);
    },
  });
}
