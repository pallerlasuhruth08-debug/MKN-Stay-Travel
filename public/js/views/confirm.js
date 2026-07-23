import { api } from '../api.js';
import { go } from '../app.js';
import { esc, fmtDate } from '../format.js';

function wireLinks(container) {
  container.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => go(el.dataset.go)));
}

export async function renderConfirm(container, requestId) {
  const id = requestId || sessionStorage.getItem('mkn_last_id');
  if (!id) {
    container.innerHTML = `<div class="card"><h2>Confirmation</h2><div class="empty">No request selected.<br><a data-go="request">Raise a request</a> or open one from the <a data-go="queue">queue</a>.</div></div>`;
    wireLinks(container);
    return;
  }

  let r;
  try {
    r = await api.getRequest(id);
  } catch (err) {
    container.innerHTML = `<div class="card"><h2>Confirmation</h2><div class="empty">${esc(err.message)}</div></div>`;
    return;
  }

  const idOk = r.idStatus === 'Received';
  const stayOk = r.stayStatus === 'Allocated';
  const travelOk = r.travelStatus === 'Booked';
  const done = r.confirmedStatus === 'Confirmed';

  const line = (label, val, ok) => `<div class="conf-line"><span class="ci">${ok ? '✅' : '⏳'}</span><span class="cl"><b>${label}</b>${val || 'Awaiting…'}</span></div>`;
  const travelVal = travelOk ? `${esc(r.travelMode)} · ${esc(r.from || '')} → ${esc(r.to || 'SSB')} · ${esc(r.travelAllocation)}` : '';
  const stayVal = stayOk ? `${fmtDate(r.checkIn)} → ${fmtDate(r.checkOut)} · ${esc(r.stayAllocation)}` : '';
  const idVal = idOk ? `${esc(r.idType)} · ${esc(r.idNumberMasked)}` : '';

  container.innerHTML = `
    <div class="card">
      <h2>${esc(r.name)}'s confirmation</h2>
      <p class="sub">${esc(r.role)} · ${esc(r.id)} · ${r.requesterType === 'POC' ? 'raised by POC ' + esc(r.pocName || '') : 'self-raised'}</p>
      <div class="conf-status ${done ? 'ok' : 'pend'}">${done ? 'All set — confirmed 🙏' : 'In progress — some parts still being arranged'}</div>
      ${line('ID verification', idVal, idOk)}
      ${line('Accommodation', stayVal, stayOk)}
      ${line('Travel to SSB', travelVal, travelOk)}
    </div>
  `;
}
