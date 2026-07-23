const fs = require('fs');
const express = require('express');
const db = require('../db');
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

function getRow(requestId) {
  return db.prepare('SELECT * FROM request_status WHERE request_id = ?').get(requestId);
}

function cleanupUploadedFile(req) {
  if (req.file) fs.unlink(req.file.path, () => {});
}

const insertRequest = db.prepare(`
  INSERT INTO requests (
    request_id, requester_type, poc_name, poc_team, poc_phone, poc_email,
    traveller_type, name, role, region, phone, email,
    check_in, check_out, travel_mode, from_location, to_location,
    preferred_option, arrival, last_mile,
    id_type, id_number, id_image_path, id_status
  ) VALUES (
    @request_id, @requester_type, @poc_name, @poc_team, @poc_phone, @poc_email,
    @traveller_type, @name, @role, @region, @phone, @email,
    @check_in, @check_out, @travel_mode, @from_location, @to_location,
    @preferred_option, @arrival, @last_mile,
    @id_type, @id_number, @id_image_path, @id_status
  )
`);

// --- Self request (Core volunteer / Poornanga) — inline ID upload ---------
router.post('/self', upload.single('idImage'), (req, res, next) => {
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
    const preferredOption = validatePreferredOption(b.travelMode, b.preferredOption);

    if (!['Aadhaar', 'Passport'].includes(b.idType)) {
      throw new ValidationError('ID type must be Aadhaar or Passport.');
    }
    if (!b.idNumber || !String(b.idNumber).trim()) throw new ValidationError('ID number is required.');
    if (!req.file) throw new ValidationError('ID image is required.');
    if (b.idType === 'Aadhaar' && !/^\d{12}$/.test(String(b.idNumber).replace(/\D/g, ''))) {
      throw new ValidationError('Aadhaar number must be 12 digits.');
    }

    const requestId = newRequestId();
    insertRequest.run({
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
      id_image_path: req.file.filename,
      id_status: 'Received',
    });

    res.status(201).json(toDetail(getRow(requestId)));
  } catch (err) {
    cleanupUploadedFile(req);
    next(err);
  }
});

// --- POC bulk request — no ID collected, delegated to per-traveller link --
router.post('/poc', (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.pocName || !String(b.pocName).trim()) throw new ValidationError('POC name is required.');
    if (!b.pocTeam || !String(b.pocTeam).trim()) throw new ValidationError('POC team is required.');
    if (!Array.isArray(b.travellers) || b.travellers.length === 0) {
      throw new ValidationError('At least one traveller is required.');
    }

    const created = [];
    const insertBatch = db.transaction((travellers) => {
      for (const t of travellers) {
        if (!t.name || !String(t.name).trim()) throw new ValidationError('Each traveller needs a name.');
        if (!t.checkIn || !t.checkOut) throw new ValidationError(`Check-in/check-out required for ${t.name}.`);
        const travellerType = ['Team member', 'Vendor'].includes(t.travellerType) ? t.travellerType : 'Team member';

        validateTravelMode(t.travelMode);
        const { from, to } = resolveFromTo(t.travelMode, t.from, t.to);
        const lastMile = validateLastMile(t.travelMode, t.lastMile);
        const preferredOption = validatePreferredOption(t.travelMode, t.preferredOption);

        const requestId = newRequestId();
        insertRequest.run({
          request_id: requestId,
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
        created.push(requestId);
      }
    });

    insertBatch(b.travellers);

    res.status(201).json(created.map((id) => toDetail(getRow(id))));
  } catch (err) {
    next(err);
  }
});

// --- Coordinator Queue / desk listings --------------------------------------
router.get('/', (req, res, next) => {
  try {
    const clauses = [];
    const params = {};
    if (req.query.idStatus) { clauses.push('id_status = @idStatus'); params.idStatus = req.query.idStatus; }
    if (req.query.stayStatus) { clauses.push('stay_status = @stayStatus'); params.stayStatus = req.query.stayStatus; }
    if (req.query.travelStatus) { clauses.push('travel_status = @travelStatus'); params.travelStatus = req.query.travelStatus; }
    if (req.query.requesterType) { clauses.push('requester_type = @requesterType'); params.requesterType = req.query.requesterType; }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db.prepare(`SELECT * FROM request_status ${where} ORDER BY created_at DESC`).all(params);
    res.json(rows.map(toListItem));
  } catch (err) {
    next(err);
  }
});

// --- Traveller-facing public summary (no ID fields) ------------------------
router.get('/:id/public', (req, res, next) => {
  try {
    const row = getRow(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    res.json(toPublic(row));
  } catch (err) {
    next(err);
  }
});

// --- Traveller ID upload via their personal link ----------------------------
router.post('/:id/id-upload', upload.single('idImage'), (req, res, next) => {
  try {
    const row = getRow(req.params.id);
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

    db.prepare(`
      UPDATE requests
      SET id_type = ?, id_number = ?, id_image_path = ?, id_status = 'Received'
      WHERE request_id = ?
    `).run(b.idType, String(b.idNumber).trim(), req.file.filename, req.params.id);

    res.json(toDetail(getRow(req.params.id)));
  } catch (err) {
    cleanupUploadedFile(req);
    next(err);
  }
});

// --- Accommodation desk allocation ------------------------------------------
router.patch('/:id/stay', (req, res, next) => {
  try {
    const row = getRow(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    const allocation = String((req.body || {}).stayAllocation || '').trim();
    if (!allocation) throw new ValidationError('stayAllocation is required.');

    db.prepare(`UPDATE requests SET stay_status = 'Allocated', stay_allocation = ? WHERE request_id = ?`)
      .run(allocation, req.params.id);
    res.json(toDetail(getRow(req.params.id)));
  } catch (err) {
    next(err);
  }
});

// --- Travel desk allocation --------------------------------------------------
router.patch('/:id/travel', (req, res, next) => {
  try {
    const row = getRow(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    const allocation = String((req.body || {}).travelAllocation || '').trim();
    if (!allocation) throw new ValidationError('travelAllocation is required.');

    db.prepare(`UPDATE requests SET travel_status = 'Booked', travel_allocation = ? WHERE request_id = ?`)
      .run(allocation, req.params.id);
    res.json(toDetail(getRow(req.params.id)));
  } catch (err) {
    next(err);
  }
});

// --- Single request detail (must be last: catch-all "/:id") ----------------
router.get('/:id', (req, res, next) => {
  try {
    const row = getRow(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    res.json(toDetail(row));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
