import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('calculator page includes the core controls and online tables', async () => {
  const html = await readFile(new URL('../tools/购车分期比较器.html', import.meta.url), 'utf8');
  for (const text of ['车辆与一次性费用', '银行方案', '方案对比', '还款计划', '导出 CSV', 'localStorage']) {
    assert.match(html, new RegExp(text));
  }
});
