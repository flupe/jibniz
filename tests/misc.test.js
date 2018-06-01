import jibniz from '../jibniz'

const vm = new jibniz.VM
const vs = vm.vStack
const vr = vm.vRStack

beforeEach(() => vm.reset())


test('Escape loop via an if', () => {
  let prog = new jibniz.Program('5,3X7,0?L:')
  vm.runOnce(prog)
  expect(vs.peek(2)).toEqual([0x70000, 0x50000])
})
