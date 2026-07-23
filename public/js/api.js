const BASE = '/api';

async function handle(res) {
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch (_) { /* no body */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

export const api = {
  listRequests(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${BASE}/requests${qs ? '?' + qs : ''}`).then(handle);
  },
  getRequest(id) {
    return fetch(`${BASE}/requests/${encodeURIComponent(id)}`).then(handle);
  },
  getPublicRequest(id) {
    return fetch(`${BASE}/requests/${encodeURIComponent(id)}/public`).then(handle);
  },
  createSelfRequest(formData) {
    return fetch(`${BASE}/requests/self`, { method: 'POST', body: formData }).then(handle);
  },
  createPocBatch(payload) {
    return fetch(`${BASE}/requests/poc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handle);
  },
  uploadId(id, formData) {
    return fetch(`${BASE}/requests/${encodeURIComponent(id)}/id-upload`, { method: 'POST', body: formData }).then(handle);
  },
  allocateStay(id, stayAllocation) {
    return fetch(`${BASE}/requests/${encodeURIComponent(id)}/stay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stayAllocation }),
    }).then(handle);
  },
  allocateTravel(id, travelAllocation) {
    return fetch(`${BASE}/requests/${encodeURIComponent(id)}/travel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ travelAllocation }),
    }).then(handle);
  },
  listTrains() { return fetch(`${BASE}/trains`).then(handle); },
  addTrain(payload) {
    return fetch(`${BASE}/trains`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(handle);
  },
  deleteTrain(train) { return fetch(`${BASE}/trains/${encodeURIComponent(train)}`, { method: 'DELETE' }).then(handle); },
  listFlights() { return fetch(`${BASE}/flights`).then(handle); },
  addFlight(payload) {
    return fetch(`${BASE}/flights`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(handle);
  },
  deleteFlight(flight) { return fetch(`${BASE}/flights/${encodeURIComponent(flight)}`, { method: 'DELETE' }).then(handle); },
};
