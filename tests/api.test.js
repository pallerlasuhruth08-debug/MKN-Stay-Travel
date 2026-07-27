const test = require('node:test');
const assert = require('node:assert/strict');

// These are integration tests against the live Supabase project — there's no
// local embedded DB anymore (Postgres via Supabase, not SQLite), so
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY must point at a reachable project.
const app = require('../server/app');
const { supabase, ID_UPLOADS_BUCKET } = require('../server/supabase');

const createdRequestIds = [];

test.after(async () => {
  if (!createdRequestIds.length) return;

  const { data: rows } = await supabase
    .from('mkn_requests')
    .select('id_image_path')
    .in('request_id', createdRequestIds);
  const paths = (rows || []).map((r) => r.id_image_path).filter(Boolean);
  if (paths.length) await supabase.storage.from(ID_UPLOADS_BUCKET).remove(paths);

  await supabase.from('mkn_requests').delete().in('request_id', createdRequestIds);
});

const request = require('supertest');

const fakeIdImage = () => Buffer.from('fake id image bytes');

function trackCreated(id) {
  if (id) createdRequestIds.push(id);
  return id;
}

test('rejects Train mode without a last-mile choice', async () => {
  const res = await request(app)
    .post('/api/requests/self')
    .field('requesterType', 'Core volunteer')
    .field('name', 'Test User')
    .field('region', 'South India')
    .field('checkIn', '2026-09-27')
    .field('checkOut', '2026-10-02')
    .field('travelMode', 'Train')
    .field('from', 'Chennai')
    .field('to', 'KSR Bengaluru (SBC)')
    .field('idType', 'Aadhaar')
    .field('idNumber', '123456789012')
    .attach('idImage', fakeIdImage(), { filename: 'id.jpg', contentType: 'image/jpeg' });
  trackCreated(res.body && res.body.id);
  assert.equal(res.status, 400);
});

test('Flight mode always resolves To to the fixed arrival airport, ignoring client input', async () => {
  const res = await request(app)
    .post('/api/requests/self')
    .field('requesterType', 'Core volunteer')
    .field('name', 'Flight Traveller')
    .field('region', 'South India')
    .field('checkIn', '2026-09-27')
    .field('checkOut', '2026-10-02')
    .field('travelMode', 'Flight')
    .field('from', 'Hyderabad')
    .field('to', 'Some made up airport')
    .field('lastMile', 'Isha shuttle')
    .field('idType', 'Aadhaar')
    .field('idNumber', '123456789013')
    .attach('idImage', fakeIdImage(), { filename: 'id.jpg', contentType: 'image/jpeg' });
  trackCreated(res.body && res.body.id);
  assert.equal(res.status, 201);
  assert.equal(res.body.to, 'Kempegowda Intl, Bengaluru (BLR)');
});

test('list/detail views never expose an unmasked ID number', async () => {
  const created = await request(app)
    .post('/api/requests/self')
    .field('requesterType', 'Poornanga')
    .field('name', 'Masking Test')
    .field('region', 'South India')
    .field('checkIn', '2026-09-27')
    .field('checkOut', '2026-10-02')
    .field('travelMode', 'Organized bus (IYC to SSB)')
    .field('idType', 'Aadhaar')
    .field('idNumber', '999988887777')
    .attach('idImage', fakeIdImage(), { filename: 'id.jpg', contentType: 'image/jpeg' });
  trackCreated(created.body && created.body.id);

  assert.equal(created.status, 201);
  assert.equal(created.body.idNumberMasked, 'XXXX-XXXX-7777');
  assert.ok(!JSON.stringify(created.body).includes('999988887777'));

  const list = await request(app).get('/api/requests');
  const row = list.body.find((r) => r.id === created.body.id);
  assert.ok(row);
  assert.equal(row.idNumberMasked, 'XXXX-XXXX-7777');
  assert.ok(!JSON.stringify(list.body).includes('999988887777'));
});

test('POC batch defers ID collection, and the traveller upload link flips status to Received', async () => {
  const batchRes = await request(app)
    .post('/api/requests/poc')
    .send({
      pocName: 'Sw. Test',
      pocTeam: 'IT Team',
      travellers: [{
        name: 'Traveller One',
        travellerType: 'Team member',
        travelMode: 'Dedicated team bus (by SSB)',
        from: 'Chennai centre',
        checkIn: '2026-09-27',
        checkOut: '2026-10-02',
      }],
    });
  assert.equal(batchRes.status, 201);
  const createdRequest = batchRes.body[0];
  trackCreated(createdRequest && createdRequest.id);
  assert.equal(createdRequest.idStatus, 'Awaiting traveller');

  const publicRes = await request(app).get(`/api/requests/${createdRequest.id}/public`);
  assert.equal(publicRes.status, 200);
  assert.equal(publicRes.body.idStatus, 'Awaiting traveller');
  assert.equal('idNumberMasked' in publicRes.body, false);

  const uploadRes = await request(app)
    .post(`/api/requests/${createdRequest.id}/id-upload`)
    .field('idType', 'Passport')
    .field('idNumber', 'AB123456')
    .attach('idImage', fakeIdImage(), { filename: 'passport.jpg', contentType: 'image/jpeg' });
  assert.equal(uploadRes.status, 200);
  assert.equal(uploadRes.body.idStatus, 'Received');
});

test('confirmation reads Confirmed only once ID + stay + travel are all done', async () => {
  const createRes = await request(app)
    .post('/api/requests/self')
    .field('requesterType', 'Core volunteer')
    .field('name', 'Confirm Test')
    .field('region', 'South India')
    .field('checkIn', '2026-09-27')
    .field('checkOut', '2026-10-02')
    .field('travelMode', 'Organized bus (IYC to SSB)')
    .field('idType', 'Aadhaar')
    .field('idNumber', '111122223333')
    .attach('idImage', fakeIdImage(), { filename: 'id.jpg', contentType: 'image/jpeg' });
  const id = createRes.body.id;
  trackCreated(id);
  assert.equal(createRes.body.confirmedStatus, 'In progress');

  await request(app).patch(`/api/requests/${id}/stay`).send({ stayAllocation: 'Block A · Bed 1' });
  const midway = await request(app).get(`/api/requests/${id}`);
  assert.equal(midway.body.confirmedStatus, 'In progress');

  await request(app).patch(`/api/requests/${id}/travel`).send({ travelAllocation: 'IYC bus B-1 · Seat 4' });
  const done = await request(app).get(`/api/requests/${id}`);
  assert.equal(done.body.confirmedStatus, 'Confirmed');
});
