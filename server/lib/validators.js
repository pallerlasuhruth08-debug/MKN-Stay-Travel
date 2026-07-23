const db = require('../db');
const { STATIONS, FLIGHT_ARRIVAL_AIRPORT, ORGANIZED_BUS_FROM, SSB } = require('./stations');

const TRAVEL_MODES = ['Train', 'Flight', 'Organized bus (IYC to SSB)', 'Dedicated team bus (by SSB)'];
const LAST_MILE_OPTIONS = ['Isha shuttle', 'Shared taxi', 'Shared bus', 'Own'];
const NO_PREFERENCE = 'No preference — desk to decide';

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function needsLastMile(travelMode) {
  return travelMode === 'Train' || travelMode === 'Flight';
}

function validateTravelMode(travelMode) {
  if (!TRAVEL_MODES.includes(travelMode)) {
    throw new ValidationError(`Invalid travel mode: ${travelMode}`);
  }
}

// Enforces the "fixed From/To per mode" business rule server-side — the
// client's from/to are only ever honored where the rule says they're free text.
function resolveFromTo(travelMode, clientFrom, clientTo) {
  validateTravelMode(travelMode);

  if (travelMode === 'Train') {
    const from = String(clientFrom || '').trim();
    if (!from) throw new ValidationError('From (origin) is required for Train travel.');
    const to = String(clientTo || '').trim();
    if (!STATIONS.includes(to)) {
      throw new ValidationError(`To must be one of the known stations: ${STATIONS.join(', ')}`);
    }
    return { from, to };
  }

  if (travelMode === 'Flight') {
    const from = String(clientFrom || '').trim();
    if (!from) throw new ValidationError('From (origin) is required for Flight travel.');
    return { from, to: FLIGHT_ARRIVAL_AIRPORT };
  }

  if (travelMode === 'Organized bus (IYC to SSB)') {
    return { from: ORGANIZED_BUS_FROM, to: SSB };
  }

  // Dedicated team bus (by SSB)
  const from = String(clientFrom || '').trim();
  if (!from) throw new ValidationError('From (team pickup point) is required for Dedicated team bus.');
  return { from, to: SSB };
}

// Enforces "last-mile shown/required only for Train/Flight" server-side.
function validateLastMile(travelMode, lastMile) {
  if (needsLastMile(travelMode)) {
    if (!LAST_MILE_OPTIONS.includes(lastMile)) {
      throw new ValidationError('Last-mile choice (station/airport → SSB) is required for Train/Flight.');
    }
    return lastMile;
  }
  if (lastMile) {
    throw new ValidationError('Last-mile choice is not applicable for bus travel modes.');
  }
  return null;
}

// Enforces "preferred option must be a real recommended train/flight, or the
// no-preference sentinel, or blank" — looked up live, not just trusted.
function validatePreferredOption(travelMode, preferredOption) {
  const value = String(preferredOption || '').trim();
  if (!needsLastMile(travelMode)) return null;
  if (!value || value === NO_PREFERENCE) return value || null;

  const table = travelMode === 'Train' ? 'recommended_trains' : 'recommended_flights';
  const key = travelMode === 'Train' ? 'train' : 'flight';
  const row = db.prepare(`SELECT 1 FROM ${table} WHERE ${key} = ?`).get(value);
  if (!row) {
    throw new ValidationError(`Preferred option "${value}" is not a known recommended ${travelMode.toLowerCase()}.`);
  }
  return value;
}

function roleFor(requesterType, travellerType) {
  if (requesterType === 'Core volunteer') return 'Core volunteer';
  if (requesterType === 'Poornanga') return 'Poornanga (IYC)';
  return travellerType || 'Team member';
}

const REGIONS = [
  'South India', 'North India', 'East India', 'West India', 'Central India',
  'North East India', 'APAC', 'Middle East', 'North America', 'Europe', 'Other',
];

function validateRegion(region) {
  const value = String(region || '').trim();
  return REGIONS.includes(value) ? value : 'Other';
}

module.exports = {
  ValidationError,
  needsLastMile,
  validateTravelMode,
  resolveFromTo,
  validateLastMile,
  validatePreferredOption,
  roleFor,
  validateRegion,
  REGIONS,
  LAST_MILE_OPTIONS,
  TRAVEL_MODES,
  NO_PREFERENCE,
};
