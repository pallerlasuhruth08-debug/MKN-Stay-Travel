const express = require('express');
const { supabase } = require('../supabase');
const { ValidationError } = require('../lib/validators');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('mkn_recommended_flights')
      .select('*')
      .order('recommended', { ascending: false })
      .order('flight', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { flight, airline, arrival, recommended } = req.body || {};
    if (!flight || !String(flight).trim()) throw new ValidationError('flight is required.');
    if (!airline || !String(airline).trim()) throw new ValidationError('airline is required.');

    const { data, error } = await supabase
      .from('mkn_recommended_flights')
      .insert({
        flight: String(flight).trim(),
        airline: String(airline).trim(),
        arrival: arrival || null,
        recommended: recommended === 'Yes' ? 'Yes' : null,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.put('/:flight', async (req, res, next) => {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('mkn_recommended_flights')
      .select('*')
      .eq('flight', req.params.flight)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ error: 'Flight not found' });

    const { airline, arrival, recommended } = req.body || {};
    const { data, error } = await supabase
      .from('mkn_recommended_flights')
      .update({
        airline: airline || existing.airline,
        arrival: arrival !== undefined ? arrival : existing.arrival,
        recommended: recommended === 'Yes' ? 'Yes' : null,
      })
      .eq('flight', req.params.flight)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.delete('/:flight', async (req, res, next) => {
  try {
    const { error } = await supabase.from('mkn_recommended_flights').delete().eq('flight', req.params.flight);
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
