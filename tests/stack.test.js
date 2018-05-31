import jibniz from '../jibniz'

const vm = new jibniz.VM
const vs = vm.vStack

beforeEach(() => vm.reset())


test('d', () => {
  let prog = new jibniz.Program('d')

  vs.push(0, 1)
  vm.runOnce(prog)
  expect(vs.peek(3)).toEqual([1, 1, 0])
})


test('p', () => {
  let prog = new jibniz.Program('p')

  vs.push(0, 5, 6)
  vm.runOnce(prog)
  expect(vs.peek(2)).toEqual([5, 0])
})


test('x', () => {
  let prog = new jibniz.Program('x')

  vs.push(1, 2, 3)
  vm.runOnce(prog)
  expect(vs.peek(3)).toEqual([2, 3, 1])
})


test('v', () => {
  let prog = new jibniz.Program('v')

  vs.push(1, 2, 3)
  vm.runOnce(prog)
  expect(vs.peek(3)).toEqual([1, 3, 2])
})


test(')', () => {
  let prog = new jibniz.Program(')')

  vs.push(5, 0, 0, 0x20000)
  vm.runOnce(prog)
  expect(vs.pop()).toBe(5)
})


test('(', () => {
  let prog = new jibniz.Program('(')

  vs.push(5, 0)
  vm.runOnce(prog)
  expect(vs.pop()).toBe(5)
})
