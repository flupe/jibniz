(function() {
'use strict'

let raf = window.requestAnimationFrame
let J = window.jibniz = {}

// VVUU.YYYY
let YUVtoHEX = c => {
  let l = (c >>> 8) & 0xff
  return 0xff000000 | l << 16 | l << 8 | l
}

J.Console = function() {
  let cvs = this.domElement = document.createElement('canvas')
  let ctx = cvs.getContext('2d')

  let MEM     = new Int32Array(1048576)
  let USRDATA = new Int32Array(MEM.buffer, 0, 786432)
  let ARSTACK = new Int32Array(MEM.buffer, 102400, 16384)
  let VRSTACK = new Int32Array(MEM.buffer, 104448, 16384)
  let ASTACK  = new Int32Array(MEM.buffer, 106496, 65536)
  let VSTACK  = new Int32Array(MEM.buffer, 114688, 131072)

  let audio = { S: ASTACK, sn: 0, sm: 65535, R: ARSTACK, rn: 0, rm: 16383 }
  let video = { S: VSTACK, sn: 0, sm: 131071, R: VRSTACK, rn: 0, rm: 16383 }

  cvs.width = cvs.height = 256
  let imageData = ctx.createImageData(256, 256)
  let buf32 = new Uint32Array(imageData.data.buffer)

  this.time = 0
  // position of the current fragment
  let x = 0, y = 0

  this.run = function() {
    raf(this.step)
  }

  this.step = function() {
    raf(this.step)
    for (y = 0; y < 256; y++) {
      for(x = 0; x < 256; x++) {
        this.whereami()
        this.program(video, MEM)
      }
    }

    let offset = video.sn < 65536 ? 65536 : 0
    for (let i = 65536; i--;)
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
  let coord = v => {
    let s = Math.sign(v - 128)
    let r = Math.abs(v - 128)
    return (r << 9) * s
  }

  this.whereami = _ => {
    // for now, assuming video mode
    push(this.time << 16)
    push(coord(y))
    push(coord(x))
  }
}

// increase/decrease stack pointer
let sincr = 'o.sn=o.sn+1&sm;'
let sdecr = 'o.sn=o.sn+sm&sm;'

// increase/decrease ret pointer
let rincr = 'o.rn=o.rn+1&rm;'
let rdecr = 'o.rn=o.rn+rm&rm;'

let codes = {

  // ARITHMETIC

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

  // square root
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

  // sin
  's': 'a=o.sn+sm&sm;'
     + 'S[a]=Math.sin(S[a]*Math.PI/32768)*65536;',

  // atan
  'a': sdecr
     + 'a=o.sn+sm&sm;'
     + 'S[a]=Math.atan2(S[a]/65536,S[o.sn]/65536)/Math.PI*32768;',

  '<': 'a=o.sn+sm&sm;'
     + 'if(S[a]>0)S[a]=0;',

  '>': 'a=o.sn+sm&sm;'
     + 'if(S[a]<0)S[a]=0;',

  '=': 'a=o.sn+sm&sm;'
     + 'S[a]=(S[a]==0)<<16;',


  // STACK MANIPULATION

  // dup: a -- a a
  'd': 'S[o.sn]=S[o.sn+sm&sm];'
     + sincr,

  // pop: a --
  'p': sdecr,

  // exchange: a b -- b a
  'x': 'a=o.sn+sm&sm;'
     + 'b=a+sm&sm;'
     + 'c=S[a];S[a]=S[b];S[b]=c;',

  // trirot: a b c -- b c a
  'v': 'a=o.sn+sm&sm;'
     + 'b=a+sm&sm;'
     + 'c=b+sm&sm;'
     + 'd=S[a];S[a]=S[c];S[c]=S[b];S[b]=d;',

  // pick: i -- val
  // TODO: wrap within stack range
  ')': 'a=o.sn+sm&sm;'
     + 'S[a]=S[a+sm+1-(S[a]>>16)&sm];',

  // bury: val i --
  '(': sdecr
     + 'a=S[o.sn]>>16;'
     + sdecr
     + 'S[o.sn+sm-a&sm]=S[o.sn];',

  // EXTERIOR LOOP

  // M: mediaswitch

  // whereami
  'w': '',

  // terminate
  'T': 'break;',


  // MEMORY MANIPULATION

  // load: addr -- val
  '@': 'a=o.sn+sm&sm;'
     + 'b=S[a];'
     + 'S[a]=MM[(b>>>16)|((b&0xf)<<16)];',

  // store: val addr --
  '!': '',


  // PROGRAM CONTROL

  // Conditional Execution

  // if, else, endif
  // TODO: take care of this at parsing
  //       i.e. finding end of scopes

  // Loops
  // times: i0 --
  'X': '',

  // loop
  'L': '',

  // index: -- i
  'i': '',

  // outdex: -- j
  'j': '',

  // do
  '[': '',

  // while: cond --
  ']': '',

  // jump: v --
  'J': sdecr
     + 'i=S[o.sn];continue;',

  // Subroutines
  // return
  '}': rdecr
     + 'i=R[o.rn];continue;',

  // Return stack manipulation
  // retaddr: -- val | val --
  'R': '',

  // pushtors: val -- | -- val
  'P': '',

  // INPUT

  // userin: -- inword
  'U': '',
}

function eatUntil(state, check) {
  while(state.pos < state.len && !check(state.src[state.pos]))
    next(state)
}

let isHexaDecimal = c => {
  return !isNaN(c) || c == 'A' || c == 'B' || c == 'C'
                   || c == 'D' || c == 'E' || c == 'F'
}

let isBlank = c => c == ' ' || c == ',' || c == ';' || c == '\n'

function next(state) {
  let c = state.src[state.pos++]

  if (isBlank(c))
    return

  // comments
  if (c == '\\') {
    while (state.pos < state.len && state.src[state.pos++] != '\n') {}
    return
  }

  state.body += '\ncase ' + (state.inst++) + ':'

  if (codes[c]) {
    state.body += codes[c]
  }

  // TODO: take fractional part into account
  else if (isHexaDecimal(c)) {
    let integer = parseInt(c, 16) << 16
    while(state.pos < state.len && isHexaDecimal(state.src[state.pos]))
      integer = integer << 4 | parseInt(state.src[state.pos++], 16)
    state.body += 'S[o.sn]='+integer+';' + sincr;
  }

  else {
    if (c == '?') {
      let subs = {
        src:  state.src,
        pos:  state.pos,
        inst: state.inst,
        len:  state.len,
        body: '',
      }

      while (subs.pos < subs.len &&
             subs.src[subs.pos] != ':' &&
             subs.src[subs.pos] != ';') {
        next(subs)
      }

      // EOF is the end of scope
      if (subs.pos >= subs.len) {
        state.body += sdecr
                   + 'if(S[o.sn]==0)break;'
      }

      else {
        state.body += sdecr
                   + 'if(S[o.sn]==0){i=' + subs.inst + ';continue};'

        // else
        if (subs.src[subs.pos] == ':') {
          subs.pos++
          while (subs.pos < subs.len &&
                 subs.src[subs.pos] != ';' ) {
            next(subs)
          }
        }
      }

      state.body += subs.body
      state.inst = subs.inst
      state.pos  = subs.pos
    }

    else if (c == '{') {
      let subs = {
        src:  state.src,
        pos:  state.pos,
        inst: state.inst,
        len:  state.len,
        body: '',
      }

      while (subs.pos < subs.len && subs.src[subs.pos] != '}') {
        next(subs)
      }

      if (subs.pos < subs.len)
        next(subs)

      state.body += sdecr
                  + 'M[S[o.sn]>>16]=' + state.inst + ';'
                  + 'i=' + subs.inst + ';continue;'

      state.pos = subs.pos + 1
      state.body += subs.body
      state.inst = subs.inst
    }

    else if (c == 'V') {
      state.body += sdecr
                  + 'i=M[S[o.sn]>>16];'
                  + 'R[o.rn]=' + state.inst + ';'
                  + rincr
                  + 'continue;'
    }
  }
}

J.compile = function(src) {
  let state = {
    src,
    pos:  0,
    inst: 0,
    len:  src.length,
    body: '',
  }

  state.body += 'let l=true,i=0,S=o.S,R=o.R,sm=o.sm,rm=o.rm,a,b,c,d;'
  state.body += 'while(l){switch(i){'

  while (state.pos < state.len)
    next(state)

  state.body += '\n}l=false}'

  return new Function('o', 'M', state.body)
}

})()
