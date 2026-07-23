const express = require('express');
const db = require('../db');
const { ValidationError } = require('../lib/validators');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM recommended_flights ORDER BY recommended DESC, flight ASC').all());
});

router.post('/', (req, res, next) => {
  try {
    const { flight, airline, arrival, recommended } = req.body || {};
    if (!flight || !String(flight).trim()) throw new ValidationError('flight is required.');
    if (!airline || !String(airline).trim()) throw new ValidationError('airline is required.');
    db.prepare(
      'INSERT INTO recommended_flights (flight, airline, arrival, recommended) VALUES (?, ?, ?, ?)'
    ).run(String(flight).trim(), String(airline).trim(), arrival || null, recommended === 'Yes' ? 'Yes' : null);
    res.status(201).json(db.prepare('SELECT * FROM recommended_flights WHERE flight = ?').get(flight));
  } catch (err) {
    next(err);
  }
});

router.put('/:flight', (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM recommended_flights WHERE flight = ?').get(req.params.flight);
    if (!existing) return res.status(404).json({ error: 'Flight not found' });
    const { airline, arrival, recommended } = req.body || {};
    db.prepare(
      'UPDATE recommended_flights SET airline = ?, arrival = ?, recommended = ? WHERE flight = ?'
    ).run(
      airline || existing.airline,
      arrival !== undefined ? arrival : existing.arrival,
      recommended === 'Yes' ? 'Yes' : null,
      req.params.flight
    );
    res.json(db.prepare('SELECT * FROM recommended_flights WHERE flight = ?').get(req.params.flight));
  } catch (err) {
    next(err);
  }
});

router.delete('/:flight', (req, res) => {
  db.prepare('DELETE FROM recommended_flights WHERE flight = ?').run(req.params.flight);
  res.status(204).end();
});

module.exports = router;
