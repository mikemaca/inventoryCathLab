const assert = require('node:assert/strict');
const { parseLabel } = require('./borrow.js');
assert.deepEqual(parseLabel('DESCRIPTION: Balloon catheter\nGTIN: 01234567890128\nREF: ABC-42\nLOT: L123\nEXP: 2028-02-29'), {description:'Balloon catheter',gtin:'01234567890128',ref:'ABC-42',lot:'L123',expiry:'2028-02-29'});
assert.deepEqual(parseLabel('(01)01234567890128(17)280229(10)LOT42'), {description:'',gtin:'01234567890128',ref:'',lot:'LOT42',expiry:'280229'});
assert.equal(parseLabel('unreadable').gtin, '');
assert.equal(parseLabel('LOT: 000123').lot, '000123');
console.log('Label parsing checks passed');
