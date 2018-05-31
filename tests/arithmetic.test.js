import jibniz from '../jibniz'

const vm = new jibniz.VM

beforeEach(() => vm.reset())


// TODO(flupe):
//    here we assume the JS runtime uses 32-bits integers
//    fix that.
function testOp(prog, a, b) {
  vm.vStack.push(a)
  vm.runOnce(prog)
  expect(vm.vStack.pop()).toBe(b | 0)
}


function testBinOp(prog, a, b, c) {
  vm.vStack.push(a)
  vm.vStack.push(b)
  vm.runOnce(prog)
  expect(vm.vStack.pop()).toBe(c | 0)
}


test('+', () => {
  let prog = new jibniz.Program('+')

  testBinOp(prog,  0, 0, 0)
  testBinOp(prog,  1, 1, 2)
  testBinOp(prog, -1, 1, 0)
})


test('-', () => {
  let prog = new jibniz.Program('-')

  testBinOp(prog, 0, 0,  0)
  testBinOp(prog, 1, 1,  0)
  testBinOp(prog, 2, 4, -2)
})


test('*', () => {
  let prog = new jibniz.Program('*')

  // 2 bytes of fraction
  // XXXX.XXXX
  testBinOp(prog, 0, 0,  0)
  testBinOp(prog, 0x10000,  0x10000,   0x10000)
  testBinOp(prog, 0x10000, -0x10000,  -0x10000)
  testBinOp(prog, 0x20000, 0x100000,  0x200000)
})


test('/', () => {
  let prog = new jibniz.Program('/')

  testBinOp(prog, 0x10000,  0x10000,  0x10000)
  testBinOp(prog, 0x40000,  0x20000,  0x20000)
  testBinOp(prog, 0x40000, -0x20000, -0x20000)
  // division by 0
  testBinOp(prog, 0, 0,  0)
  testBinOp(prog, 1, 0,  0)
})


test('%', () => {
  let prog = new jibniz.Program('%')

  testBinOp(prog, 17, 2, 1)
  testBinOp(prog, -12, 5, -2)
  // mod by 0
  testBinOp(prog, 25,  0, 0)
})


test('q', () => {
  let prog = new jibniz.Program('q')

  testOp(prog,  0x40000, 0x20000)
  testOp(prog, 0x190000, 0x50000)
  // 0 when negative input
  testOp(prog, -3, 0)
})


test('&', () => {
  let prog = new jibniz.Program('&')

  testBinOp(prog, 0, 0, 0)
  testBinOp(prog, 1, 0, 0)
  testBinOp(prog, 0, 1, 0)
  testBinOp(prog, 1, 1, 1)
})


test('|', () => {
  let prog = new jibniz.Program('|')

  testBinOp(prog, 0, 0, 0)
  testBinOp(prog, 1, 0, 1)
  testBinOp(prog, 0, 1, 1)
  testBinOp(prog, 1, 1, 1)
})


test('^', () => {
  let prog = new jibniz.Program('^')

  testBinOp(prog, 0, 0, 0)
  testBinOp(prog, 1, 0, 1)
  testBinOp(prog, 0, 1, 1)
  testBinOp(prog, 1, 1, 0)
})


test('r', () => {
  let prog = new jibniz.Program('r')

  testBinOp(prog, 0, 0, 0)
  testBinOp(prog, 25, 0, 25)
  testBinOp(prog, 0x10, 0x40000, 0x1)
  testBinOp(prog, 0x100, 0x80000, 0x1)
  testBinOp(prog, 0x0FFFFF0F, 0x80000, 0x0F0FFFFF)
})


test('l', () => {
  let prog = new jibniz.Program('l')

  testBinOp(prog, 0, 0, 0)
  testBinOp(prog, 25, 0, 25)
  testBinOp(prog, 0x1, 0x40000, 0x10)
  testBinOp(prog, 0x1, 0x80000, 0x100)
})


test('~', () => {
  let prog = new jibniz.Program('~')

  testOp(prog, 0, 0xFFFFFFFF)
  testOp(prog, 1, 0xFFFFFFFE)
})


test('s', () => {
  let prog = new jibniz.Program('s')

  testOp(prog, 0, 0)
  testOp(prog,  0x8000, 0)
  testOp(prog, -0x8000, 0)

  testOp(prog,  0x04000,  0x10000)
  testOp(prog, -0x04000, -0x10000)
})


test('a', () => {
  let prog = new jibniz.Program('a')

  testBinOp(prog, 0x10000, 0, 0x4000)
  testBinOp(prog, -0x10000, 0, -0x4000)
  testBinOp(prog, 0, 0x10000, 0)
  testBinOp(prog, 0, -0x10000, 0X8000)
})


test('<', () => {
  let prog = new jibniz.Program('<')

  testOp(prog, -1, -1)
  testOp(prog, -0xFF, -0xFF)
  testOp(prog, 0, 0)
  testOp(prog, 1, 0)
  testOp(prog, 0xFF, 0)
})


test('>', () => {
  let prog = new jibniz.Program('>')

  testOp(prog, -1, 0)
  testOp(prog, -0xFF, 0)
  testOp(prog, 0, 0)
  testOp(prog, 1, 1)
  testOp(prog, 0xFF, 0xFF)
})


test('=', () => {
  let prog = new jibniz.Program('=')

  testOp(prog, -1, 0)
  testOp(prog, -0xFF, 0)
  testOp(prog, 0, 0x10000)
  testOp(prog, 1, 0)
  testOp(prog, 0xFF, 0)
})
