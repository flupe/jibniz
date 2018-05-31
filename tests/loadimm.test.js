import jibniz from '../jibniz'

const vm = new jibniz.VM
const vs = vm.vStack

beforeEach(() => vm.reset())


test('Load imm integer', () => {
  let prog = new jibniz.Program('AE')
  vm.runOnce(prog)
  expect(vs.pop()).toBe(0xAE0000)
})


test('Load imm fraction', () => {
  let prog = new jibniz.Program('.AE')
  vm.runOnce(prog)
  expect(vs.pop()).toBe(0xAE00)
})


test('Load imm full number', () => {
  let prog = new jibniz.Program('1234.5678')
  vm.runOnce(prog)
  expect(vs.pop()).toBe(0x12345678)
})


test('Ignore trailing fraction', () => {
  let prog = new jibniz.Program('1.12345')
  vm.runOnce(prog)
  expect(vs.pop()).toBe(0x11234)
})


test('Ignore out of bounds integer', () => {
  let prog = new jibniz.Program('12345')
  vm.runOnce(prog)
  expect(vs.pop()).toBe(0x23450000)
})


test('Ignore bounds', () => {
  let prog = new jibniz.Program('12345.6789A')
  vm.runOnce(prog)
  expect(vs.pop()).toBe(0x23456789)
})
