const { v4: uuidv4 } = require('uuid');

function newRequestId() {
  return 'SSB-' + uuidv4();
}

module.exports = { newRequestId };
