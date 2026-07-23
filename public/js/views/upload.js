import { api } from '../api.js';
import { go } from '../app.js';
import { esc } from '../format.js';
import { idBlockHtml, wireIdBlock, collectId } from '../idblock.js';

export async function renderUpload(container, requestId) {
  if (!requestId) {
    container.innerHTML = `<div class="card"><h2>Upload ID</h2><div class="empty">Link not found.</div></div>`;
    return;
  }

  let row;
  try {
    row = await api.getPublicRequest(requestId);
  } catch (err) {
    container.innerHTML = `<div class="card"><h2>Upload ID</h2><div class="empty">${esc(err.message)}</div></div>`;
    return;
  }

  if (row.idStatus === 'Received') {
    container.innerHTML = `
      <div class="card">
        <h2>ID received 🙏</h2>
        <p class="sub">Thank you, ${esc(row.name)}. Your ID has been received and your booking is being arranged.</p>
        <div class="conf-status ok">All done on your side — nothing more needed.</div>
        <button type="button" class="btn-sm btn-ghost" id="backToQueue">Back to queue (coordinator view)</button>
      </div>
    `;
    container.querySelector('#backToQueue').addEventListener('click', () => go('queue'));
    return;
  }

  container.innerHTML = `
    <div class="card">
      <h2>Hello ${esc(row.name)} 🙏</h2>
      <p class="sub">You've been added to a travel &amp; stay request for the SSB consecration. Please upload your ID to complete the booking.</p>
      <div class="hint">
        <b>Your trip:</b> ${esc(row.travelMode)} · ${esc(row.from || '')} → ${esc(row.to || 'SSB')}${row.arrival ? ' · ' + esc(row.arrival) : ''}${row.preferredOption ? ' · pref: ' + esc(row.preferredOption) : ''}<br>
        <b>Stay:</b> ${esc(row.checkIn)} → ${esc(row.checkOut)}
      </div>
      <div class="grp-title">Your ID</div>
      <div id="upIdSection">${idBlockHtml('up')}</div>
      <div id="formError"></div>
      <button type="button" class="primary" id="submitUploadBtn">Submit my ID</button>
    </div>
  `;

  wireIdBlock(container, 'up');
  container.querySelector('#submitUploadBtn').addEventListener('click', () => submitUpload(container, requestId));
}

async function submitUpload(container, requestId) {
  const errBox = container.querySelector('#formError');
  errBox.innerHTML = '';
  const idv = collectId(container, 'up');
  if (!idv.idType || !idv.idNumber || !idv.file) {
    errBox.innerHTML = '<div class="error-msg">Please choose ID type, enter the number, and upload the image.</div>';
    return;
  }

  const fd = new FormData();
  fd.append('idType', idv.idType);
  fd.append('idNumber', idv.idNumber);
  fd.append('idImage', idv.file);

  const btn = container.querySelector('#submitUploadBtn');
  btn.disabled = true;
  try {
    await api.uploadId(requestId, fd);
    await renderUpload(container, requestId);
  } catch (err) {
    errBox.innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
    btn.disabled = false;
  }
}
