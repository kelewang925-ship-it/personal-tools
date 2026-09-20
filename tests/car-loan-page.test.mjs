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

test('page delegates card actions from nested card content', async () => {
  const html = await readFile(new URL('../tools/购车分期比较器.html', import.meta.url), 'utf8');
  assert.match(html, /closest\('\[data-open\]|closest\("\[data-open\]/);
});

test('new car action asks for a recognizable plan name', async () => {
  const html = await readFile(new URL('../tools/购车分期比较器.html', import.meta.url), 'utf8');
  assert.match(html, /prompt\('购车方案名称'/);
  assert.match(html, /createCar\(name\)/);
});

test('empty data action attributes are checked by presence, not truthiness', async () => {
  const html = await readFile(new URL('../tools/购车分期比较器.html', import.meta.url), 'utf8');
  assert.match(html, /hasAttribute\(`data-\$\{key\}`\)/);
});
