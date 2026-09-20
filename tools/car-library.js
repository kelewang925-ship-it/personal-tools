const cleanName = (name) => String(name ?? '').trim() || '未命名购车方案';
export const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const defaultExpenses = () => [['裸车价', 200000], ['购置税', 0], ['保险', 0], ['上牌费', 0]].map(([label, amount]) => ({ id: createId(), label, amount }));

export function createCar(name = '未命名购车方案') {
  return { id: createId(), name: cleanName(name), expenseItems: defaultExpenses(), financePlans: [], updatedAt: Date.now() };
}

function freshLibrary() {
  const car = createCar();
  return { cars: [car], activeId: car.id };
}

export function loadLibrary(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (value && Array.isArray(value.cars) && value.cars.length && value.cars.some((car) => car.id === value.activeId)) return value;
  } catch {}
  return freshLibrary();
}

export function renameCar(car, name) {
  return { ...car, name: cleanName(name), updatedAt: Date.now() };
}

export function removeCar(library, id) {
  const cars = library.cars.filter((car) => car.id !== id);
  if (!cars.length) return freshLibrary();
  return { cars, activeId: library.activeId === id ? cars[0].id : library.activeId };
}
