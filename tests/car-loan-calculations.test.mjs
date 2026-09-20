import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlan, validatePlan, validateVehicle } from '../tools/car-loan-calculations.js';

const vehicle = {
  carPrice: 200000,
  downPayment: 40000,
  purchaseTax: 10000,
  insurance: 6000,
  registrationFee: 500,
  otherFee: 0,
};

test('zero-rate loan divides principal evenly', () => {
  const result = calculatePlan(vehicle, { months: 12, annualRate: 0, fee: 1000, repaymentMethod: 'annuity' });
  assert.equal(result.principal, 160000);
  assert.equal(result.monthlyPayment, 13333.33);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.totalCost, 217500);
});

test('equal-principal loan declines and fully repays the principal', () => {
  const result = calculatePlan(vehicle, { months: 12, annualRate: 12, fee: 0, repaymentMethod: 'equalPrincipal' });
  assert.ok(result.schedule[0].payment > result.schedule.at(-1).payment);
  assert.equal(Math.round(result.schedule.reduce((sum, item) => sum + item.principal, 0) * 100) / 100, 160000);
});

test('invalid vehicle and loan inputs are rejected', () => {
  assert.deepEqual(validateVehicle({ ...vehicle, downPayment: 200001 }), ['首付不能高于裸车价']);
  assert.deepEqual(validatePlan({ months: 0, annualRate: 1, fee: 0 }), ['贷款期限至少为 1 个月']);
});
