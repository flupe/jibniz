import jibniz from '../jibniz'

const vm = new jibniz.VM
const vs = vm.vStack
const vr = vm.vRStack

beforeEach(() => vm.reset())


test('Simple if else fi with true cond', () => {
  let prog = new jibniz.Program('1?5:3;2')
  vs.push(7)
  vm.runOnce(prog)
  expect(vs.peek(3)).toEqual([0x20000, 0x50000, 7])
})


test('Simple if else fi with false cond', () => {
  let prog = new jibniz.Program('0?5:3;2')
  vs.push(7)
  vm.runOnce(prog)
  expect(vs.peek(3)).toEqual([0x20000, 0x30000, 7])
})


test('Simple if else with true cond', () => {
  let prog = new jibniz.Program('1?5:3')
  vs.push(7)
  vm.runOnce(prog)
  expect(vs.peek(2)).toEqual([0x50000, 7])
})


test('Simple if else with false cond', () => {
  let prog = new jibniz.Program('0?5:3')
  vs.push(7)
  vm.runOnce(prog)
  expect(vs.peek(2)).toEqual([0x30000, 7])
})


test('Simple if fi with true cond', () => {
  let prog = new jibniz.Program('1?5;2')
  vs.push(7)
  vm.runOnce(prog)
  expect(vs.peek(3)).toEqual([0x20000, 0x50000, 7])
})


test('Simple if fi with false cond', () => {
  let prog = new jibniz.Program('0?5;2')
  vs.push(7)
  vm.runOnce(prog)
  expect(vs.peek(2)).toEqual([0x20000, 7])
})


test('Simple if with true cond', () => {
  let prog = new jibniz.Program('1?5')
  vs.push(7)
  vm.runOnce(prog)
  expect(vs.peek(2)).toEqual([0x50000, 7])
})


test('Simple if with false cond', () => {
  let prog = new jibniz.Program('0?5')
  vs.push(7)
  vm.runOnce(prog)
  expect(vs.peek(1)).toEqual([7])
})
