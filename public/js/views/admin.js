import { api } from '../api.js';
import { esc } from '../format.js';

export async function renderAdmin(container) {
  await refresh();

  async function refresh() {
    const [trains, flights] = await Promise.all([api.listTrains(), api.listFlights()]);
    container.innerHTML = `
      <div class="card">
        <h2>Recommended trains &amp; flights</h2>
        <p class="sub">Admin-editable reference lists that feed the "preferred train/flight" dropdown on the request form.</p>

        <div class="grp-title">Trains</div>
        <table class="admin-table">
          <tr><th>Train</th><th>Route</th><th>Arrival</th><th>Recommended</th><th></th></tr>
          ${trains.map((t) => `<tr>
            <td>${esc(t.train)}</td><td>${esc(t.route)}</td><td>${esc(t.arrival || '')}</td><td>${t.recommended === 'Yes' ? 'Yes' : ''}</td>
            <td><button type="button" class="rowdel" data-del-train="${esc(t.train)}" title="Remove">✕</button></td>
          </tr>`).join('')}
        </table>
        <div class="row" style="margin-top:12px">
          <div class="field"><label>Train</label><input type="text" id="newTrain" placeholder="12658 · Bengaluru Mail"/></div>
          <div class="field"><label>Route</label><input type="text" id="newTrainRoute" placeholder="Chennai to SBC"/></div>
        </div>
        <div class="row">
          <div class="field"><label>Arrival</label><input type="text" id="newTrainArrival" placeholder="arrives 06:30"/></div>
          <div class="field"><label>Recommended?</label><select id="newTrainRec"><option value="">No</option><option value="Yes">Yes</option></select></div>
        </div>
        <button type="button" class="btn-add" id="addTrain">+ Add train</button>

        <div class="grp-title">Flights</div>
        <table class="admin-table">
          <tr><th>Flight</th><th>Airline</th><th>Arrival</th><th>Recommended</th><th></th></tr>
          ${flights.map((f) => `<tr>
            <td>${esc(f.flight)}</td><td>${esc(f.airline)}</td><td>${esc(f.arrival || '')}</td><td>${f.recommended === 'Yes' ? 'Yes' : ''}</td>
            <td><button type="button" class="rowdel" data-del-flight="${esc(f.flight)}" title="Remove">✕</button></td>
          </tr>`).join('')}
        </table>
        <div class="row" style="margin-top:12px">
          <div class="field"><label>Flight</label><input type="text" id="newFlight" placeholder="6E-455"/></div>
          <div class="field"><label>Airline</label><input type="text" id="newFlightAirline" placeholder="IndiGo"/></div>
        </div>
        <div class="row">
          <div class="field"><label>Arrival</label><input type="text" id="newFlightArrival" placeholder="arrives BLR 08:20"/></div>
          <div class="field"><label>Recommended?</label><select id="newFlightRec"><option value="">No</option><option value="Yes">Yes</option></select></div>
        </div>
        <button type="button" class="btn-add" id="addFlight">+ Add flight</button>
        <div id="formError"></div>
      </div>
    `;
    wire();
  }

  function wire() {
    container.querySelectorAll('[data-del-train]').forEach((btn) => {
      btn.addEventListener('click', async () => { await api.deleteTrain(btn.dataset.delTrain); await refresh(); });
    });
    container.querySelectorAll('[data-del-flight]').forEach((btn) => {
      btn.addEventListener('click', async () => { await api.deleteFlight(btn.dataset.delFlight); await refresh(); });
    });
    container.querySelector('#addTrain').addEventListener('click', async () => {
      const errBox = container.querySelector('#formError');
      const train = container.querySelector('#newTrain').value.trim();
      const route = container.querySelector('#newTrainRoute').value.trim();
      const arrival = container.querySelector('#newTrainArrival').value.trim();
      const recommended = container.querySelector('#newTrainRec').value;
      try {
        await api.addTrain({ train, route, arrival, recommended });
        await refresh();
      } catch (err) {
        errBox.innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
      }
    });
    container.querySelector('#addFlight').addEventListener('click', async () => {
      const errBox = container.querySelector('#formError');
      const flight = container.querySelector('#newFlight').value.trim();
      const airline = container.querySelector('#newFlightAirline').value.trim();
      const arrival = container.querySelector('#newFlightArrival').value.trim();
      const recommended = container.querySelector('#newFlightRec').value;
      try {
        await api.addFlight({ flight, airline, arrival, recommended });
        await refresh();
      } catch (err) {
        errBox.innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
      }
    });
  }
}
