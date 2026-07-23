function maskAadhaar(number) {
  const digits = String(number || '').replace(/\D/g, '');
  if (digits.length < 4) return 'XXXX-XXXX-XXXX';
  return 'XXXX-XXXX-' + digits.slice(-4);
}

function maskPassport(number) {
  const value = String(number || '').trim();
  if (value.length <= 4) return '••••';
  return value.slice(0, 2) + '••••' + value.slice(-2);
}

function maskIdNumber(idType, idNumber) {
  if (!idNumber) return null;
  if (idType === 'Aadhaar') return maskAadhaar(idNumber);
  if (idType === 'Passport') return maskPassport(idNumber);
  return null;
}

module.exports = { maskAadhaar, maskPassport, maskIdNumber };
