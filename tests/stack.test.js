import jibniz from '../jibniz'

const vm = new jibniz.VM
const vs = vm.vStack
const vr = vm.vRStack

beforeEach(() => vm.reset())


test('Dup instruction', () => {
  let prog = new jibniz.Program('d')
  vs.push(0, 1)
  vm.runOnce(prog)
  expect(vs.peek(3)).toEqual([1, 1, 0])
})


test('Pop instruction', () => {
  let prog = new jibniz.Program('p')
  vs.push(0, 5, 6)
  vm.runOnce(prog)
  expect(vs.peek(2)).toEqual([5, 0])
})


test('Exchange instruction', () => {
  let prog = new jibniz.Program('x')
  vs.push(1, 2, 3)
  vm.runOnce(prog)
  expect(vs.peek(3)).toEqual([2, 3, 1])
})


test('Trirot instruction', () => {
  let prog = new jibniz.Program('v')
  vs.push(1, 2, 3)
  vm.runOnce(prog)
  expect(vs.peek(3)).toEqual([1, 3, 2])
})


test('Pick instruction', () => {
  let prog = new jibniz.Program(')')
  vs.push(5, 0, 0, 0x20000)
  vm.runOnce(prog)
  expect(vs.pop()).toBe(5)
})


test('Bury instruction', () => {
  let prog = new jibniz.Program('(')
  vs.push(5, 0)
  vm.runOnce(prog)
  expect(vs.pop()).toBe(5)
})


test('RetAddr instruction', () => {
  let prog = new jibniz.Program('R')
  vr.push(5, 7)
  vs.push(1)
  vm.runOnce(prog)
  expect(vr.pop()).toBe(5)
  expect(vs.peek(2)).toEqual([7, 1])
})


test('PushToRS instruction', () => {
  let prog = new jibniz.Program('P')
  vs.push(5, 7)
  vr.push(1)
  vm.runOnce(prog)
  expect(vs.pop()).toBe(5)
  expect(vr.peek(2)).toEqual([7, 1])
})
