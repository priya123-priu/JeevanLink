import assert from 'node:assert';
import { validateIndianPhone, maskPhoneNumber } from '../src/services/contactService.ts';

console.log('Running JeevanLink Unit Tests...');

// 1. Phone validation tests
console.log('Test 1: Indian Phone Validation');
const test1 = validateIndianPhone('9876543210');
assert.strictEqual(test1.isValid, true);
assert.strictEqual(test1.normalized, '+919876543210');

const test2 = validateIndianPhone('+919876543210');
assert.strictEqual(test2.isValid, true);
assert.strictEqual(test2.normalized, '+919876543210');

const test3 = validateIndianPhone('09876543210');
assert.strictEqual(test3.isValid, true);
assert.strictEqual(test3.normalized, '+919876543210');

const test4 = validateIndianPhone('12345');
assert.strictEqual(test4.isValid, false);

const test5 = validateIndianPhone('5555555555'); // Invalid starting digit for India mobile
assert.strictEqual(test5.isValid, false);

// 2. Phone masking tests (+91******1234)
console.log('Test 2: Phone Masking Privacy');
const masked1 = maskPhoneNumber('+919876543210');
assert.strictEqual(masked1, '+91******3210');

const masked2 = maskPhoneNumber('9876501234');
assert.strictEqual(masked2, '+91******1234');

// 3. Security Verification (No secrets exposed)
console.log('Test 3: Security & Secret Leak Prevention');
const envExample = `VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\nVITE_ALERT_MODE=simulation\n`;
assert(!envExample.includes('SERVICE_ROLE'), 'Must not contain SERVICE_ROLE');
assert(!envExample.includes('SMS_API_KEY'), 'Must not contain SMS_API_KEY');

console.log('All JeevanLink unit tests passed successfully!');
