import test from 'node:test';
import assert from 'node:assert/strict';
import { createCar, loadLibrary, renameCar, removeCar } from '../tools/car-library.js';

test('invalid saved data becomes a named default car', () => {
  const library = loadLibrary('{bad json');
  assert.equal(library.cars.length, 1);
  assert.equal(library.cars[0].name, '未命名购车方案');
});

test('blank names normalize and removing the only car replaces it', () => {
  const car = createCar('通勤车');
  assert.equal(renameCar(car, '  ').name, '未命名购车方案');
  assert.equal(removeCar({ cars: [car], activeId: car.id }, car.id).cars.length, 1);
});
