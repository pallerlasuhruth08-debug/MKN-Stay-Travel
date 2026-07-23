const express = require('express');
const db = require('../db');
const { ValidationError } = require('../lib/validators');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM recommended_trains ORDER BY recommended DESC, train ASC').all());
});

router.post('/', (req, res, next) => {
  try {
    const { train, route, arrival, recommended } = req.body || {};
    if (!train || !String(train).trim()) throw new ValidationError('train is required.');
    if (!route || !String(route).trim()) throw new ValidationError('route is required.');
    db.prepare(
      'INSERT INTO recommended_trains (train, route, arrival, recommended) VALUES (?, ?, ?, ?)'
    ).run(String(train).trim(), String(route).trim(), arrival || null, recommended === 'Yes' ? 'Yes' : null);
    res.status(201).json(db.prepare('SELECT * FROM recommended_trains WHERE train = ?').get(train));
  } catch (err) {
    next(err);
  }
});

router.put('/:train', (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM recommended_trains WHERE train = ?').get(req.params.train);
    if (!existing) return res.status(404).json({ error: 'Train not found' });
    const { route, arrival, recommended } = req.body || {};
    db.prepare(
      'UPDATE recommended_trains SET route = ?, arrival = ?, recommended = ? WHERE train = ?'
    ).run(
      route || existing.route,
      arrival !== undefined ? arrival : existing.arrival,
      recommended === 'Yes' ? 'Yes' : null,
      req.params.train
    );
    res.json(db.prepare('SELECT * FROM recommended_trains WHERE train = ?').get(req.params.train));
  } catch (err) {
    next(err);
  }
});

router.delete('/:train', (req, res) => {
  db.prepare('DELETE FROM recommended_trains WHERE train = ?').run(req.params.train);
  res.status(204).end();
});

module.exports = router;
