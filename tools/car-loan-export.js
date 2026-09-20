export function makeCsv(state, results) {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const labels = { carPrice: '裸车价', downPayment: '首付金额', purchaseTax: '购置税', insurance: '保险', registrationFee: '上牌费', otherFee: '其他费用' };
  const rows = [['基础参数'], ...Object.entries(labels).map(([key, label]) => [label, state.vehicle[key] ?? '']), [], ['方案对比'], ['银行', '月供', '总利息', '手续费', '总成本']];
  results.forEach(({ plan, result }) => rows.push([plan.bankName, result.monthlyPayment, result.totalInterest, plan.fee, result.totalCost]));
  rows.push([], ['还款计划'], ['银行', '期数', '月供', '本金', '利息', '剩余本金']);
  results.forEach(({ plan, result }) => result.schedule.forEach((item) => rows.push([plan.bankName, item.month, item.payment, item.principal, item.interest, item.balance])));
  return `\uFEFF${rows.map((row) => row.map(quote).join(',')).join('\r\n')}`;
}
