// Shared ID-capture widget (Aadhaar/Passport chip-select + number + upload box)
// used by both the self-request form and the traveller upload link page.

export function idBlockHtml(prefix) {
  return `
    <div class="field"><label>ID type <span class="rq">*</span></label>
      <div class="chips" id="${prefix}_idType"><span class="chip" data-v="Aadhaar">Aadhaar</span><span class="chip" data-v="Passport">Passport</span></div>
    </div>
    <div id="${prefix}_idDetail"></div>
    <p class="privacy">🔒 Your ID is used only for travel booking by the SSB coordination team, and is not shared elsewhere.</p>
  `;
}

function idDetailHtml(prefix, type) {
  const label = type === 'Aadhaar' ? 'Aadhaar' : 'Passport';
  const ph = type === 'Aadhaar' ? '12-digit Aadhaar number' : 'Passport number';
  return `
    <div class="field"><label>${label} number <span class="rq">*</span></label><input type="text" id="${prefix}_idNum" placeholder="${ph}"/></div>
    <div class="field"><label>${label} image <span class="rq">*</span></label>
      <label class="upload" id="${prefix}_idBox">
        <input type="file" id="${prefix}_idImg" accept="image/jpeg,image/png,application/pdf"/>
        <div class="u-icon">📎</div>
        <div class="u-txt" id="${prefix}_idTxt">Tap to upload your ${label} (JPG, PNG or PDF)</div>
      </label>
    </div>
  `;
}

export function wireIdBlock(root, prefix) {
  const group = root.querySelector(`#${prefix}_idType`);
  group.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      group.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
      chip.classList.add('on');
      const type = chip.dataset.v;
      const detailEl = root.querySelector(`#${prefix}_idDetail`);
      detailEl.innerHTML = idDetailHtml(prefix, type);
      const fileInput = detailEl.querySelector(`#${prefix}_idImg`);
      fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
          detailEl.querySelector(`#${prefix}_idBox`).classList.add('done');
          detailEl.querySelector(`#${prefix}_idTxt`).textContent = '✓ ' + fileInput.files[0].name;
        }
      });
    });
  });
}

export function collectId(root, prefix) {
  const typeEl = root.querySelector(`#${prefix}_idType .chip.on`);
  const numEl = root.querySelector(`#${prefix}_idNum`);
  const fileEl = root.querySelector(`#${prefix}_idImg`);
  return {
    idType: typeEl ? typeEl.dataset.v : '',
    idNumber: numEl ? numEl.value.trim() : '',
    file: fileEl && fileEl.files.length ? fileEl.files[0] : null,
  };
}
