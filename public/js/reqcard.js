import { esc, fmtDate, pillClass } from './format.js';

function allocBlockHtml(r, team) {
  const isDone = team === 'stay' ? r.stayStatus === 'Allocated' : r.travelStatus === 'Booked';
  if (isDone) {
    const value = team === 'stay' ? r.stayAllocation : r.travelAllocation;
    const label = team === 'stay' ? 'Allocated' : 'Booked';
    return `<div class="alloc-done">✓ ${label} — ${esc(value)}</div>`;
  }
  const label = team === 'stay' ? 'Allocate' : 'Book / assign';
  const placeholder = team === 'stay' ? 'e.g. Block C · Dorm 2 · Bed 14' : 'e.g. Booked · 12658 · Bengaluru Mail · PNR 1234567';
  return `<div class="allocate">
    <input type="text" data-alloc-input="${team}" data-id="${r.id}" placeholder="${esc(placeholder)}"/>
    <button type="button" class="btn-sm" data-alloc-submit="${team}" data-id="${r.id}">${label}</button>
  </div>`;
}

export function reqCardHtml(r, ctx) {
  const idOk = r.idStatus === 'Received';
  const stayOk = r.stayStatus === 'Allocated';
  const travelOk = r.travelStatus === 'Booked';
  const pills = [
    `<span class="${pillClass(idOk)}">${idOk ? '✓' : '•'} ID ${idOk ? 'received' : 'awaiting'}</span>`,
    `<span class="${pillClass(stayOk)}">${stayOk ? '✓' : '•'} Stay</span>`,
    `<span class="${pillClass(travelOk)}">${travelOk ? '✓' : '•'} Travel</span>`,
  ].join('');
  const route = `${esc(r.from || '—')} → ${esc(r.to || 'SSB')}`;
  const raiser = r.requesterType === 'POC'
    ? `via POC ${esc(r.pocName || '')} (${esc(r.pocTeam || '')}) · ${esc(r.travellerType || '')}`
    : 'self';

  let detail = '';
  let action = '';

  if (ctx.mode === 'queue') {
    detail = `<div class="req-detail">
      <div><span class="k">Stay</span>${fmtDate(r.checkIn)} → ${fmtDate(r.checkOut)}</div>
      <div><span class="k">Travel</span>${esc(r.travelMode)} · ${route}</div>
      ${r.preferredOption ? `<div><span class="k">Preferred</span>${esc(r.preferredOption)}</div>` : ''}
      ${r.lastMile ? `<div><span class="k">To SSB</span>${esc(r.lastMile)}</div>` : ''}
      <div><span class="k">ID</span>${idOk ? `${esc(r.idType || '')} · ${esc(r.idNumberMasked || '')}` : '<span style="color:var(--pend)">awaiting traveller upload</span>'}</div>
    </div>
    <div class="allocate">
      ${idOk ? '' : `<button type="button" class="btn-sm" data-go="upload" data-id="${r.id}">Open ID upload link →</button>`}
      <button type="button" class="btn-sm btn-ghost" data-go="confirm" data-id="${r.id}">View confirmation →</button>
    </div>`;
  } else if (ctx.mode === 'stay') {
    detail = `<div class="req-detail"><div><span class="k">Dates</span>${fmtDate(r.checkIn)} → ${fmtDate(r.checkOut)}</div></div>`;
    action = allocBlockHtml(r, 'stay');
  } else if (ctx.mode === 'transport') {
    detail = `<div class="req-detail">
      <div><span class="k">Mode</span>${esc(r.travelMode)}</div>
      <div><span class="k">Route</span>${route}</div>
      ${r.preferredOption ? `<div><span class="k">Preferred</span>${esc(r.preferredOption)}${r.arrival ? ' · ' + esc(r.arrival) : ''}</div>` : ''}
      ${r.lastMile ? `<div><span class="k">Last-mile</span>${esc(r.lastMile)}</div>` : '<div><span class="k">Last-mile</span>Direct to SSB — none</div>'}
    </div>`;
    action = allocBlockHtml(r, 'travel');
  }

  return `<div class="req" data-request-id="${r.id}">
    <div class="req-head">
      <div>
        <div class="req-name">${esc(r.name)}</div>
        <div class="req-meta">${esc(r.role)} · ${esc(r.region || '—')} · ${raiser} · <span class="id-tag">${esc(r.id)}</span></div>
      </div>
      <div class="pills">${pills}</div>
    </div>
    ${detail}${action}
  </div>`;
}

export function wireReqCards(container, { onNavigate, onAllocate } = {}) {
  if (onNavigate) {
    container.querySelectorAll('[data-go]').forEach((btn) => {
      btn.addEventListener('click', () => onNavigate(btn.dataset.go, btn.dataset.id));
    });
  }
  if (onAllocate) {
    container.querySelectorAll('[data-alloc-submit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const team = btn.dataset.allocSubmit;
        const id = btn.dataset.id;
        const input = container.querySelector(`[data-alloc-input="${team}"][data-id="${id}"]`);
        onAllocate(team, id, input ? input.value.trim() : '');
      });
    });
  }
}
