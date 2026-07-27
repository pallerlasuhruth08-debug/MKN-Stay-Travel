const express = require('express');
const { supabase } = require('../supabase');
const { ValidationError } = require('../lib/validators');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('mkn_recommended_trains')
      .select('*')
      .order('recommended', { ascending: false })
      .order('train', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { train, route, arrival, recommended } = req.body || {};
    if (!train || !String(train).trim()) throw new ValidationError('train is required.');
    if (!route || !String(route).trim()) throw new ValidationError('route is required.');

    const { data, error } = await supabase
      .from('mkn_recommended_trains')
      .insert({
        train: String(train).trim(),
        route: String(route).trim(),
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

router.put('/:train', async (req, res, next) => {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('mkn_recommended_trains')
      .select('*')
      .eq('train', req.params.train)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ error: 'Train not found' });

    const { route, arrival, recommended } = req.body || {};
    const { data, error } = await supabase
      .from('mkn_recommended_trains')
      .update({
        route: route || existing.route,
        arrival: arrival !== undefined ? arrival : existing.arrival,
        recommended: recommended === 'Yes' ? 'Yes' : null,
      })
      .eq('train', req.params.train)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.delete('/:train', async (req, res, next) => {
  try {
    const { error } = await supabase.from('mkn_recommended_trains').delete().eq('train', req.params.train);
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
