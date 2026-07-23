import { api } from '../api.js';
import { go } from '../app.js';
import { esc, optList } from '../format.js';
import {
  TRAVEL_MODES, LAST_MILE_OPTIONS, REGIONS, STATIONS, FLIGHT_ARRIVAL_AIRPORT, NO_PREFERENCE, needsLastMile,
} from '../constants.js';

export async function renderRequest(container) {
  const [trains, flights] = await Promise.all([api.listTrains(), api.listFlights()]);
  let pocRows = [blankRow(), blankRow(), blankRow()];

  container.innerHTML = `
    <div class="card">
      <h2>Raise a travel &amp; stay request</h2>
      <p class="sub">For IYC teams, core volunteers, and individual Poornangas travelling to the SSB consecration.</p>
      <div class="grp-title">Who is raising this request?</div>
      <div class="field"><div class="segment" id="reqType">
        <div class="seg" data-type="POC"><div class="st">Team POC (IYC)</div><div class="ss">Raising for many team members / vendors</div></div>
        <div class="seg" data-type="Core volunteer"><div class="st">Core volunteer</div><div class="ss">Raising for myself</div></div>
        <div class="seg" data-type="Poornanga"><div class="st">Individual / Poornanga</div><div class="ss">Raising for myself</div></div>
      </div></div>
      <div id="formBody"></div>
    </div>
  `;

  container.querySelectorAll('#reqType .seg').forEach((el) => {
    el.addEventListener('click', () => {
      container.querySelectorAll('#reqType .seg').forEach((x) => x.classList.remove('on'));
      el.classList.add('on');
      const type = el.dataset.type;
      const body = container.querySelector('#formBody');
      if (type === 'POC') {
        body.innerHTML = pocForm();
        wirePocForm();
      } else {
        body.innerHTML = selfForm(type);
        wireSelfForm(type);
      }
    });
  });

  // ---- shared state helpers ----

  function blankRow() {
    return {
      name: '', travellerType: 'Team member', phone: '', email: '', region: 'South India',
      mode: '', from: '', to: '', pref: '', arrival: '', lastmile: '',
      checkIn: '2026-09-27', checkOut: '2026-10-02',
    };
  }

  function applyModeToRow(row, mode) {
    row.mode = mode;
    row.pref = '';
    row.lastmile = '';
    row.to = mode === 'Train' ? STATIONS[0] : '';
  }

  // ---- self (Core volunteer / Poornanga) form ----

  function selfForm(type) {
    const who = type === 'Core volunteer' ? 'core volunteer' : 'Poornanga';
    return `
      <div class="grp-title">Your details</div>
      <div class="row">
        <div class="field"><label>Full name <span class="rq">*</span></label><input type="text" id="name" placeholder="Your name"/></div>
        <div class="field"><label>Region</label><select id="region">${optList(REGIONS, 'South India')}</select></div>
      </div>
      <div class="row">
        <div class="field"><label>Phone</label><input type="tel" id="phone" placeholder="+91…"/></div>
        <div class="field"><label>Email</label><input type="email" id="email" placeholder="you@example.com"/></div>
      </div>
      <p class="privacy">Raising this as a ${who} — you'll upload your own ID below.</p>
      <div class="grp-title">Accommodation dates</div>
      <div class="row">
        <div class="field"><label>Check-in <span class="rq">*</span></label><input type="date" id="checkIn" value="2026-09-27"/></div>
        <div class="field"><label>Check-out <span class="rq">*</span></label><input type="date" id="checkOut" value="2026-10-02"/></div>
      </div>
      <div class="grp-title">Travel to SSB</div>
      <div class="field"><label>How are you travelling? <span class="rq">*</span></label>
        <div class="chips" id="travelMode">${TRAVEL_MODES.map((m) => `<span class="chip" data-v="${esc(m)}">${esc(m)}</span>`).join('')}</div>
      </div>
      <div id="travelDetail"></div>
      <div class="grp-title">Your ID</div>
      <div id="idSection">${idBlock('self')}</div>
      <div id="formError"></div>
      <button type="button" class="primary" id="submitSelfBtn">Raise request</button>
    `;
  }

  function travelDetail(mode) {
    if (needsLastMile(mode)) {
      const recs = mode === 'Train'
        ? trains.map((t) => ({ main: t.train, sub: `${t.route}${t.arrival ? ' · ' + t.arrival : ''}`, recommended: t.recommended === 'Yes' }))
        : flights.map((f) => ({ main: f.flight, sub: `${f.airline}${f.arrival ? ' · ' + f.arrival : ''}`, recommended: f.recommended === 'Yes' }));
      const toField = mode === 'Train'
        ? `<div class="field"><label>To (destination station)</label><select id="toPoint">${optList(STATIONS, STATIONS[0])}</select></div>`
        : `<div class="field"><label>To (arrival airport)</label><input type="text" id="toPoint" class="locked" value="${esc(FLIGHT_ARRIVAL_AIRPORT)}" disabled/></div>`;
      return `
        <div class="row"><div class="field"><label>From <span class="rq">*</span></label><input type="text" id="from" placeholder="Origin city"/></div>${toField}</div>
        <div class="field"><label>Preferred ${mode === 'Train' ? 'train' : 'flight'} <span class="opt">— the travel desk will book this for you</span></label>
          <div class="recs" id="rec">
            ${recs.map((r) => `<div class="rec" data-v="${esc(r.main)}"><span class="radio"></span><span><span class="rmain">${esc(r.main)}</span><span class="rsub">${esc(r.sub)}</span></span>${r.recommended ? '<span class="rec-badge">Recommended</span>' : ''}</div>`).join('')}
            <div class="rec" data-v="${esc(NO_PREFERENCE)}"><span class="radio"></span><span><span class="rmain">No preference</span><span class="rsub">Let the travel desk choose</span></span></div>
          </div>
        </div>
        <div class="field"><label>Preferred arrival date &amp; time <span class="opt">(optional)</span></label><input type="text" id="arrivalTime" placeholder="e.g. 27 Sep · 06:30"/></div>
        <div class="hint">Coming into Bengaluru — choose how to reach SSB. Sharing with co-Isha travellers is encouraged.</div>
        <div class="field"><label>Getting from ${mode === 'Train' ? 'station' : 'airport'} to SSB <span class="rq">*</span></label>
          <div class="chips" id="lastMile">${LAST_MILE_OPTIONS.map((o) => `<span class="chip" data-v="${esc(o)}">${esc(o)}</span>`).join('')}</div>
        </div>
      `;
    }
    if (mode === 'Organized bus (IYC to SSB)') {
      return `
        <div class="row">
          <div class="field"><label>From</label><input type="text" class="locked" value="Isha Yoga Center, Coimbatore" disabled/></div>
          <div class="field"><label>To</label><input type="text" class="locked" value="Isha SSB, Bengaluru" disabled/></div>
        </div>
        <div class="hint">Direct IYC → SSB — no separate last-mile transport needed.</div>
        <div class="field"><label>Preferred boarding time at IYC <span class="opt">(optional)</span></label><input type="text" id="arrivalTime" placeholder="e.g. 26 Sep · night"/></div>
      `;
    }
    // Dedicated team bus (by SSB)
    return `
      <div class="row">
        <div class="field"><label>From (team pickup point) <span class="rq">*</span></label><input type="text" id="from" placeholder="e.g. Chennai centre"/></div>
        <div class="field"><label>To</label><input type="text" class="locked" value="Isha SSB, Bengaluru" disabled/></div>
      </div>
      <div class="hint">A dedicated bus arranged by SSB, straight to the venue — no separate last-mile needed.</div>
      <div class="field"><label>Preferred boarding time <span class="opt">(optional)</span></label><input type="text" id="arrivalTime" placeholder="e.g. 27 Sep · early morning"/></div>
    `;
  }

  function idBlock(p) {
    return `
      <div class="field"><label>ID type <span class="rq">*</span></label>
        <div class="chips" id="${p}_idType"><span class="chip" data-v="Aadhaar">Aadhaar</span><span class="chip" data-v="Passport">Passport</span></div>
      </div>
      <div id="${p}_idDetail"></div>
      <p class="privacy">🔒 Your ID is used only for travel booking by the SSB coordination team, and is not shared elsewhere.</p>
    `;
  }

  function idDetail(p, type) {
    const label = type === 'Aadhaar' ? 'Aadhaar' : 'Passport';
    const ph = type === 'Aadhaar' ? '12-digit Aadhaar number' : 'Passport number';
    return `
      <div class="field"><label>${label} number <span class="rq">*</span></label><input type="text" id="${p}_idNum" placeholder="${ph}"/></div>
      <div class="field"><label>${label} image <span class="rq">*</span></label>
        <label class="upload" id="${p}_idBox">
          <input type="file" id="${p}_idImg" accept="image/jpeg,image/png,application/pdf"/>
          <div class="u-icon">📎</div>
          <div class="u-txt" id="${p}_idTxt">Tap to upload your ${label} (JPG, PNG or PDF)</div>
        </label>
      </div>
    `;
  }

  function wireIdBlock(prefix) {
    const group = container.querySelector(`#${prefix}_idType`);
    group.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        group.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
        chip.classList.add('on');
        const type = chip.dataset.v;
        const detailEl = container.querySelector(`#${prefix}_idDetail`);
        detailEl.innerHTML = idDetail(prefix, type);
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

  function collectId(prefix) {
    const typeEl = container.querySelector(`#${prefix}_idType .chip.on`);
    const numEl = container.querySelector(`#${prefix}_idNum`);
    const fileEl = container.querySelector(`#${prefix}_idImg`);
    return {
      idType: typeEl ? typeEl.dataset.v : '',
      idNumber: numEl ? numEl.value.trim() : '',
      file: fileEl && fileEl.files.length ? fileEl.files[0] : null,
    };
  }

  function wireSelfForm(type) {
    const tmGroup = container.querySelector('#travelMode');
    tmGroup.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        tmGroup.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
        chip.classList.add('on');
        const mode = chip.dataset.v;
        const detail = container.querySelector('#travelDetail');
        detail.innerHTML = travelDetail(mode);
        wireTravelDetail(detail);
      });
    });
    wireIdBlock('self');
    container.querySelector('#submitSelfBtn').addEventListener('click', () => submitSelf(type));
  }

  function wireTravelDetail(root) {
    const rec = root.querySelector('#rec');
    if (rec) {
      rec.querySelectorAll('.rec').forEach((r) => r.addEventListener('click', () => {
        rec.querySelectorAll('.rec').forEach((x) => x.classList.remove('on'));
        r.classList.add('on');
      }));
    }
    const lm = root.querySelector('#lastMile');
    if (lm) {
      lm.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
        lm.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
        c.classList.add('on');
      }));
    }
  }

  async function submitSelf(type) {
    const val = (id) => { const el = container.querySelector('#' + id); return el ? el.value.trim() : ''; };
    const chipOn = (groupId) => { const c = container.querySelector('#' + groupId + ' .chip.on'); return c ? c.dataset.v : ''; };
    const recOn = () => { const r = container.querySelector('#rec .rec.on'); return r ? r.dataset.v : ''; };
    const errBox = container.querySelector('#formError');
    errBox.innerHTML = '';

    const mode = chipOn('travelMode');
    const idv = collectId('self');
    const name = val('name');
    const fromEl = container.querySelector('#from');
    const toEl = container.querySelector('#toPoint');

    const missing = [];
    if (!name) missing.push('name');
    if (!mode) missing.push('travel mode');
    if (needsLastMile(mode) && !chipOn('lastMile')) missing.push('station/airport → SSB');
    if (!idv.idType || !idv.idNumber || !idv.file) missing.push('ID type, number & image');
    if (missing.length) {
      errBox.innerHTML = `<div class="error-msg">Please complete: ${esc(missing.join(', '))}</div>`;
      return;
    }

    const fd = new FormData();
    fd.append('requesterType', type);
    fd.append('name', name);
    fd.append('region', container.querySelector('#region').value);
    fd.append('phone', val('phone'));
    fd.append('email', val('email'));
    fd.append('checkIn', val('checkIn'));
    fd.append('checkOut', val('checkOut'));
    fd.append('travelMode', mode);
    fd.append('from', fromEl ? fromEl.value.trim() : '');
    fd.append('to', toEl ? toEl.value.trim() : '');
    fd.append('preferredOption', recOn());
    fd.append('arrival', val('arrivalTime'));
    fd.append('lastMile', needsLastMile(mode) ? chipOn('lastMile') : '');
    fd.append('idType', idv.idType);
    fd.append('idNumber', idv.idNumber);
    fd.append('idImage', idv.file);

    const btn = container.querySelector('#submitSelfBtn');
    btn.disabled = true;
    try {
      const created = await api.createSelfRequest(fd);
      sessionStorage.setItem('mkn_last_id', created.id);
      go('queue');
    } catch (err) {
      errBox.innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  }

  // ---- POC bulk form ----

  function pocForm() {
    return `
      <div class="grp-title">Your details (POC)</div>
      <div class="row">
        <div class="field"><label>POC name <span class="rq">*</span></label><input type="text" id="pocName" placeholder="Your name"/></div>
        <div class="field"><label>Team <span class="rq">*</span></label><input type="text" id="pocTeam" placeholder="e.g. IT Team, Kitchen, Décor"/></div>
      </div>
      <div class="row">
        <div class="field"><label>Your phone</label><input type="tel" id="pocPhone" placeholder="+91…"/></div>
        <div class="field"><label>Your email</label><input type="email" id="pocEmail" placeholder="you@example.com"/></div>
      </div>
      <div class="grp-title">Travellers (team members / vendors)</div>
      <div class="hint">Add a row for each traveller. The <b>Travel desk books the preferred train/flight</b> — no ticket details needed here. After you submit, each traveller gets their own link to upload their Aadhaar / passport.</div>
      <div class="defaults">
        <div class="df"><label>Default mode</label><select id="defMode"><option value="">—</option>${optList(TRAVEL_MODES, '')}</select></div>
        <div class="df"><label>Default origin</label><input type="text" id="defFrom" placeholder="e.g. Hyderabad"/></div>
        <div class="df"><label>Default check-in</label><input type="date" id="defIn" value="2026-09-27"/></div>
        <div class="df"><label>Default check-out</label><input type="date" id="defOut" value="2026-10-02"/></div>
        <button type="button" class="btn-sm btn-ghost" id="applyDefaults">Apply to all rows</button>
      </div>
      <div id="pocTableWrap">${pocTableHTML()}</div>
      <button type="button" class="btn-add" id="pocAddRow">+ Add traveller</button>
      <div id="formError"></div>
      <button type="button" class="primary" id="submitPocBtn">Raise requests for all travellers</button>
    `;
  }

  function pocTableHTML() {
    const head = `<tr><th>#</th><th>Name</th><th>For</th><th>Phone</th><th>Email</th><th>Mode</th><th>From</th><th>To</th><th>Preferred train / flight</th><th>Arrival</th><th>Station/airport → SSB</th><th>Check-in</th><th>Check-out</th><th></th></tr>`;
    const rows = pocRows.map((r, i) => {
      const busy = needsLastMile(r.mode);
      const prefOpts = r.mode === 'Train'
        ? optList([NO_PREFERENCE, ...trains.map((t) => t.train)], r.pref)
        : r.mode === 'Flight'
          ? optList([NO_PREFERENCE, ...flights.map((f) => f.flight)], r.pref)
          : `<option>—</option>`;
      const lmOpts = busy ? optList(LAST_MILE_OPTIONS, r.lastmile) : `<option>—</option>`;
      const toCell = r.mode === 'Train'
        ? `<select data-field="to" data-idx="${i}">${optList(STATIONS, r.to)}</select>`
        : r.mode === 'Flight'
          ? `<input type="text" class="locked" value="${esc(FLIGHT_ARRIVAL_AIRPORT)}" disabled/>`
          : (r.mode === 'Organized bus (IYC to SSB)' || r.mode === 'Dedicated team bus (by SSB)')
            ? `<input type="text" class="locked" value="SSB" disabled/>`
            : `<input type="text" class="locked" value="—" disabled/>`;
      return `<tr>
        <td class="idx">${i + 1}</td>
        <td><input type="text" data-field="name" data-idx="${i}" value="${esc(r.name)}" placeholder="Full name"/></td>
        <td><select data-field="travellerType" data-idx="${i}">${optList(['Team member', 'Vendor'], r.travellerType)}</select></td>
        <td><input type="tel" data-field="phone" data-idx="${i}" value="${esc(r.phone)}" placeholder="+91…"/></td>
        <td><input type="email" data-field="email" data-idx="${i}" value="${esc(r.email)}" placeholder="email"/></td>
        <td><select data-field="mode" data-idx="${i}">${optList([''].concat(TRAVEL_MODES), r.mode)}</select></td>
        <td><input type="text" data-field="from" data-idx="${i}" value="${esc(r.from)}" placeholder="origin"/></td>
        <td>${toCell}</td>
        <td><select data-field="pref" data-idx="${i}" ${busy ? '' : 'disabled'}>${prefOpts}</select></td>
        <td><input type="text" data-field="arrival" data-idx="${i}" value="${esc(r.arrival)}" placeholder="27 Sep · 06:30"/></td>
        <td><select data-field="lastmile" data-idx="${i}" ${busy ? '' : 'disabled'}>${lmOpts}</select></td>
        <td><input type="date" data-field="checkIn" data-idx="${i}" value="${esc(r.checkIn)}"/></td>
        <td><input type="date" data-field="checkOut" data-idx="${i}" value="${esc(r.checkOut)}"/></td>
        <td><button type="button" class="rowdel" data-del="${i}" title="Remove">✕</button></td>
      </tr>`;
    }).join('');
    return `<div class="tbl-wrap"><table class="poc">${head}${rows}</table></div>`;
  }

  function readDefaults() {
    const g = (id) => { const el = container.querySelector('#' + id); return el ? el.value : ''; };
    return { mode: g('defMode'), from: g('defFrom'), checkIn: g('defIn'), checkOut: g('defOut') };
  }

  function refreshPocTable() {
    container.querySelector('#pocTableWrap').innerHTML = pocTableHTML();
    wirePocTableEvents();
  }

  function wirePocTableEvents() {
    const wrap = container.querySelector('#pocTableWrap');
    wrap.querySelectorAll('[data-field]').forEach((el) => {
      const idx = +el.dataset.idx;
      const field = el.dataset.field;
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        if (field === 'mode') {
          applyModeToRow(pocRows[idx], el.value);
          refreshPocTable();
        } else {
          pocRows[idx][field] = el.value;
        }
      });
    });
    wrap.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        pocRows.splice(+btn.dataset.del, 1);
        if (!pocRows.length) pocRows.push(blankRow());
        refreshPocTable();
      });
    });
  }

  function wirePocForm() {
    wirePocTableEvents();
    container.querySelector('#pocAddRow').addEventListener('click', () => {
      const d = readDefaults();
      const row = blankRow();
      if (d.mode) applyModeToRow(row, d.mode);
      if (d.from) row.from = d.from;
      if (d.checkIn) row.checkIn = d.checkIn;
      if (d.checkOut) row.checkOut = d.checkOut;
      pocRows.push(row);
      refreshPocTable();
    });
    container.querySelector('#applyDefaults').addEventListener('click', () => {
      const d = readDefaults();
      pocRows.forEach((r) => {
        if (d.mode) applyModeToRow(r, d.mode);
        if (d.from) r.from = d.from;
        if (d.checkIn) r.checkIn = d.checkIn;
        if (d.checkOut) r.checkOut = d.checkOut;
      });
      refreshPocTable();
    });
    container.querySelector('#submitPocBtn').addEventListener('click', submitPoc);
  }

  async function submitPoc() {
    const val = (id) => { const el = container.querySelector('#' + id); return el ? el.value.trim() : ''; };
    const errBox = container.querySelector('#formError');
    errBox.innerHTML = '';

    const pocName = val('pocName');
    const pocTeam = val('pocTeam');
    if (!pocName || !pocTeam) {
      errBox.innerHTML = '<div class="error-msg">Please enter your POC name and team.</div>';
      return;
    }
    const valid = pocRows.filter((r) => r.name && r.mode);
    if (!valid.length) {
      errBox.innerHTML = '<div class="error-msg">Please add at least one traveller with a name and travel mode.</div>';
      return;
    }
    const bad = valid.find((r) => needsLastMile(r.mode) && !r.lastmile);
    if (bad) {
      errBox.innerHTML = `<div class="error-msg">For train/flight travellers, please choose how they reach SSB. Check: ${esc(bad.name)}</div>`;
      return;
    }

    const payload = {
      pocName,
      pocTeam,
      pocPhone: val('pocPhone'),
      pocEmail: val('pocEmail'),
      travellers: valid.map((r) => ({
        name: r.name,
        travellerType: r.travellerType,
        phone: r.phone,
        email: r.email,
        region: r.region || 'South India',
        travelMode: r.mode,
        from: r.from,
        to: r.to,
        preferredOption: r.pref,
        arrival: r.arrival,
        lastMile: r.lastmile,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
      })),
    };

    const btn = container.querySelector('#submitPocBtn');
    btn.disabled = true;
    try {
      const created = await api.createPocBatch(payload);
      sessionStorage.setItem('mkn_last_batch_ids', JSON.stringify(created.map((r) => r.id)));
      sessionStorage.setItem('mkn_last_id', created[0].id);
      go('share');
    } catch (err) {
      errBox.innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  }
}
