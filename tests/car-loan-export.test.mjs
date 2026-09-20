import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCsv } from '../tools/car-loan-export.js';

test('CSV uses a BOM, labeled sections, and quoted Chinese bank names', () => {
  const csv = makeCsv(
    { vehicle: { carPrice: 200000 }, plans: [{ bankName: '中国银行,浦东' }] },
    [{ plan: { bankName: '中国银行,浦东', fee: 0 }, result: { monthlyPayment: 10, totalInterest: 1, totalCost: 11, schedule: [{ month: 1, payment: 10, principal: 9, interest: 1, balance: 0 }] } }],
  );
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"中国银行,浦东"/);
  for (const label of ['基础参数', '方案对比', '还款计划']) assert.match(csv, new RegExp(label));
});
