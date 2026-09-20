import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('page presents a car library and saved-cost reading view', async () => {
  const html = await readFile(new URL('../tools/购车分期比较器.html', import.meta.url), 'utf8');
  for (const text of ['我的购车方案', '新增购车方案', '编辑基本费用', '保存基本费用', '落地价', '金融方案']) {
    assert.match(html, new RegExp(text));
  }
});

test('page persists a car library and exposes finance inputs', async () => {
  const html = await readFile(new URL('../tools/购车分期比较器.html', import.meta.url), 'utf8');
  for (const text of ['personal-tools.car-library.v1', '贷款方', '首付', '贷款金额', '年利率', '分期期数', '每期还款', '总还款 / 总利息']) {
    assert.match(html, new RegExp(text));
  }
});
