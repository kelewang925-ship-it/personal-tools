const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function validateVehicle(vehicle) {
  const errors = [];
  if (!Number.isFinite(Number(vehicle.carPrice)) || Number(vehicle.carPrice) <= 0) errors.push('裸车价需大于 0');
  if (!Number.isFinite(Number(vehicle.downPayment)) || Number(vehicle.downPayment) < 0) errors.push('首付不能为负数');
  if (Number(vehicle.downPayment) > Number(vehicle.carPrice)) errors.push('首付不能高于裸车价');
  return errors;
}

export function validatePlan(plan) {
  const errors = [];
  if (!Number.isInteger(Number(plan.months)) || Number(plan.months) < 1) errors.push('贷款期限至少为 1 个月');
  if (!Number.isFinite(Number(plan.annualRate)) || Number(plan.annualRate) < 0) errors.push('年利率不能为负数');
  if (!Number.isFinite(Number(plan.fee)) || Number(plan.fee) < 0) errors.push('手续费不能为负数');
  return errors;
}

export function calculatePlan(vehicle, plan) {
  const principal = round(Number(vehicle.carPrice) - Number(vehicle.downPayment));
  const months = Number(plan.months);
  const monthlyRate = Number(plan.annualRate) / 1200;
  const schedule = plan.repaymentMethod === 'equalPrincipal'
    ? calculateEqualPrincipal(principal, months, monthlyRate)
    : calculateAnnuity(principal, months, monthlyRate);
  const totalInterest = round(schedule.reduce((sum, item) => sum + item.interest, 0));
  const totalPayment = round(schedule.reduce((sum, item) => sum + item.payment, 0));
  const oneTimeCosts = ['downPayment', 'purchaseTax', 'insurance', 'registrationFee', 'otherFee']
    .reduce((sum, key) => sum + Number(vehicle[key] || 0), 0);

  return {
    principal,
    monthlyPayment: schedule[0]?.payment ?? 0,
    totalInterest,
    totalPayment,
    totalCost: round(oneTimeCosts + principal + totalInterest + Number(plan.fee || 0)),
    schedule,
  };
}

function calculateAnnuity(principal, months, monthlyRate) {
  const payment = monthlyRate === 0
    ? principal / months
    : (principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
  let balance = principal;

  return Array.from({ length: months }, (_, index) => {
    const interest = round(balance * monthlyRate);
    const paidPrincipal = index === months - 1 ? round(balance) : round(payment - interest);
    balance = round(balance - paidPrincipal);
    return {
      month: index + 1,
      payment: round(paidPrincipal + interest),
      principal: paidPrincipal,
      interest,
      balance: Math.max(0, balance),
    };
  });
}

function calculateEqualPrincipal(principal, months, monthlyRate) {
  const fixedPrincipal = round(principal / months);
  let balance = principal;

  return Array.from({ length: months }, (_, index) => {
    const paidPrincipal = index === months - 1 ? round(balance) : fixedPrincipal;
    const interest = round(balance * monthlyRate);
    balance = round(balance - paidPrincipal);
    return {
      month: index + 1,
      payment: round(paidPrincipal + interest),
      principal: paidPrincipal,
      interest,
      balance: Math.max(0, balance),
    };
  });
}
