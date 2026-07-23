const db = require('./db');

const trains = [
  { train: '12658 · Bengaluru Mail', route: 'Chennai to SBC', arrival: 'arrives 06:30', recommended: 'Yes' },
  { train: '16022 · Kaveri Express', route: 'Mysuru side to SBC', arrival: 'arrives 09:10', recommended: null },
  { train: '22691 · Rajdhani Express', route: 'Delhi to SBC', arrival: 'arrives 05:50', recommended: null },
];

const flights = [
  { flight: '6E-455', airline: 'IndiGo', arrival: 'arrives BLR 08:20', recommended: 'Yes' },
  { flight: 'AI-503', airline: 'Air India', arrival: 'arrives BLR 11:45', recommended: null },
  { flight: 'UK-812', airline: 'Vistara', arrival: 'arrives BLR 14:10', recommended: null },
];

const insertTrain = db.prepare(
  'INSERT OR IGNORE INTO recommended_trains (train, route, arrival, recommended) VALUES (@train, @route, @arrival, @recommended)'
);
const insertFlight = db.prepare(
  'INSERT OR IGNORE INTO recommended_flights (flight, airline, arrival, recommended) VALUES (@flight, @airline, @arrival, @recommended)'
);

const seed = db.transaction(() => {
  for (const t of trains) insertTrain.run(t);
  for (const f of flights) insertFlight.run(f);
});

seed();

console.log(`Seeded ${trains.length} trains and ${flights.length} flights.`);
