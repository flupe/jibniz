let J = window.jibniz = {}

J.Console = function() {
  // memory is accessible via 20-bit wide address
  let MEM     = new Int32Array(1 << 20)
  let USRDATA = new Int32Array(MEM.buffer, 0, 0xC0000)
  let ARSTACK = new Int32Array(MEM.buffer, 102400, 16384)
  let VRSTACK = new Int32Array(MEM.buffer, 104448, 16384)
  let ASTACK  = new Int32Array(MEM.buffer, 106496, 65536)
  let VSTACK  = new Int32Array(MEM.buffer, 114688, 131072)

  let audio = { S: ASTACK, sn: 0, sm:  65535, R: ARSTACK, rn: 0, rm: 16383 }
  let video = { S: VSTACK, sn: 0, sm: 131071, R: VRSTACK, rn: 0, rm: 16383 }
}

// get stack pointer

function LEB128(v) {
  let e = [], b
  while (true) {
    b = v & 255
    v >>= 7
    if (v) {
      b |= 128
      e.push(b)
    }
    else {
      e.push(b)
      return e
    }
  }
}

let codes = {
  '+': [],
  '-': [],
  '*': [],
  '/': [],
  '%': [],
  'q': [],

  '&': [],
  '|': [],
  '^': [],
  'r': [],
  'l': [],
  '~': [],

  's': [],
  'a': [],

  '<': [],
  '>': [],
  '=': [],

  'd': [],
  'p': [],
  'x': [],
  'v': [],
  ')': [],
  '(': [],

  'T': [],
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

  if (codes[c]) {
    if (state.instrs.has(c)) {
      state.instrs.get(c).count++
    }
    else {
      state.instrs.set(c, {
        code: codes[c],
        count: 1
      })
    }
  }
  else
    // state.body.push(0x02, 0x40, 0x01, 0x0b)

  return;

  if (codes[c]) {

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
      }

      else {
        state.body += sdecr
                   + 'if(S[sn]==0){i=' + subs.inst + ';continue};'

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
                  + 'M[S[sn]>>16]=' + state.inst + ';'
                  + 'i=' + subs.inst + ';continue;'

      state.pos = subs.pos + 1
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
                  + 'R[rn]=S[sn];'
                  + rincr
                  + 'R[rn]=' + state.inst + ';'
                  + rincr
    }

    else if (c == '[') {
      state.body += 'R[rn]=' + state.inst + ';'
                  + rincr
    }
  }

  // end instruction block
}

J.compile = function(src) {
  let bc = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]

  // 1. TYPES
  bc.push(1)
  bc.push(4)
  bc.push(1, 0x60, 0, 0) // void -> void

  // 2. IMPORTS
  // 3. FUNCTIONS
  bc.push(3)
  bc.push(3)
  bc.push(2, 0, 0)

  // 4. TABLE
  // 5. MEMORY
  bc.push(5)
  bc.push(3)
  // 4 pages needed to store a 256x256 words vector
  bc.push(1, 0x00, 4)

  // 6. GLOBALS
  bc.push(6)
  bc.push(6)
  bc.push(1)
  bc.push(0x7f, 0x01)    // mutable i32 stack pointer
  bc.push(0x41, 0, 0x0b) // initialized to 0

  // 7. EXPORTS
  bc.push(7)
  bc.push(22)
  bc.push(3)
  bc.push(3, 0x6d, 0x65, 0x6d) // mem
  bc.push(0x02, 0)
  bc.push(4, 0x73, 0x74, 0x65, 0x70) // step
  bc.push(0x00, 0)
  bc.push(5, 0x72, 0x65, 0x73, 0x65, 0x74) // reset
  bc.push(0x00, 1)

  // 8. START
  // 9. ELEMENT
  // 10. CODE
  bc.push(10)

  let codes = [
    [0, 0x01, 0x0b],
    [0, 0x01, 0x0b]
  ]

  let code = codes.reduce((acc, code) => {
    acc.push(...LEB128(code.length), ...code)
    return acc
  }, [codes.length])

  bc.push(...LEB128(code.length), ...code)

  let state = {
    src,
    pos:  0,
    inst: 0,
    len:  src.length,
    instrs: new Map(),
  }

  while (state.pos < state.len)
    next(state)

  let body = []

  // bc.push(body.length + 4, 1, body.length + 2, 0, ...body, 0x0b)

  // 11. DATA

  console.log(bc.length)
  return WebAssembly.instantiate(new Uint8Array(bc), {})
}
