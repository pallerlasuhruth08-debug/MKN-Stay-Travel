const express = require('express');
const { supabase, ID_UPLOADS_BUCKET } = require('../supabase');
const upload = require('../middleware/upload');
const { newRequestId } = require('../lib/ids');
const { toListItem, toDetail, toPublic } = require('../lib/serialize');
const {
  ValidationError,
  validateTravelMode,
  resolveFromTo,
  validateLastMile,
  validatePreferredOption,
  roleFor,
  validateRegion,
} = require('../lib/validators');

const router = express.Router();

async function getRow(requestId) {
  const { data, error } = await supabase
    .from('mkn_request_status')
    .select('*')
    .eq('request_id', requestId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function insertRequests(rows) {
  const { data, error } = await supabase.from('mkn_requests').insert(rows).select();
  if (error) throw error;
  return data;
}

async function uploadIdImage(file) {
  const objectName = upload.storageObjectName(file.originalname);
  const { error } = await supabase.storage
    .from(ID_UPLOADS_BUCKET)
    .upload(objectName, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw error;
  return objectName;
}

// --- Self request (Core volunteer / Poornanga) — inline ID upload ---------
router.post('/self', upload.single('idImage'), async (req, res, next) => {
  try {
    const b = req.body;

    if (!['Core volunteer', 'Poornanga'].includes(b.requesterType)) {
      throw new ValidationError('requesterType must be "Core volunteer" or "Poornanga".');
    }
    if (!b.name || !String(b.name).trim()) throw new ValidationError('Name is required.');
    if (!b.checkIn || !b.checkOut) throw new ValidationError('Check-in and check-out dates are required.');

    validateTravelMode(b.travelMode);
    const { from, to } = resolveFromTo(b.travelMode, b.from, b.to);
    const lastMile = validateLastMile(b.travelMode, b.lastMile);
    const preferredOption = await validatePreferredOption(b.travelMode, b.preferredOption);

    if (!['Aadhaar', 'Passport'].includes(b.idType)) {
      throw new ValidationError('ID type must be Aadhaar or Passport.');
    }
    if (!b.idNumber || !String(b.idNumber).trim()) throw new ValidationError('ID number is required.');
    if (!req.file) throw new ValidationError('ID image is required.');
    if (b.idType === 'Aadhaar' && !/^\d{12}$/.test(String(b.idNumber).replace(/\D/g, ''))) {
      throw new ValidationError('Aadhaar number must be 12 digits.');
    }

    const idImagePath = await uploadIdImage(req.file);

    const requestId = newRequestId();
    await insertRequests([{
      request_id: requestId,
      requester_type: b.requesterType,
      poc_name: null,
      poc_team: null,
      poc_phone: null,
      poc_email: null,
      traveller_type: null,
      name: String(b.name).trim(),
      role: roleFor(b.requesterType, null),
      region: validateRegion(b.region),
      phone: b.phone || null,
      email: b.email || null,
      check_in: b.checkIn,
      check_out: b.checkOut,
      travel_mode: b.travelMode,
      from_location: from,
      to_location: to,
      preferred_option: preferredOption,
      arrival: b.arrival || null,
      last_mile: lastMile,
      id_type: b.idType,
      id_number: String(b.idNumber).trim(),
      id_image_path: idImagePath,
      id_status: 'Received',
    }]);

    res.status(201).json(await toDetail(await getRow(requestId)));
  } catch (err) {
    next(err);
  }
});

// --- POC bulk request — no ID collected, delegated to per-traveller link --
router.post('/poc', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.pocName || !String(b.pocName).trim()) throw new ValidationError('POC name is required.');
    if (!b.pocTeam || !String(b.pocTeam).trim()) throw new ValidationError('POC team is required.');
    if (!Array.isArray(b.travellers) || b.travellers.length === 0) {
      throw new ValidationError('At least one traveller is required.');
    }

    const rows = [];
    for (const t of b.travellers) {
      if (!t.name || !String(t.name).trim()) throw new ValidationError('Each traveller needs a name.');
      if (!t.checkIn || !t.checkOut) throw new ValidationError(`Check-in/check-out required for ${t.name}.`);
      const travellerType = ['Team member', 'Vendor'].includes(t.travellerType) ? t.travellerType : 'Team member';

      validateTravelMode(t.travelMode);
      const { from, to } = resolveFromTo(t.travelMode, t.from, t.to);
      const lastMile = validateLastMile(t.travelMode, t.lastMile);
      const preferredOption = await validatePreferredOption(t.travelMode, t.preferredOption);

      rows.push({
        request_id: newRequestId(),
        requester_type: 'POC',
        poc_name: String(b.pocName).trim(),
        poc_team: String(b.pocTeam).trim(),
        poc_phone: b.pocPhone || null,
        poc_email: b.pocEmail || null,
        traveller_type: travellerType,
        name: String(t.name).trim(),
        role: roleFor('POC', travellerType),
        region: validateRegion(t.region),
        phone: t.phone || null,
        email: t.email || null,
        check_in: t.checkIn,
        check_out: t.checkOut,
        travel_mode: t.travelMode,
        from_location: from,
        to_location: to,
        preferred_option: preferredOption,
        arrival: t.arrival || null,
        last_mile: lastMile,
        id_type: null,
        id_number: null,
        id_image_path: null,
        id_status: 'Awaiting traveller',
      });
    }

    // Single INSERT of every row — atomic in Postgres, same guarantee the
    // old db.transaction() gave: either every traveller in the batch lands,
    // or (since all validation above already ran) none of them do.
    await insertRequests(rows);

    const created = await Promise.all(rows.map((r) => getRow(r.request_id).then(toDetail)));
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// --- Coordinator Queue / desk listings --------------------------------------
router.get('/', async (req, res, next) => {
  try {
    let query = supabase.from('mkn_request_status').select('*').order('created_at', { ascending: false });
    if (req.query.idStatus) query = query.eq('id_status', req.query.idStatus);
    if (req.query.stayStatus) query = query.eq('stay_status', req.query.stayStatus);
    if (req.query.travelStatus) query = query.eq('travel_status', req.query.travelStatus);
    if (req.query.requesterType) query = query.eq('requester_type', req.query.requesterType);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(toListItem));
  } catch (err) {
    next(err);
  }
});

// --- Traveller-facing public summary (no ID fields) ------------------------
router.get('/:id/public', async (req, res, next) => {
  try {
    const row = await getRow(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    res.json(toPublic(row));
  } catch (err) {
    next(err);
  }
});

// --- Traveller ID upload via their personal link ----------------------------
router.post('/:id/id-upload', upload.single('idImage'), async (req, res, next) => {
  try {
    const row = await getRow(req.params.id);
    if (!row) throw Object.assign(new Error('Request not found'), { status: 404 });
    if (row.requester_type !== 'POC') {
      throw Object.assign(new Error('This request already has its ID on file.'), { status: 409 });
    }

    const b = req.body;
    if (!['Aadhaar', 'Passport'].includes(b.idType)) {
      throw new ValidationError('ID type must be Aadhaar or Passport.');
    }
    if (!b.idNumber || !String(b.idNumber).trim()) throw new ValidationError('ID number is required.');
    if (!req.file) throw new ValidationError('ID image is required.');
    if (b.idType === 'Aadhaar' && !/^\d{12}$/.test(String(b.idNumber).replace(/\D/g, ''))) {
      throw new ValidationError('Aadhaar number must be 12 digits.');
    }

    const idImagePath = await uploadIdImage(req.file);

    const { error } = await supabase
      .from('mkn_requests')
      .update({
        id_type: b.idType,
        id_number: String(b.idNumber).trim(),
        id_image_path: idImagePath,
        id_status: 'Received',
      })
      .eq('request_id', req.params.id);
    if (error) throw error;

    res.json(await toDetail(await getRow(req.params.id)));
  } catch (err) {
    next(err);
  }
});

// --- Accommodation desk allocation ------------------------------------------
router.patch('/:id/stay', async (req, res, next) => {
  try {
    const row = await getRow(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    const allocation = String((req.body || {}).stayAllocation || '').trim();
    if (!allocation) throw new ValidationError('stayAllocation is required.');

    const { error } = await supabase
      .from('mkn_requests')
      .update({ stay_status: 'Allocated', stay_allocation: allocation })
      .eq('request_id', req.params.id);
    if (error) throw error;

    res.json(await toDetail(await getRow(req.params.id)));
  } catch (err) {
    next(err);
  }
});

// --- Travel desk allocation --------------------------------------------------
router.patch('/:id/travel', async (req, res, next) => {
  try {
    const row = await getRow(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    const allocation = String((req.body || {}).travelAllocation || '').trim();
    if (!allocation) throw new ValidationError('travelAllocation is required.');

    const { error } = await supabase
      .from('mkn_requests')
      .update({ travel_status: 'Booked', travel_allocation: allocation })
      .eq('request_id', req.params.id);
    if (error) throw error;

    res.json(await toDetail(await getRow(req.params.id)));
  } catch (err) {
    next(err);
  }
});

// --- Single request detail (must be last: catch-all "/:id") ----------------
router.get('/:id', async (req, res, next) => {
  try {
    const row = await getRow(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    res.json(await toDetail(row));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
