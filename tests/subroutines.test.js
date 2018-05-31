import jibniz from '../jibniz'

const vm  = new jibniz.VM
const vs  = vm.vStack
const mem = vm.memory

beforeEach(() => vm.reset())


test('Define subroutine in memory #1', () => {
  let prog = new jibniz.Program('3{2')
  vs.push(7)
  vm.runOnce(prog)
  expect(mem[3]).toBe(2)
  expect(vs.pop()).toBe(7)
})


test('Define subroutine in memory #2', () => {
  let prog = new jibniz.Program('3{2}1')
  vs.push(7)
  vm.runOnce(prog)
  expect(mem[3]).toBe(2)
  expect(vs.peek(2)).toEqual([0x10000, 7])
})


test('Visit subroutine', () => {
  let prog = new jibniz.Program('0{2}1,0V3')
  vs.push(7)
  vm.runOnce(prog)
  expect(vs.peek(4)).toEqual([0x30000, 0x20000, 0x10000, 7])
})


test('Visit multiple subroutines', () => {
  let prog = new jibniz.Program('0{2}1{3}1,0V1V4')
  vs.push(7)
  vm.runOnce(prog)
  expect(vs.peek(5)).toEqual([0x40000, 0x30000, 0x20000, 0x10000, 7])
})
