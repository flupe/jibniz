(function(factory) {
  if (typeof module != 'undefined' && typeof module.exports != 'undefined') {
    module.exports = factory()
  }
  else {
    window.jibniz = factory()
  }
}(function() {

  'use strict'

  // VVUU.YYYY
  let YUVtoHEX = c => {
    let y = c >> 8 & 0xff
    return 0xff000000 | y << 16 | y << 8 | y
  }

  let coord = v => v - 128 << 9


  class Stack {

    constructor(buffer, offset, size) {
      this.buffer = buffer
      this.memory = new Int32Array(buffer, offset << 2, size)
      this.mask = size - 1
      this.top = 0
    }

    push(...values) {
      values.forEach(x => {
        this.memory[this.top] = x
        this.top = this.top + 1 & this.mask
      })
    }

    pop(x) {
      return this.memory[this.top = this.top + this.mask & this.mask]
    }

    peek(n) {
      let r = []
      let p = this.top
      while (n--) {
        p = p + this.mask & this.mask
        r.push(this.memory[p])
      }
      return r
    }

    reset() {
      this.top = 0
    }

    clear() {
      this.memory.fill(0)
    }

  }


  class VM {

    constructor() {
      // let USRDATA = this.USRDATA = new Int32Array(this.buffer,      0, 0xC0000)
      // let ARSTACK = this.ARSTACK = new Int32Array(MEM.buffer, 102400,   16384)
      // let VRSTACK = this.VRSTACK = new Int32Array(MEM.buffer, 104448,   16384)
      // let ASTACK  = this.ASTACK  = new Int32Array(MEM.buffer, 106496,   65536)
      // let VSTACK  = this.VSTACK  = new Int32Array(MEM.buffer, 114688,  131072)

      // let audio = this.audioStack = { S: ASTACK, sn: 0, sm:  65535, R: ARSTACK, rn: 0, rm: 16383 }

      this.memory  = new Uint32Array(1 << 20)
      let buffer = this.buffer = this.memory.buffer

      this.aRStack = new Stack(buffer,  0xC8000,    0x4000)
      this.vRStack = new Stack(buffer,  0xCC000,    0x4000)
      this.aStack  = new Stack(buffer,  0xD0000,    0x1000)
      this.vStack  = new Stack(buffer,  0xE0000,   0x20000)

      this.time = 0
      this.program = null


      let whereami_tyx = (sn) => {
        video.sn = sn
        push(this.time << 16)
        push(coord(y))
        push(coord(x))
        return video.sn
      }
    }

    reset() {
      this.memory.fill(0)
      this.vStack.reset()
      this.vRStack.reset()
      this.time = 0
      // this.program = null
    }

    step() {
      let program = this.program

      if (!(program instanceof Program)) {
        return
      }

      let f = program.fragment

      for (let y = 0; y < 256; y++) {
        for(let x = 0; x < 256; x++) {
          // TODO(flupe): handle both T and TYX modes
          this.vStack.push(this.time << 16, coord(y), coord(x))
          f(this.memory, this.vStack, this.vRStack)
        }
      }

      this.time++
    }

    runOnce(program) {
      let f = program.fragment
      f(this.memory, this.vStack, this.vRStack)
    }

  }


  class Console {

    constructor() {
      let cvs = this.domElement = document.createElement('canvas')
      let ctx = this.ctx = cvs.getContext('2d')

      cvs.width = cvs.height = 256

      this.imageData = this.ctx.createImageData(256, 256)
      this.buffer = new Uint32Array(this.imageData.data.buffer)
      this.running = false
      this.VM = new VM
    }

    run() {
      this.running = true

      let step = () => {
        window.requestAnimationFrame(step)

        this.VM.step()

        this.buffer.forEach((_, k) => {
          let v = this.VM.vStack.memory[k]
          let cy = (v >>> 8) & 255
          this.buffer[k] = 0xff000000 | cy << 16 | cy << 8 | cy
        })

        this.ctx.putImageData(this.imageData, 0, 0)
      }

      window.requestAnimationFrame(step)
    }

  }


  class Program {

    constructor(source) {
      this.fragment = compile(source)
    }

  }

  // increase/decrease stack pointer
  let sincr = 'sn=sn+1&sm;'
  let sdecr = 'sn=sn+sm&sm;'

  // increase/decrease ret pointer
  let rincr = 'rn=rn+1&rm;'
  let rdecr = 'rn=rn+rm&rm;'

  let codes = {

    '+': sdecr
       + 'a=sn+sm&sm;'
       + 'S[a]=S[a]+S[sn];',

    '-': sdecr
       + 'a=sn+sm&sm;'
       + 'S[a]=S[a]-S[sn];',

    '*': sdecr
       + 'a=sn+sm&sm;'
       + 'S[a]=(S[a]/65536)*(S[sn]/65536)*65536|0;',

    '/': sdecr
       + 'a=sn+sm&sm;'
       + 'S[a]=S[sn]==0?0:(S[a]*65536)/S[sn];',

    '%': sdecr
       + 'a=sn+sm&sm;'
       + 'S[a]=S[sn]==0?0:S[a]%S[sn];',

    'q': 'a=sn+sm&sm;'
       + 'S[a]=S[a]>0?Math.sqrt(S[a]/65536)*65536|0:0;',

    '&': sdecr
       + 'a=sn+sm&sm;'
       + 'S[a]=S[a]&S[sn];',

    '|': sdecr
       + 'a=sn+sm&sm;'
       + 'S[a]=S[a]|S[sn];',

    '^': sdecr
       + 'a=sn+sm&sm;'
       + 'S[a]=S[a]^S[sn];',

    'r': sdecr
       + 'a=sn+sm&sm;'
       + 'b=S[sn]>>>16;'
       + 'c=S[a];'
       + 'S[a]=(c>>>b)|(c<<(32-b));',

    'l': sdecr
       + 'a=sn+sm&sm;'
       + 'S[a]=S[a]<<(S[sn]>>>16);',

    '~': 'a=sn+sm&sm;'
       + 'S[a]=~S[a];',

    's': 'a=sn+sm&sm;'
       + 'S[a]=Math.sin(S[a]*Math.PI/32768)*65536;',

    'a': sdecr
       + 'a=sn+sm&sm;'
       + 'S[a]=Math.atan2(S[a]/65536,S[sn]/65536)/Math.PI*32768;',

    '<': 'a=sn+sm&sm;'
       + 'if(S[a]>0)S[a]=0;',

    '>': 'a=sn+sm&sm;'
       + 'if(S[a]<0)S[a]=0;',

    '=': 'a=sn+sm&sm;'
       + 'S[a]=(S[a]==0)<<16;',


    // STACK MANIPULATION

    'd': 'S[sn]=S[sn+sm&sm];'
       + sincr,

    'p': sdecr,

    'x': 'a=sn+sm&sm;'
       + 'b=a+sm&sm;'
       + 'c=S[a];S[a]=S[b];S[b]=c;',

    'v': 'a=sn+sm&sm;'
       + 'b=a+sm&sm;'
       + 'c=b+sm&sm;'
       + 'd=S[a];S[a]=S[c];S[c]=S[b];S[b]=d;',

    // pick: i -- val
    // TODO: wrap within stack range
    ')': 'a=sn+sm&sm;'
       + 'S[a]=S[a+sm-(S[a]>>>16)&sm];',

    // bury: val i --
    '(': sdecr
       + 'a=S[sn]>>16;'
       + sdecr
       + 'S[sn+sm-a&sm]=S[sn];',

    // EXTERIOR LOOP

    // M: mediaswitch
    // w: whereami

    'T': 'break;',


    // MEMORY MANIPULATION

    // load: addr -- val
    '@': 'a=sn+sm&sm;'
       + 'b=S[a];'
       + 'S[a]=M[(b>>>16)|((b&0xF)<<16)];',

    // store: val addr --
    '!': 'b=S[sn=sn+sm&sm];'
       + 'a=S[sn=sn+sm&sm];'
       + 'M[(b>>>16)|((b&0xF)<<16)]=a;',

    // PROGRAM CONTROL

    // Conditional Execution

    // if, else, endif
    // TODO: take care of this at parsing
    //       i.e. finding end of scopes

    // Loops
    // loop
    'L': 'a=--R[rn+(rm<<1)&rm];'
       + 'if(a!=0){i=R[rn+rm&rm];continue}'
       + 'else ' + rdecr + rdecr,

    // index: -- i
    'i': 'S[sn]=R[rn+(rm<<1)&rm];' + sincr,

    // outdex: -- j
    'j': 'S[sn]=R[rn+(rm<<2)&rm];' + sincr,

    // while: cond --
    ']': sdecr
       + 'if(S[sn]!=0){i=R[rn+rm&rm];continue}'
       + 'else ' + rdecr,

    // jump: v --
    'J': sdecr
       + 'i=S[sn];continue;',

    // Subroutines
    // return
    '}': rdecr
       + 'i=R[rn];continue;',

    // Return stack manipulation
    // retaddr: -- val | val --
    'R': rdecr
       + 'S[sn]=R[rb];'
       + sincr,

    // pushtors: val -- | -- val
    'P': sdecr
       + 'R[rn]=S[sn];'
       + rincr,

    // INPUT

    // userin: -- inword
    // 'U': 'S[sn]=U;' + sincr,
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

    else if (isHexaDecimal(c) || c == '.') {
      let imm = 0

      if (c != '.') {
        imm = parseInt(c, 16)

        while (state.pos < state.len && isHexaDecimal(state.src[state.pos]))
          imm = imm << 4 | parseInt(state.src[state.pos++], 16)

        imm <<= 16
        c = state.src[state.pos]
        if (c == '.') state.pos++
      }

      if (c == '.') {
        let i = 0, frac = 0

        for (; i < 4 && isHexaDecimal(state.src[state.pos]); i++)
          frac = frac << 4 | parseInt(state.src[state.pos++], 16) 

        // we ignore the following decimals
        while (state.pos < state.len && isHexaDecimal(state.src[state.pos]))
          state.pos++

        imm |= (frac << (4 - i))
      }

      state.body += 'S[sn]=' + imm + ';' + sincr;
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
                     + 'if(S[sn]==0)break;'
                     + subs.body
        }

        else {
          state.body += sdecr
                     + 'if(S[sn]==0){i=' + subs.inst + ';continue};'
                     + subs.body

          if (subs.src[subs.pos] == ':') {

            subs.pos++
            subs.body = ''

            while (subs.pos < subs.len &&
                   subs.src[subs.pos] != ';' ) {
              next(subs)
            }

            state.body += 'i=' + subs.inst + ';continue;'
                       + subs.body
          }
        }

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
                    + 'M[S[sn]>>16]=' + state.inst + ';'
                    + 'i=' + subs.inst + ';continue;'

        state.pos = subs.pos
        state.body += subs.body
        state.inst = subs.inst
      }

      else if (c == 'V') {
        state.body += sdecr
                    + 'i=M[S[sn]>>16];'
                    + 'R[rn]=' + state.inst + ';'
                    + rincr
                    + 'continue;'
      }

      else if (c == 'X') {
        state.body += sdecr
                    + 'a=S[sn];'
                    + 'R[rn]=(a>>>16)|(a<<16);'
                    + rincr
                    + 'R[rn]=' + state.inst + ';'
                    + rincr
      }

      else if (c == '[') {
        state.body += 'R[rn]=' + state.inst + ';'
                    + rincr
      }
    }
  }

  function compile(src) {
    let state = {
      src,
      pos:  0,
      inst: 0,
      len:  src.length,
      body: '',
    }

    state.body += `
      let l=true,
          i=0,
          S=VS.memory,
          sm=VS.mask,
          sn=VS.top,
          R=RS.memory,
          rm=RS.mask,
          rn=RS.top

       while(l) {
         switch(i) {`

    while (state.pos < state.len)
      next(state)

    state.body += `
         }
         break
       }
       VS.top=sn
       RS.top=rn`

    return new Function('M', 'VS', 'RS', state.body)
  }

  return { Stack, VM, Program, Console }

}))
