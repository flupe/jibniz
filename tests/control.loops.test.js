import jibniz from '../jibniz'

const vm = new jibniz.VM
const vs = vm.vStack
const vr = vm.vRStack

beforeEach(() => vm.reset())


test('Times loop initialization', () => {
  let prog = new jibniz.Program('4X')
  vm.runOnce(prog)
  expect(vr.peek(2)).toEqual([2, 4])
})


test('Simple times loop', () => {
  let prog = new jibniz.Program('4X.0001L')
  vs.push(0)
  vr.push(14)
  vm.runOnce(prog)
  expect(vs.peek(5)).toEqual([1, 1, 1, 1, 0])
  expect(vr.pop(1)).toBe(14)
})


test('Times loop with index', () => {
  let prog = new jibniz.Program('4XiL')
  vs.push(0)
  vm.runOnce(prog)
  expect(vs.peek(5)).toEqual([1, 2, 3, 4, 0])
})


test('Nested times loops initialization', () => {
  let prog = new jibniz.Program('3X4X')
  vm.runOnce(prog)
  expect(vr.peek(4)).toEqual([4, 4, 2, 3])
})


test('Nested loops using index', () => {
  let prog = new jibniz.Program('2X3XiLL')
  vs.push(0)
  vm.runOnce(prog)
  expect(vs.peek(7)).toEqual([1, 2, 3, 1, 2, 3, 0])
})


test('Nested loops using outdex', () => {
  let prog = new jibniz.Program('2X3XjLL')
  vs.push(0)
  vm.runOnce(prog)
  expect(vs.peek(7)).toEqual([1, 1, 1, 2, 2, 2, 0])
})


test('Do loop initialization', () => {
  let prog = new jibniz.Program('[')
  vr.push(7)
  vm.runOnce(prog)
  expect(vr.peek(2)).toEqual([1, 7])
})


test('Simple do loop', () => {
  let prog = new jibniz.Program('.0003[d.0001-d]')
  vs.push(5)
  vr.push(7)
  vm.runOnce(prog)
  expect(vs.peek(5)).toEqual([0, 1, 2, 3, 5])
  expect(vr.pop()).toBe(7)
})
