import jibniz from '../jibniz'

const vm = new jibniz.VM
const vs = vm.vStack

beforeEach(() => vm.reset())

// TODO(flupe): not very convenient to test this kind of things
//              maybe do an abstraction around stacks?
//              (to be able to test position and such)

test('d', () => {
  let prog = new jibniz.Program('d')

  vs.push(1)
  vm.runOnce(prog)
  expect([vs.pop(), vs.pop()]).toEqual([1, 1])
})


test('p', () => {
  let prog = new jibniz.Program('p')

  vs.push(1)
  vm.runOnce(prog)
  expect(vs.pop()).toBe(0)
})


test('x', () => {
  let prog = new jibniz.Program('x')

  vs.push(1)
  vs.push(2)
  vm.runOnce(prog)
  expect([vs.pop(), vs.pop()]).toEqual([1, 2])
})


test('v', () => {
  let prog = new jibniz.Program('v')

  vs.push(1)
  vs.push(2)
  vs.push(3)
  vm.runOnce(prog)
  expect([vs.pop(), vs.pop(), vs.pop()]).toEqual([1, 3, 2])
})


test(')', () => {
  let prog = new jibniz.Program(')')

  vs.push(5)
  vs.push(0)
  vs.push(0)
  vs.push(0x20000)
  vm.runOnce(prog)
  expect(vs.pop()).toBe(5)
})


test('(', () => {
  let prog = new jibniz.Program('(')

  vs.push(5)
  vs.push(0)
  vm.runOnce(prog)
  expect(vs.pop()).toBe(5)
})
