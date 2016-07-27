(function() {
'use strict'

var raf = window.requestAnimationFrame
var J = window.jibniz = {}

// VVUU.YYYY
var YUVtoHEX = c => {
  var l = (c >> 8) & 0xff
  return 0xff000000 | l << 16 | l << 8 | l
}

J.Console = function() {
  var cvs = this.domElement = document.createElement('canvas')
  var ctx = cvs.getContext('2d')

  // hahaha, lightweight… right
  var MEM     = new Int32Array(1048576)
  var USRDATA = new Int32Array(MEM.buffer, 0, 786432)
  var ARSTACK = new Int32Array(MEM.buffer, 102400, 16384)
  var VRSTACK = new Int32Array(MEM.buffer, 104448, 16384)
  var ASTACK  = new Int32Array(MEM.buffer, 106496, 65536)
  var VSTACK  = new Int32Array(MEM.buffer, 114688, 131072)

  var pointers = {
    vs: 0,
    as: 0,
    vr: 0,
    ar: 0
  }

  cvs.width = cvs.height = 256
  var imageData = ctx.createImageData(256, 256)
  var buf32 = new Uint32Array(imageData.data.buffer)

  this.time = 0
  // position of the current fragment
  var x = 0, y = 0

  this.run = function() {
    raf(this.step)
  }

  this.step = function() {
    // raf(this.step)
    for (y = 0; y < 256; y++) {
      for(x = 0; x < 256; x++) {
        this.whereami()
        this.program(VSTACK, pointers)
      }
    }

    var offset = pointers.vs < 65536 ? 65536 : 0
    for (var i = 65536; i--;)
      buf32[i] = YUVtoHEX(VSTACK[offset + i])

    ctx.putImageData(imageData, 0, 0)
    this.time ++
  }.bind(this)

  // tmp: to be deleted
  function push(x) {
    VSTACK[pointers.vs] = x
    pointers.vs = pointers.vs + 1 & 131071
  }

  this.right = _ => {
    var b = stack.pop() >> 16
    var a = stack.pop()
    var y = (a >> b) & ~(-1 << (32 - b))
    var z =   a << (32 - b)
    stack.push(y | z)
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
    // for now, assuming video mode
    push(this.time << 16)
    push(coord(y))
    push(coord(x))
  }

  this.pick = _ => {
    var i = stack.pop()
    if (stack.next > i)
      stack.push(stack.data[i])
    else
      stack.push(stack.data[stack.next + stack.size - i])
  }
  this.bury = _ => {
    var i = stack.pop()
    var val = stack.pop()
    if (stack.next > i)
      stack.data[i] = val
    else
      stack.data[stack.next + stack.size - i] = val
  }
  this.load = _ => {}
  this.store = _ => {}
  this.index = _ => {}
  this.outdex = _ => {}
}

var vsincr = 'p.vs=p.vs+1&131071;'
var vsdecr = 'p.vs=p.vs+131071&131071;'

var codes = {
  '+': vsdecr
     + 'a=p.vs+131071&131071;'
     + 'VS[a]=VS[a]+VS[p.vs];',
  '-': vsdecr
     + 'a=p.vs+131071&131071;'
     + 'VS[a]=VS[a]-VS[p.vs];',
  '*': vsdecr
     + 'a=p.vs+131071&131071;'
     + 'VS[a]=VS[a]*VS[p.vs]>>16;',
  '/': vsdecr
     + 'a=p.vs+131071&131071;'
     + 'VS[a]=VS[p.vs]==0?0:(VS[a]<<16)/VS[p.vs];',
  '%': vsdecr
     + 'a=p.vs+131071&131071;'
     + 'VS[a]=VS[p.vs]==0?0:VS[a]%VS[p.vs];',
  'q': 'a=p.vs+131071&131071;'
     + 'VS[a]=VS[a]>0?Math.sqrt(VS[a]/65536)*65536:0;',
  '&': vsdecr
     + 'a=p.vs+131071&131071;'
     + 'VS[a]=VS[a]&VS[p.vs];',
  '|': vsdecr
     + 'a=p.vs+131071&131071;'
     + 'VS[a]=VS[a]|VS[p.vs];',
  '^': vsdecr
     + 'a=p.vs+131071&131071;'
     + 'VS[a]=VS[a]^VS[p.vs];',
  'r': 'c.right();',
  'l': vsdecr
     + 'a=p.vs+131071&131071;'
     + 'VS[a]=VS[a]<<(VS[p.vs]>>16);',
  '~': 'a=p.vs+131071&131071;'
     + 'VS[a]=~VS[a];',
  's': 'a=p.vs+131071&131071;'
     + 'VS[a]=Math.sin(VS[a]/65536)*65536;',
  'a': vsdecr
     + 'a=p.vs+131071&131071;'
     + 'VS[a]=Math.atan(VS[a]/65536,VS[p.vs]/65536)/(2*Math.PI)*65536;',
  '<': 'a=p.vs+131071&131071;'
     + 'if(VS[a]>0)VS[a]=0;',
  '>': 'a=p.vs+131071&131071;'
     + 'if(VS[a]<0)VS[a]=0;',
  '=': 'a=p.vs+131071&131071;'
     + 'VS[a]=VS[a]==0;',
  'd': 'VS[p.vs]=VS[p.vs+131071&131071];'
     + vsincr,
  'p': vsdecr,
  'x': 'a=p.vs+131071&131071;'
     + 'b=a+131071&131071;'
     + 'c=VS[a];VS[a]=VS[b];VS[b]=c;',
  'v': 'a=p.vs+131071&131071;'
     + 'b=a+131071&131071;'
     + 'c=b+131071&131071;'
     + 'd=VS[a];VS[a]=VS[c];VS[c]=VS[b];VS[b]=d;',

  // todo:
  ')': 'c.pick();',
  '(': 'c.bury();',
  'w': 'c.whereami();',
  'T': 'break;',
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

var isBlank = c => c == ' ' || c == ',' || c == ';' || c == '\n'

function next(state) {
  var c = state.src[state.pos++]

  if (isBlank(c))
    return

  if (c == '\\') {
    while (state.pos < state.len && state.src[state.pos++] != '\n') {}
    return
  }

  state.body += '\ncase ' + (state.inst++) + ':\n'

  if (codes[c]) {
    state.body += codes[c] + '\n'
  }

  // todo: take fractional part into account
  else if (isHexaDecimal(c)) {
    var integer = parseInt(c, 16) << 16
    while(state.pos < state.len && isHexaDecimal(state.src[state.pos]))
      integer = integer << 4 | parseInt(state.src[state.pos++], 16)
    state.body += 'c.loadimm('+integer+');'
  }
  else {
    // switch(c) {
    //   case '?': // if
    //     state.body += 'if(c.if()) {' // not pretty, but eh
    //     eatUntil(state, isEndIf)
    //     state.body += '}'
    //     break
    //   case ':': // else
    //     // to improve, regarding error handling
    //     state.body += ' else {'
    //     eatUntil(state, isEndElse)
    //     state.body += '}'
    //     break
    //   // todo: subroutines and such
    // }
  }
}

J.compile = function(src) {
  var state = {
    src,
    pos: 0,
    inst: 0,
    len: src.length,
    body: '',
  }

  state.body += 'var loop = true;\n'
  state.body += 'var inst = 0;\n'
  state.body += 'var a, b, c, d; \n'
  state.body += 'while(loop) {\n'
  state.body += '\tswitch(inst) {\n'

  while (state.pos < state.len)
    next(state)

  state.body += '\n\t}\n'
  state.body += '\tloop = false;\n'
  state.body += '}'

  return new Function('VS', 'p', state.body)
}

})()
