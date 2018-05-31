import jibniz from '../jibniz'

const vm  = new jibniz.VM
const vs  = vm.vStack
const mem = vm.memory

beforeEach(() => vm.reset())


test('Store in user area #1', () => {
  let prog = new jibniz.Program('5,0!')
  vs.push(7)
  vm.runOnce(prog)
  expect(mem[0]).toBe(0x50000)
  expect(vs.pop(1)).toBe(7)
})


test('Store in user area #2', () => {
  let prog = new jibniz.Program('5,F!')
  vs.push(7)
  vm.runOnce(prog)
  expect(mem[15]).toBe(0x50000)
  expect(vs.pop(1)).toBe(7)
})


test('Store in video stack area', () => {
  let prog = new jibniz.Program('5,.000E!')
  vs.push(1, 7)
  vm.runOnce(prog)
  expect(mem[0xE0000]).toBe(0x50000)
  // we've written on the stack!
  expect(vs.peek(2)).toEqual([7, 0x50000])
})


test('Load value from memory', () => {
  let prog = new jibniz.Program('0@')
  mem[0] = 7
  vm.runOnce(prog)
  expect(vs.pop()).toBe(7)
})


test('Load value from stack area', () => {
  let prog = new jibniz.Program('.000E@')
  vs.push(1, 7)
  vm.runOnce(prog)
  expect(vs.peek(3)).toEqual([1, 7, 1])
})


test('Write then load value from memory', () => {
  let prog = new jibniz.Program('7,0!0@')
  vm.runOnce(prog)
  expect(vs.pop()).toBe(0x70000)
})

test('Write with loop to memory', () => {
  let prog = new jibniz.Program('4Xii!L')
  vm.runOnce(prog)
  expect(Array.from(mem.slice(0, 5))).toEqual([0, 0x10000, 0x20000, 0x30000, 0x40000])
})
