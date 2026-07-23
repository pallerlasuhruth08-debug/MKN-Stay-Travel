export const TRAVEL_MODES = ['Train', 'Flight', 'Organized bus (IYC to SSB)', 'Dedicated team bus (by SSB)'];
export const LAST_MILE_OPTIONS = ['Isha shuttle', 'Shared taxi', 'Shared bus', 'Own'];
export const REGIONS = [
  'South India', 'North India', 'East India', 'West India', 'Central India',
  'North East India', 'APAC', 'Middle East', 'North America', 'Europe', 'Other',
];
export const STATIONS = ['KSR Bengaluru (SBC)', 'Yesvantpur Jn (YPR)', 'Bengaluru Cantt (BNC)', 'KR Puram (KJM)'];
export const FLIGHT_ARRIVAL_AIRPORT = 'Kempegowda Intl, Bengaluru (BLR)';
export const NO_PREFERENCE = 'No preference — desk to decide';

export function needsLastMile(mode) {
  return mode === 'Train' || mode === 'Flight';
}
