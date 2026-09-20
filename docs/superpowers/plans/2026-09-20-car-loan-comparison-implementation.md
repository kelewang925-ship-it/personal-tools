# 购车分期比较器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 加入本地运行的购车贷款方案比较、在线还款表与 CSV 导出工具。

**Architecture:** 可测试的 ES 模块处理精确贷款计算；独立 HTML 处理页面、浏览器本地保存、在线表格和下载；工具箱入口链接至新页面。

**Tech Stack:** 原生 HTML、CSS、ES modules、Node.js `node:test`。

**Spec:** `docs/superpowers/specs/2026-09-20-car-loan-comparison-design.md`

## Global Constraints

- 数据只保存于当前浏览器；不包含登录、云端同步、客户管理或提前还款模拟。
- 每个方案包含银行名、贷款月数、年利率、手续费、等额本息或等额本金。
- 一次性费用不算进本金，仍计入总支出；手续费单列并计入总成本。
- CSV 以 UTF-8 BOM 开头，内容包含基础参数、方案对比和逐月明细。
- 主体文字至少 16px，常用标签至少 14px；窄屏仅让表格区域横向滚动。

## Review Focus

- 零利率的月供等于本金除以期数，且不出现 `NaN` 或 `Infinity`。
- 等额本金首期大于末期，且各期本金之和等于贷款本金。
- 首付超过车价、贷款期数不足 1 时应出现输入提示而非结果。
- 手续费仅计入一次总成本。
- 导出内容中含逗号的中文银行名必须被 CSV 引号转义。

---

### Task 1: 贷款计算与测试

**Files:**
- Create: `tools/car-loan-calculations.js`
- Create: `tests/car-loan-calculations.test.mjs`

**Interfaces:**
- Produces: `validateVehicle(vehicle): string[]`、`validatePlan(plan): string[]`、`calculatePlan(vehicle, plan): { principal, monthlyPayment, totalInterest, totalPayment, totalCost, schedule }`。

- [ ] **Step 1: 写失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlan, validatePlan, validateVehicle } from '../tools/car-loan-calculations.js';
const vehicle = { carPrice: 200000, downPayment: 40000, purchaseTax: 10000, insurance: 6000, registrationFee: 500, otherFee: 0 };
test('zero-rate loan divides principal', () => {
  const r = calculatePlan(vehicle, { months: 12, annualRate: 0, fee: 1000, repaymentMethod: 'annuity' });
  assert.equal(r.monthlyPayment, 13333.33); assert.equal(r.totalInterest, 0); assert.equal(r.totalCost, 217500);
});
test('equal principal declines and fully repays', () => {
  const r = calculatePlan(vehicle, { months: 12, annualRate: 12, fee: 0, repaymentMethod: 'equalPrincipal' });
  assert.ok(r.schedule[0].payment > r.schedule.at(-1).payment); assert.equal(r.schedule.reduce((n, x) => n + x.principal, 0), 160000);
});
test('invalid vehicle and plan fail validation', () => {
  assert.deepEqual(validateVehicle({ ...vehicle, downPayment: 200001 }), ['首付不能高于裸车价']);
  assert.deepEqual(validatePlan({ months: 0 }), ['贷款期限至少为 1 个月']);
});
```

- [ ] **Step 2: 运行失败测试**

Run: `node --test tests/car-loan-calculations.test.mjs`

Expected: FAIL，计算模块尚不存在。

- [ ] **Step 3: 最小实现计算模块**

```js
export function validateVehicle(v) { return Number(v.downPayment) > Number(v.carPrice) ? ['首付不能高于裸车价'] : []; }
export function validatePlan(p) { return !Number.isInteger(Number(p.months)) || Number(p.months) < 1 ? ['贷款期限至少为 1 个月'] : []; }
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
export function calculatePlan(vehicle, plan) {
  const principal = round(Number(vehicle.carPrice) - Number(vehicle.downPayment));
  const schedule = plan.repaymentMethod === 'equalPrincipal'
    ? equalPrincipal(principal, Number(plan.months), Number(plan.annualRate) / 1200)
    : annuity(principal, Number(plan.months), Number(plan.annualRate) / 1200);
  const totalInterest = round(schedule.reduce((sum, x) => sum + x.interest, 0));
  const fee = Number(plan.fee || 0);
  const oneTime = ['downPayment', 'purchaseTax', 'insurance', 'registrationFee', 'otherFee'].reduce((sum, key) => sum + Number(vehicle[key] || 0), 0);
  return { principal, monthlyPayment: schedule[0]?.payment || 0, totalInterest, totalPayment: round(principal + totalInterest), totalCost: round(oneTime + principal + totalInterest + fee), schedule };
}
function annuity(principal, months, rate) {
  const payment = rate === 0 ? principal / months : principal * rate * (1 + rate) ** months / ((1 + rate) ** months - 1); let balance = principal;
  return Array.from({ length: months }, (_, i) => { const interest = round(balance * rate); const paid = i === months - 1 ? round(balance) : round(payment - interest); balance = round(balance - paid); return { month: i + 1, payment: round(paid + interest), principal: paid, interest, balance: Math.max(0, balance) }; });
}
function equalPrincipal(principal, months, rate) {
  const fixed = round(principal / months); let balance = principal;
  return Array.from({ length: months }, (_, i) => { const paid = i === months - 1 ? round(balance) : fixed; const interest = round(balance * rate); balance = round(balance - paid); return { month: i + 1, payment: round(paid + interest), principal: paid, interest, balance: Math.max(0, balance) }; });
}
```

- [ ] **Step 4: 运行通过测试并提交**

Run: `node --test tests/car-loan-calculations.test.mjs`

Expected: PASS，3 个测试通过。

Commit: `git add tools/car-loan-calculations.js tests/car-loan-calculations.test.mjs && git commit -m "feat: add car loan calculations"`

### Task 2: 分期比较工作台

**Files:**
- Create: `tools/购车分期比较器.html`
- Create: `tests/car-loan-page.test.mjs`

**Interfaces:**
- Consumes: Task 1 的计算和校验函数。
- Produces: 状态 `{ vehicle, plans, expandedPlanId }`，持久化键为 `personal-tools.car-loan-comparison.v1`。

- [ ] **Step 1: 写失败的页面结构测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('page has core calculator controls', async () => {
  const html = await readFile(new URL('../tools/购车分期比较器.html', import.meta.url), 'utf8');
  for (const word of ['车辆与一次性费用', '银行方案', '方案对比', '还款计划', '导出 CSV', 'localStorage']) assert.match(html, new RegExp(word));
});
```

- [ ] **Step 2: 运行失败测试**

Run: `node --test tests/car-loan-page.test.mjs`

Expected: FAIL，页面文件尚不存在。

- [ ] **Step 3: 创建 HTML 工作台**

```html
<main class="app-shell">
  <header><p class="eyebrow">PERSONAL TOOLS / 02</p><h1>购车分期比较器</h1></header>
  <section><h2>车辆与一次性费用</h2><div id="vehicle-fields"></div></section>
  <section><h2>银行方案</h2><button id="add-plan" type="button">添加方案</button><div id="plan-list"></div></section>
  <section><h2>方案对比</h2><button id="export-csv" type="button">导出 CSV</button><div class="table-wrap"><table id="comparison-table"></table></div></section>
  <section><h2>还款计划</h2><div id="schedule-list"></div></section>
</main>
```

- [ ] **Step 4: 实现浏览器状态与交互**

```js
const storageKey = 'personal-tools.car-loan-comparison.v1';
let state = loadState() ?? { vehicle: defaultVehicle(), plans: [defaultPlan()], expandedPlanId: null };
function updateAndRender(mutator) { mutator(); localStorage.setItem(storageKey, JSON.stringify(state)); render(); }
function addPlan() { updateAndRender(() => state.plans.push(defaultPlan())); }
function copyPlan(id) { updateAndRender(() => state.plans.push({ ...state.plans.find(p => p.id === id), id: crypto.randomUUID() })); }
function removePlan(id) { updateAndRender(() => { if (state.plans.length > 1) state.plans = state.plans.filter(p => p.id !== id); }); }
```

Render sortable semantic comparison tables, mark the lowest monthly payment and total cost, and provide expandable monthly schedules. Display field errors before results. At 375px stack panels and confine horizontal scroll to `.table-wrap`.

- [ ] **Step 5: 运行自动测试、手测并提交**

Run: `node --test tests/car-loan-calculations.test.mjs tests/car-loan-page.test.mjs`

Expected: PASS。手测费用编辑、添加/复制/删除方案、两种还款方式、刷新保存、展开计划和 375px 窄屏。

Commit: `git add tools/购车分期比较器.html tests/car-loan-page.test.mjs && git commit -m "feat: add car loan comparison workspace"`

### Task 3: CSV 导出与工具箱入口

**Files:**
- Modify: `tools/购车分期比较器.html`
- Modify: `tests/car-loan-page.test.mjs`
- Modify: `index.html`
- Modify: `README.md`

**Interfaces:**
- Produces: `makeCsv(state, results): string`，返回带 BOM 且字段正确引号转义的 CSV。

- [ ] **Step 1: 写 CSV 失败测试**

```js
test('CSV uses BOM, sections, and quoted Chinese names', () => {
  const csv = makeCsv({ vehicle, plans: [{ bankName: '中国银行,浦东' }] }, [{ schedule: [{ month: 1, payment: 10, principal: 9, interest: 1, balance: 0 }] }]);
  assert.ok(csv.startsWith('\uFEFF')); assert.match(csv, /"中国银行,浦东"/);
  for (const word of ['基础参数', '方案对比', '还款计划']) assert.match(csv, new RegExp(word));
});
```

- [ ] **Step 2: 运行失败测试**

Run: `node --test tests/car-loan-page.test.mjs`

Expected: FAIL，`makeCsv` 尚未定义。

- [ ] **Step 3: 实现 CSV 与下载**

```js
export function makeCsv(state, results) {
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [['基础参数'], ['裸车价', state.vehicle.carPrice], [], ['方案对比'], ['银行', '月供', '总利息', '总成本']];
  results.forEach(({ plan, result }) => rows.push([plan.bankName, result.monthlyPayment, result.totalInterest, result.totalCost]));
  rows.push([], ['还款计划'], ['银行', '期数', '月供', '本金', '利息', '剩余本金']);
  results.forEach(({ plan, result }) => result.schedule.forEach(x => rows.push([plan.bankName, x.month, x.payment, x.principal, x.interest, x.balance])));
  return `\uFEFF${rows.map(row => row.map(quote).join(',')).join('\r\n')}`;
}
```

Bind `#export-csv` to Blob download named `购车分期方案比较.csv`.

- [ ] **Step 4: 更新入口、说明并验证**

Add an `index.html` card with `./tools/%E8%B4%AD%E8%BD%A6%E5%88%86%E6%9C%9F%E6%AF%94%E8%BE%83%E5%99%A8.html`; add a README description of comparison, online schedules, and CSV export.

Run: `node --test tests/car-loan-calculations.test.mjs tests/car-loan-page.test.mjs && node --check tools/car-loan-calculations.js`

Expected: PASS，测试和语法检查全部通过。

- [ ] **Step 5: 提交**

Commit: `git add index.html README.md tools/购车分期比较器.html tests/car-loan-page.test.mjs && git commit -m "feat: export car loan comparison tables"`
