const { supabase, ID_UPLOADS_BUCKET } = require('../supabase');
const { maskIdNumber } = require('./mask');

// This is the ONLY place allowed to read row.id_number or row.id_image_path.
// Every route must go through one of the three functions below so that ID
// masking and the derived confirmation status can never be forgotten or
// implemented differently in two places.

const SIGNED_URL_TTL_SECONDS = 3600;

// The bucket is private, so every access gets a freshly signed, time-limited
// URL rather than a stable public link to an Aadhaar/passport image.
async function imageUrl(idImagePath) {
  if (!idImagePath) return null;
  const { data, error } = await supabase.storage
    .from(ID_UPLOADS_BUCKET)
    .createSignedUrl(idImagePath, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

function base(row) {
  return {
    id: row.request_id,
    createdAt: row.created_at,
    requesterType: row.requester_type,
    pocName: row.poc_name,
    pocTeam: row.poc_team,
    travellerType: row.traveller_type,
    name: row.name,
    role: row.role,
    region: row.region,
    checkIn: row.check_in,
    checkOut: row.check_out,
    travelMode: row.travel_mode,
    from: row.from_location,
    to: row.to_location,
    preferredOption: row.preferred_option,
    arrival: row.arrival,
    lastMile: row.last_mile,
    idType: row.id_type,
    idStatus: row.id_status,
    stayStatus: row.stay_status,
    stayAllocation: row.stay_allocation,
    travelStatus: row.travel_status,
    travelAllocation: row.travel_allocation,
    confirmedStatus: row.confirmed_status,
  };
}

// Queue / desk list views — masked ID number only, no image path/URL at all.
function toListItem(row) {
  return {
    ...base(row),
    idNumberMasked: maskIdNumber(row.id_type, row.id_number),
  };
}

// Single-request detail (coordinator expand, confirmation view) — masked ID
// number plus the image URL, still never the raw ID number.
async function toDetail(row) {
  return {
    ...base(row),
    phone: row.phone,
    email: row.email,
    pocPhone: row.poc_phone,
    pocEmail: row.poc_email,
    idNumberMasked: maskIdNumber(row.id_type, row.id_number),
    idImageUrl: await imageUrl(row.id_image_path),
    uploadUrl: '/#/upload/' + row.request_id,
  };
}

// Traveller-facing link target — read-only trip summary only. No ID fields
// at all, masked or otherwise: this traveller hasn't proven who they are yet.
function toPublic(row) {
  return {
    id: row.request_id,
    name: row.name,
    region: row.region,
    checkIn: row.check_in,
    checkOut: row.check_out,
    travelMode: row.travel_mode,
    from: row.from_location,
    to: row.to_location,
    preferredOption: row.preferred_option,
    arrival: row.arrival,
    lastMile: row.last_mile,
    idStatus: row.id_status,
  };
}

module.exports = { toListItem, toDetail, toPublic };
