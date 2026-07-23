// Fixed destination-station list for Train mode. Not an admin-editable
// reference table per the spec — only RecommendedTrains/RecommendedFlights are.
const STATIONS = [
  'KSR Bengaluru (SBC)',
  'Yesvantpur Jn (YPR)',
  'Bengaluru Cantt (BNC)',
  'KR Puram (KJM)',
];

const FLIGHT_ARRIVAL_AIRPORT = 'Kempegowda Intl, Bengaluru (BLR)';
const ORGANIZED_BUS_FROM = 'Isha Yoga Center, Coimbatore';
const SSB = 'Isha SSB, Bengaluru';

module.exports = { STATIONS, FLIGHT_ARRIVAL_AIRPORT, ORGANIZED_BUS_FROM, SSB };
