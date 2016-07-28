(function() {
'use strict'

var raf = window.requestAnimationFrame
var J = window.jibniz = {}

// VVUU.YYYY
var YUVtoHEX = c => {
  var l = (c >>> 8) & 0xff
  return 0xff000000 | l << 16 | l << 8 | l
}

J.Console = function() {
  var cvs = this.domElement = document.createElement('canvas')
  var ctx = cvs.getContext('2d')

  var MEM     = new Int32Array(1048576)
  var USRDATA = new Int32Array(MEM.buffer, 0, 786432)
  var ARSTACK = new Int32Array(MEM.buffer, 102400, 16384)
  var VRSTACK = new Int32Array(MEM.buffer, 104448, 16384)
  var ASTACK  = new Int32Array(MEM.buffer, 106496, 65536)
  var VSTACK  = new Int32Array(MEM.buffer, 114688, 131072)

  var audio = { S: ASTACK, sn: 0, sm: 65535, R: ARSTACK, rn: 0, rm: 16383 }
  var video = { S: VSTACK, sn: 0, sm: 131071, R: VRSTACK, rn: 0, rm: 16383 }

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
    raf(this.step)
    for (y = 0; y < 256; y++) {
      for(x = 0; x < 256; x++) {
        this.whereami()
        this.program(video)
      }
    }

    var offset = video.sn < 65536 ? 65536 : 0
    for (var i = 65536; i--;)
      buf32[i] = YUVtoHEX(VSTACK[offset + i])

    ctx.putImageData(imageData, 0, 0)
    this.time++
  }.bind(this)

  // tmp: to be deleted
  function push(x) {
    VSTACK[video.sn] = x
    video.sn = video.sn + 1 & 131071
  }

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
}

var sincr = 'o.sn=o.sn+1&sm;'
var sdecr = 'o.sn=o.sn+sm&sm;'
var rincr = 'o.rn=o.rn+1&rm;'
var rdecr = 'o.rn=o.rn+rm&rm;'

var codes = {
  '+': sdecr
     + 'a=o.sn+sm&sm;'
     + 'S[a]=S[a]+S[o.sn];',
  '-': sdecr
     + 'a=o.sn+sm&sm;'
     + 'S[a]=S[a]-S[o.sn];',
  '*': sdecr
     + 'a=o.sn+sm&sm;'
     + 'S[a]=S[a]*S[o.sn]>>16;',
  '/': sdecr
     + 'a=o.sn+sm&sm;'
     + 'S[a]=S[o.sn]==0?0:(S[a]*65536)/S[o.sn];',
  '%': sdecr
     + 'a=o.sn+sm&sm;'
     + 'S[a]=S[o.sn]==0?0:S[a]%S[o.sn];',
  'q': 'a=o.sn+sm&sm;'
     + 'S[a]=S[a]>0?Math.sqrt(S[a]/65536)*65536:0;',
  '&': sdecr
     + 'a=o.sn+sm&sm;'
     + 'S[a]=S[a]&S[o.sn];',
  '|': sdecr
     + 'a=o.sn+sm&sm;'
     + 'S[a]=S[a]|S[o.sn];',
  '^': sdecr
     + 'a=o.sn+sm&sm;'
     + 'S[a]=S[a]^S[o.sn];',
  // rotate shift
  // maybe left shift should also rotate?
  'r': sdecr
     + 'a=o.sn+sm&sm;'
     + 'b=S[o.sn]>>16;'
     + 'c=S[a];'
     + 'S[a]=(c>>b)|(c<<(16-c));',
  'l': sdecr
     + 'a=o.sn+sm&sm;'
     + 'S[a]=S[a]<<(S[o.sn]>>16);',
  '~': 'a=o.sn+sm&sm;'
     + 'S[a]=~S[a];',
  's': 'a=o.sn+sm&sm;'
     + 'S[a]=Math.sin(S[a]*Math.PI/32768)*65536;',
  'a': sdecr
     + 'a=o.sn+sm&sm;'
     + 'S[a]=Math.atan(S[a]/65536,S[o.sn]/65536)/Math.PI*32768;',
  '<': 'a=o.sn+sm&sm;'
     + 'if(S[a]>0)S[a]=0;',
  '>': 'a=o.sn+sm&sm;'
     + 'if(S[a]<0)S[a]=0;',
  '=': 'a=o.sn+sm&sm;'
     + 'S[a]=S[a]==0;',
  'd': 'S[o.sn]=S[o.sn+sm&sm];'
     + sincr,
  'p': sdecr,
  'x': 'a=o.sn+sm&sm;'
     + 'b=a+sm&sm;'
     + 'c=S[a];S[a]=S[b];S[b]=c;',
  'v': 'a=o.sn+sm&sm;'
     + 'b=a+sm&sm;'
     + 'c=b+sm&sm;'
     + 'd=S[a];S[a]=S[c];S[c]=S[b];S[b]=d;',

  // todo: test this thoroughly
  ')': 'a=o.sn+sm&sm;'
     + 'S[a]=S[a+sm+1-(S[a]>>16)&sm]',
  '(': sdecr
     + 'a=S[o.sn]>>16;'
     + sdecr
     + 'S[o.sn+sm-a&sm]=S[o.sn]',
  'w': 'c.whereami();',
  'T': 'break;',
  '@': 'a=o.sn+sm&sm;'
     + 'b=S[a];'
     + 'S[a]=MM[(b>>>16)|((b&0xf000)<<4)]',
  '!': 'c.store();',
  'i': 'c.index();',
  'j': 'c.outdex();',
  'R': 'c.retaddr();',
  'P': 'c.pushtors();',
  'J': sdecr
     + 'i=S[o.sn];continue;'
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

  state.body += '\ncase ' + (state.inst++) + ':'

  if (codes[c]) {
    state.body += codes[c]
  }

  // todo: take fractional part into account
  else if (isHexaDecimal(c)) {
    var integer = parseInt(c, 16) << 16
    while(state.pos < state.len && isHexaDecimal(state.src[state.pos]))
      integer = integer << 4 | parseInt(state.src[state.pos++], 16)
    state.body += 'S[o.sn]='+integer+';' + sincr;
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

  state.body += 'var l=true,i=0,S=o.S,R=o.R,sm=o.sm,rm=o.rm,a,b,c,d;'
  state.body += 'while(l){switch(i){'

  while (state.pos < state.len)
    next(state)

  state.body += '\n}l=false}'

  return new Function('o', state.body)
}

})()
