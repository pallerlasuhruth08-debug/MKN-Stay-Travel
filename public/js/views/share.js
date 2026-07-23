import { api } from '../api.js';
import { go } from '../app.js';
import { esc } from '../format.js';

export async function renderShare(container) {
  const idsRaw = sessionStorage.getItem('mkn_last_batch_ids');
  const ids = idsRaw ? JSON.parse(idsRaw) : [];

  if (!ids.length) {
    container.innerHTML = `<div class="card"><h2>No batch to share</h2><div class="empty">Raise a POC batch request first, or go to the <a data-go="queue">queue</a>.</div></div>`;
    wireLinks(container);
    return;
  }

  const details = (await Promise.all(ids.map((id) => api.getRequest(id).catch(() => null)))).filter(Boolean);
  const poc = details[0];

  container.innerHTML = `
    <div class="card">
      <h2>${details.length} request${details.length > 1 ? 's' : ''} raised 🙏</h2>
      <p class="sub">${poc ? esc(poc.pocTeam || '') : ''} · travel &amp; stay details are in. One step left: each traveller's ID.</p>
      <div class="hint">Send each traveller their own link to upload their Aadhaar / passport. Until they do, ID shows as <b>awaiting</b> in the queue. The <b>Travel desk</b> will book each person's preferred train/flight.</div>
      <div class="linklist">
        ${details.map((r) => `
          <div class="linkrow">
            <span class="ln">${esc(r.name)}</span>
            <input type="text" value="${esc(location.origin + r.uploadUrl)}" readonly onclick="this.select()"/>
            <button type="button" class="btn-sm" data-preview="${r.id}">Preview</button>
          </div>
        `).join('')}
      </div>
      <div class="allocate">
        <button type="button" class="btn-sm" id="copyAll">Copy all links</button>
        <button type="button" class="btn-sm btn-ghost" data-go="queue">Go to queue</button>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-preview]').forEach((btn) => {
    btn.addEventListener('click', () => go('upload', btn.dataset.preview));
  });
  wireLinks(container);

  container.querySelector('#copyAll')?.addEventListener('click', async () => {
    const text = details.map((r) => `${r.name}: ${location.origin}${r.uploadUrl}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      alert('Links copied — paste into WhatsApp / email.');
    } catch (_err) {
      alert(text);
    }
  });
}

function wireLinks(container) {
  container.querySelectorAll('[data-go]').forEach((el) => {
    el.addEventListener('click', () => go(el.dataset.go));
  });
}
