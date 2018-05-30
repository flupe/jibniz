import jibniz from '../jibniz'

const vm = new jibniz.VM

beforeEach(() => vm.reset())

// TODO(flupe): not very convenient to test this kind of things
//              maybe do an abstraction around stacks?
//              (to be able to test position and such)

test('d', () => {
  let prog = jibniz.compile('d')

  vm.push(1)
  vm.runOnce(prog)
  expect([vm.pop(), vm.pop()]).toEqual([1, 1])
})


test('p', () => {
  let prog = jibniz.compile('p')

  vm.push(1)
  vm.runOnce(prog)
  expect(vm.pop()).toBe(0)
})


test('x', () => {
  let prog = jibniz.compile('x')

  vm.push(1)
  vm.push(2)
  vm.runOnce(prog)
  expect([vm.pop(), vm.pop()]).toEqual([1, 2])
})


test('v', () => {
  let prog = jibniz.compile('v')

  vm.push(1)
  vm.push(2)
  vm.push(3)
  vm.runOnce(prog)
  expect([vm.pop(), vm.pop(), vm.pop()]).toEqual([1, 3, 2])
})


test(')', () => {
  let prog = jibniz.compile(')')

  vm.push(5)
  vm.push(0)
  vm.push(0)
  vm.push(0x20000)
  vm.runOnce(prog)
  expect(vm.pop()).toBe(5)
})


test('(', () => {
  let prog = jibniz.compile('(')

  vm.push(5)
  vm.push(0)
  vm.runOnce(prog)
  expect(vm.pop()).toBe(5)
})
