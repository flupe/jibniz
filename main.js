(function() {
'use strict'

var raf = window.requestAnimationFrame
var J = window.jibniz = {}

// todo:
var YUVtoHEX = c => {
  var v = c >> 8 & 0xff
  return 0xff000000 | v << 16 | v << 8 | v
}

// probably useless
function Stack(constructor, size) {
  this.data = new constructor(size)
  this.size = size
  this.next = 0
}

Stack.prototype = {
  push: function(x) {
    this.data[this.next] = x
    this.next = (this.next + 1) % this.size
  },

  pop: function(x) {
    this.next = (this.next == 0) ? this.size - 1 : this.next - 1
    return this.data[this.next]
  },

  top: function() {
    return this.data[(this.next == 0) ? this.size - 1 : this.next - 1]
  }
}

J.Console = function() {
  var cvs = this.domElement = document.createElement('canvas')
  var ctx = cvs.getContext('2d')
  var stack  = this.stack = new Stack(Int32Array, 65536)
  var rstack = this.rstack = new Stack(Int32Array, 65536)

  cvs.width = cvs.height = 256
  var imageData = ctx.createImageData(256, 256)
  var buf32 = new Uint32Array(imageData.data.buffer)



  this.time = 0
  // position of the current fragment
  var x = 0, y = 0

  // later, MEM

  this.run = function() {
    raf(this.step)
  }

  this.step = function() {
    raf(this.step)
    for (y = 0; y < 256; y++) {
      for(x = 0; x < 256; x++) {
        this.whereami()
        this.program(this)
      }
    }

    for (var i = 65536; i--;)
      buf32[i] = YUVtoHEX(stack.data[i])

    ctx.putImageData(imageData, 0, 0)
    this.time ++
  }.bind(this)

  this.add = _ => {stack.push(stack.pop() + stack.pop())}
  this.sub = _ => {stack.push(-stack.pop() + stack.pop())}
  this.mul = _ => {stack.push(stack.pop() * stack.pop() >> 16)}
  this.div = _ => {
    var b = stack.pop()
    var a = stack.pop()
    stack.push(((a << 16) / b) | 0)
  }
  this.mod = _ => {
    var b = stack.pop()
    stack.push(b == 0 ? 0 : stack.pop() % b)
  }
  this.sqrt = _ => {
    var a = stack.pop()
    stack.push(a > 0 ? Math.sqrt(stack.pop() / 65536) * 65536 | 0 : 0)
  }
  this.and = _ => {stack.push(stack.pop() & stack.pop())}
  this.or = _ => {stack.push(stack.pop() | stack.pop())}
  this.xor = _ => {stack.push(stack.pop() ^ stack.pop())}
  this.right = _ => {
    var b = stack.pop() >> 16
    var a = stack.pop()
    var y = (a >> b) & ~(-1 << (32 - b))
    var z =   a << (32 - b)
    stack.push(y | z)
  }
  this.left = _ => {
    var b = stack.pop() >> 16
    stack.push(stack.pop() << b)
  }
  this.neg = _ => {stack.push(~stack.pop())}
  this.sin = _ => {stack.push(Math.sin(stack.pop() / 65536) * 65536 | 0)}
  this.atan = _ => {
    var b = stack.pop() >> 16
    stack.push(Math.atan(stack.pop() >> 16, b) / (2 * Math.PI) * 65536 | 0)
  }
  this.isneg = _ => {
    var a = stack.pop()
    stack.push(a < 0 ? a : 0)
  }
  this.ispos = _ => {
    var a = stack.pop()
    stack.push(a > 0 ? a : 0)
  }
  this.iszero = _ => {stack.push(stack.pop() == 0 ? 1 : 0)} // maybe automatically casted?
  this.dup = _ => {stack.push(stack.top())}
  this.pop = _ => {stack.pop()}
  this.exchange = _ => {
    var b = stack.pop()
    var a = stack.pop()
    stack.push(b)
    stack.push(a)
  }
  this.trirot = _ => {
    var c = stack.pop()
    var b = stack.pop()
    var a = stack.pop()
    stack.push(b)
    stack.push(c)
    stack.push(a)
  }
  this.if = _ => stack.pop() != 0

  this.retaddr = _ => {stack.push(rstack.pop())}
  this.pushtors = _ => {rstack.push(stack.pop())}
  this.loadimm = x => {stack.push(x)}

  // x in 0..255 -> x in -1.000...1.000
  var coord = v => {
    var s = Math.sign(v - 128)
    var r = Math.abs(v - 128)
    return (r << 9) * s
  }

  this.whereami = _ => {
    // for now, assuming video mode;
    stack.push(this.time << 16)
    stack.push(coord(y))
    stack.push(coord(x))
  }

  // later
  this.pick = _ => {}
  this.bury = _ => {}
  this.load = _ => {}
  this.store = _ => {}
  this.index = _ => {}
  this.outdex = _ => {}
}

// trivial ops
var codes = {
  '+': 'c.add();',
  '-': 'c.sub();',
  '*': 'c.mul();',
  '/': 'c.div();',
  '%': 'c.mod();',
  'q': 'c.sqrt();',
  '&': 'c.and();',
  '|': 'c.or();',
  '^': 'c.xor();',
  'r': 'c.right();',
  'l': 'c.left();',
  '~': 'c.neg();',
  's': 'c.sin();',
  'a': 'c.atan();',
  '<': 'c.isneg();',
  '>': 'c.ispos();',
  '=': 'c.iszero();',
  'd': 'c.dup();',
  'p': 'c.pop();',
  'x': 'c.exchange();',
  'v': 'c.trirot();',
  ')': 'c.pick();',
  '(': 'c.bury();',
  'w': 'c.whereami();',
  'T': 'return;',
  '@': 'c.load();',
  '!': 'c.store();',
  'i': 'c.index();',
  'j': 'c.outdex();',
  'R': 'c.retaddr();',
  'P': 'c.pushtors();',
}

function eatUntil(state, check) {
  while(state.pos < state.len && !check(state.src[state.pos]))
    next(state)
}

var isEndIf   = c => c == ':' || c == ';'
var isEndElse = c => c == ';'

var isHexaDecimal = c => {
  // we can probably all agree this is ugly
  return !isNaN(c) || c == 'A' || c == 'B' || c == 'C'
                   || c == 'D' || c == 'E' || c == 'F'
}

window.isHex = isHexaDecimal

function next(state) {
  var c = state.src[state.pos++]

  if (c == ' ' || c == ',' || c == 'd;' || c == '\n')
    return

  if (codes[c]) {
    state.body += codes[c]
  }
  else if (isHexaDecimal(c)) {
    var integer = parseInt(c, 16) << 16
    while(state.pos < state.len && isHexaDecimal(state.src[state.pos]))
      integer = integer << 4 | parseInt(state.src[state.pos++], 16)
    state.body += 'c.loadimm('+integer+');'
  }
  else {
    // comment
    switch(c) {
      case '\\':
        while (state.pos < state.len && state.src[state.pos++] != '\n') {}
        break
      case '?': // if
        state.body += 'if(c.if()) {' // not pretty, but eh
        eatUntil(state, isEndIf)
        state.body += '}'
        break
      case ':': // else
        // to improve, regarding error handling
        state.body += ' else {'
        eatUntil(state, isEndElse)
        state.body += '}'
        break
      // todo: subroutines and such
    }
  }
}

J.compile = function(src) {
  var state = {
    src,
    pos: 0,
    len: src.length,
    body: ''
  }

  while (state.pos < state.len)
    next(state)

  return new Function('c', state.body)
}

})()
