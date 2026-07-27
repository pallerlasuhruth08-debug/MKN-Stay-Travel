const { supabase } = require('./supabase');

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

async function seed() {
  const { error: trainsError } = await supabase
    .from('mkn_recommended_trains')
    .upsert(trains, { onConflict: 'train', ignoreDuplicates: true });
  if (trainsError) throw trainsError;

  const { error: flightsError } = await supabase
    .from('mkn_recommended_flights')
    .upsert(flights, { onConflict: 'flight', ignoreDuplicates: true });
  if (flightsError) throw flightsError;

  console.log(`Seeded ${trains.length} trains and ${flights.length} flights.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
