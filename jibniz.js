(function(factory) {
  if (typeof module != 'undefined' && typeof module.exports != 'undefined') {
    module.exports = factory()
  }
  else {
    window.jibniz = factory()
  }
}(function() {

  'use strict'

  const coord = v => v - 128 << 9

  // In the official IBNIZ documentation, it states
  // - the audio stack is 65536 words long
  // - regardless of sampling rate, audio stack is one second long
  // - default sampling rate is 61440
  // to make it easier, we set the sampling rate to the length of the stack
  const SAMPLE_RATE = 65536

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

    reset() { this.top = 0 }
    clear() { this.memory.fill(0) }

  }

  class VM {

    constructor() {
      this.memory  = new Int32Array(1 << 20)

      let buffer = this.buffer = this.memory.buffer

      this.aRStack = new Stack(buffer,  0xC8000,    0x4000)
      this.vRStack = new Stack(buffer,  0xCC000,    0x4000)
      this.aStack  = new Stack(buffer,  0xD0000,   0x10000)
      this.vStack  = new Stack(buffer,  0xE0000,   0x20000)

      this.time = 0
      this.mode = 'T'
      this.fragments = null
    }

    reset() {
      this.memory.fill(0)
      this.vStack.reset()
      this.vRStack.reset()
      this.aStack.reset()
      this.aRStack.reset()
      this.time = 0
    }

    step(userin = 0) {
      if (!this.fragments) return

      let f = this.fragments.video[this.mode]
      if (this.mode == 'TYX') {
        for (let y = 0; y < 256; y++) {
          for(let x = 0; x < 256; x++) {
            // TODO(flupe): handle both T and TYX modes
            this.vStack.push(this.time << 16, coord(y), coord(x))
            f(this.memory, this.vStack, this.vRStack, this.time << 16, coord(x), coord(y), userin)
          }
        }
      }
      else {
        for (let y = 0; y < 256; y++) {
          for(let x = 0; x < 256; x++) {
            // TODO(flupe): handle both T and TYX modes
	    let w = this.time << 16 | y << 8 | x
            this.vStack.push(w)
            f(this.memory, this.vStack, this.vRStack, w, userin)
          }
        }
      }

      // HACKY
      // update audio every second
      // 60 frames per second
      // 0x1000 samples per second
      // 0x1000 / 60 samples per frame
      if (this.time % 60 == 0) {
	let t = this.time
        let f = this.fragments.audio
        for (let k = 0; k < 0x10000; k++) {
	  let v = (k * 60) & 0xffff
          let t = this.time + (k * 60 / 0x10000) | 0
	  let w = (t << 16) | v
          this.aStack.push(w)
          f(this.memory, this.aStack, this.aRStack, w, userin)
        }
      }

      this.time++
    }

  }


  class Console extends VM {

    constructor(cvs) {
      super()

      cvs = this.domElement = cvs || document.createElement('canvas')
      cvs.width = cvs.height = 256

      this.running = false

      this.videoPages = [
        new Uint8Array(this.buffer, 0xE0000 << 2, 0x40000),
        new Uint8Array(this.buffer, 0xF0000 << 2, 0x40000),
      ]

      this.x = 128
      this.y = 128
    }

    async init() {
      let gl = this.gl = cvs.getContext('webgl')

      function loadShader(src, type) {
        let shader = gl.createShader(type)
        gl.shaderSource(shader, src)
        gl.compileShader(shader)

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          let error = `Error occured while compiling shader: ${gl.getShaderInfoLog(shader)}`
          gl.deleteShader(shader)
          throw error
        }

        return shader
      }

      let vertSrc = `
        attribute vec2 pos;
        varying lowp vec2 uv;

        void main() {
          gl_Position = vec4(pos, 0.0, 1.0);
          uv = vec2((pos.x + 1.0) / 2.0, (1.0 - pos.y) / 2.0);
        }
      `

      let fragSrc = `
        precision lowp float;

        varying lowp vec2 uv;
        uniform sampler2D page;

        void main() {
          vec4 tex = texture2D(page, uv);
          float y = tex.g;
          float u = tex.b <= 0.5 ? tex.b : -(1.0 - tex.b);
          float v = tex.a <= 0.5 ? tex.a : -(1.0 - tex.a);

          y = 1.1643 * (y - 0.0625);

          float r = clamp(y+1.5958*v, 0.0, 1.0);
          float g = clamp(y-0.39173*u-0.81290*v,0.0, 1.0);
          float b = clamp(y+2.017*u, 0.0, 1.0);

          gl_FragColor = vec4(r,g,b,1.0);
        }
      `

      let vert = loadShader(vertSrc, gl.VERTEX_SHADER)
      let frag = loadShader(fragSrc, gl.FRAGMENT_SHADER)

      let prog = this.program = gl.createProgram()

      gl.attachShader(prog, vert)
      gl.attachShader(prog, frag)
      gl.linkProgram(prog)

      let posAttribLoc = gl.getAttribLocation(prog, 'pos')
      let positions    = gl.createBuffer()

      gl.bindBuffer(gl.ARRAY_BUFFER, positions);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          1.0,  1.0,
         -1.0,  1.0,
          1.0, -1.0,
         -1.0, -1.0,
      ]), gl.STATIC_DRAW)

      gl.vertexAttribPointer(posAttribLoc, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(posAttribLoc)

      let tex = this.texture = gl.createTexture()
      let texLoc = gl.getUniformLocation(prog, 'page')

      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

      gl.useProgram(prog)
      gl.uniform1i(texLoc, 0)

      // wip audio
      let actx = this.audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE })
      await actx.audioWorklet.addModule('processor.js')
      this.audioGain = actx.createGain()
      this.audioProcessor = new AudioWorkletNode(actx, 'processor')
      this.audioProcessor.connect(this.audioGain)
      this.audioGain.connect(actx.destination)

      this.domElement.addEventListener('mousemove', e => {
        let x = e.pageX
        let y = e.pageY
        let elem = this.domElement

        do {
          x -= elem.offsetLeft
          y -= elem.offsetTop
        }
        while(elem = elem.offsetParent)

        this.x = x
        this.y = y
      })
    }

    run() {
      this.running = true
      this.init = this.time
      this.audioGain.gain.setValueAtTime(1, this.audioCtx.currentTime)

      this.start = performance.now()
      let last = this.start

      let step = () => {
        if (!this.running) return

        window.requestAnimationFrame(step)

        let now = performance.now()
        let elapsed = now - this.start
        let dt = (now - last) / 1000

        last = now

        this.fps = (1 / dt) | 0
        this.time = this.init + (elapsed / 1000) * 60 & 0xffff
        this.step()
      }

      window.requestAnimationFrame(step)
    }

    pause()  {
      this.running = false
      this.audioGain.gain.setValueAtTime(0, this.audioCtx.currentTime)
    }

    toggle() {
      if (this.running) this.pause()
      else this.run()
    }

    step() {
      super.step(this.y << 8 | this.x)
      let video = this.videoPages[(this.vStack.top >> 16) ^ 1]
      let gl    = this.gl
      gl.bindTexture(gl.TEXTURE_2D, this.texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, video)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      // HACKY
      if (this.time % 60 == 1) {
	this.audioProcessor.port.postMessage(this.aStack.memory)
      }
    }

    reset() {
      this.time = 0
      this.init = 0
      this.start = performance.now()
      super.reset()
    }

    install(program) {
      this.fragments = program.fragments
      this.memory.set(program.data.mem)
    }

  }


  class Program {
    constructor(source) {
      let { fragments, data } = compile(source)
      this.fragments = fragments
      this.data     = data
    }
  }

  let sincr = 'sn=sn+1&sm;'
  let sdecr = 'sn=sn+sm&sm;'

  let rincr = 'rn=rn+1&rm;'
  let rdecr = 'rn=rn+rm&rm;'

  let whereami = {
    tyx: 'S[sn]=t;'
       + 'S[sn=sn+1&sm]=y;'
       + 'S[sn=sn+1&sm]=x;'
       + sincr,
    t: 'S[sn]=t;'
     + sincr,
  }

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
       + 'S[a]=Math.atan2(S[sn]/65536,S[a]/65536)/Math.PI*32768;',

    '<': 'a=sn+sm&sm;'
       + 'if(S[a]>0)S[a]=0;',

    '>': 'a=sn+sm&sm;'
       + 'if(S[a]<0)S[a]=0;',

    '=': 'a=sn+sm&sm;'
       + 'S[a]=(S[a]==0)<<16;',

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

    ')': 'a=sn+sm&sm;'
       + 'S[a]=S[a+sm-(S[a]>>>16)&sm];',

    '(': sdecr
       + 'a=S[sn]>>16;'
       + sdecr
       + 'S[sn+sm-a&sm]=S[sn];',

    'T': 'break;',

    '@': 'a=sn+sm&sm;'
       + 'b=S[a];'
       + 'S[a]=M[(b>>>16)|(b<<16)];',

    '!': 'b=S[sn=sn+sm&sm];'
       + 'a=S[sn=sn+sm&sm];'
       + 'M[(b>>>16)|(b<<16)]=a;',

    'L': 'a=--R[rn+(rm<<1)&rm];'
       + 'if(a!=0){i=R[rn+rm&rm];continue}'
       + 'else ' + rdecr + rdecr,

    'i': 'a=R[rn+(rm<<1)&rm];'
       + 'S[sn]=(a>>>16)|(a<<16);' + sincr,

    'j': 'a=R[rn+(rm<<2)&rm];'
       + 'S[sn]=(a>>>16)|(a<<16);' + sincr,

    ']': sdecr
       + 'if(S[sn]!=0){i=R[rn+rm&rm];continue}'
       + 'else ' + rdecr,

    'J': sdecr
       + 'i=S[sn];continue;',

    '}': rdecr
       + 'i=R[rn];continue;',

    'R': rdecr
       + 'S[sn]=R[rn];'
       + sincr,

    'P': sdecr
       + 'R[rn]=S[sn];'
       + rincr,

    'U': 'S[sn]=U;' + sincr,
  }

  let hexchars = "0123456789ABCDEF".split('')
  let isHexaDecimal = c => hexchars.includes(c)

  let isBlank = c => c == ' ' || c == ',' || c == '\n'

  let dataModes = {
    b: { len: 1, mask:  1 },
    q: { len: 2, mask:  3 },
    o: { len: 3, mask:  7 },
    h: { len: 4, mask: 15 },
  }

  function parse(src) {
    let pos  = 0
    let len  = src.length
    let body = []
    let video = null
    let audio = null
    let c

    let data = []
    let currentValues = []
    let currentMode = dataModes.h

    while(pos < len) {
      c = src[pos++]

      if (isBlank(c))
        continue

      if (c == '\\') {
        while (pos < len && src[pos++] != '\n') {}
        continue
      }

      else if (isHexaDecimal(c) || c == '.') {
        let imm = 0

        if (c != '.') {
          imm = parseInt(c, 16)

          while (pos < len && isHexaDecimal(src[pos]))
            imm = (imm & 0xffff) << 4 | parseInt(src[pos++], 16)

          imm <<= 16
          c = src[pos]

          if (c == '.') pos++
        }

        if (c == '.') {
          let i = 4, frac = 0

          for (;i > 0 && isHexaDecimal(src[pos]); i--)
            frac = frac << 4 | parseInt(src[pos++], 16) 

          while (pos < len && isHexaDecimal(src[pos]))
            pos++

          imm |= frac << (i << 2)
        }

        body.push(imm)
      }

      // parsing data segment
      else if (c == '$') {
        while (pos < len) {
          c = src[pos++]
	  if (dataModes[c]) {
	    if (currentValues.length) {
                data.push({ mode: currentMode, values: currentValues })
	        currentValues = []
	    }
	    currentMode   = dataModes[c]
	  }
	  else if (isHexaDecimal(c)) {
            currentValues.push(parseInt(c, 16) & currentMode.mask)
	  }
	}
	break
      }

      else if (c == 'M') {
        video = body
	body = []
      }

      else body.push({ op: c, pos: pos - 1 })
    }

    if (video) {
      audio = body
      findSkips(video)
      findSkips(audio)
    }
    else {
      video = audio = body
      findSkips(body)
    }

    data.push({ mode: currentMode, values: currentValues })
    return { video, audio, data }
  }

  function findSkips(tokens) {
    let len = tokens.length

    // find skip points
    for (let i = 0; i < len; i++) {
      let t = tokens[i]

      if (typeof t == 'number')
        continue

      let c = t.op
      let seek0 = null
      let seek1 = null

      if (c == '?') {
        seek0 = ':'
        seek1 = ';'
      }

      if (c == ':') { seek0 = ';' }
      if (c == '{') { seek0 = '}' }

      if (seek0) {
        for (let j = i + 1; j < len; j++) {
          let c = tokens[j]
          if (typeof c != 'number' && (c.op == seek0 || c.op == seek1)) {
            t.skip = j + 1
            break
          }
        }
      }
    }
  }

  function compile(src) {
    let { video, audio, data } = parse(src)
	
    let nbits  = data.reduce((n , {values, mode}) => n + values.length * mode.len, 0)
    let nbytes = (nbits + 7) >> 3

    // hack because of endianness
    let mem = new Uint32Array(new ArrayBuffer(nbytes))
    let cb = 0, cv = 0, cl = 0

    data.forEach(({values, mode}) => {
      values.forEach(v => {
        cv = cv << mode.len | v
	cl += mode.len
	if (cl > 32) {
          mem[cb++] = cv >> (cl -= 32)
	}
      })
    })

    mem[cb] = cv << (32 - cl)

    let videoTYX = codegen(video, whereami.tyx)
    let videoT   = codegen(video, whereami.t  )
    let audioT   = codegen(audio, whereami.t  )

    return {
      fragments: {
        video: {
	  T:   new Function('M', 'VS', 'RS', 't', 'U', videoT),
          TYX: new Function('M', 'VS', 'RS', 't', 'x', 'y', 'U', videoTYX),
	},
	audio: new Function('M', 'VS', 'RS', 't', 'U', audioT),
      },
      data: { mem, nbits },
    }
  }

  function codegen(tokens, whereami) {
    let body = `
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

    let len = tokens.length

    let instructions = tokens.map((tok, k) => {
      let sub = `\ncase ${k}:`

      if (typeof tok == 'number')
        sub += 'S[sn]=' + tok + ';' + sincr

      else if (codes[tok.op]) sub += codes[tok.op]
      else if (tok.op == 'w') sub += whereami
      else if (tok.op == '?') {
        if (!tok.skip) 
          sub += sdecr
              + 'if(S[sn]==0)break;'
        else
          sub += sdecr
              + `if(S[sn]==0){i=${tok.skip};continue};`
      }

      else if (tok.op == ':') {
        if (!tok.skip) sub = 'break;' + sub
        else           sub = `i=${tok.skip};continue;` + sub
      }

      else if (tok.op == '{') {
        if (!tok.skip)
          sub += sdecr
              + 'M[S[sn]>>16]=' + (k + 1) + ';break;'
        else
          sub += sdecr
              + 'M[S[sn]>>16]=' + (k + 1) + ';'
              + `i=${tok.skip};continue;`
      }

      else if (tok.op == 'V') {
        sub += sdecr
            + 'i=M[S[sn]>>16];'
            + `R[rn]=${k + 1};`
            + rincr
            + 'continue;'
      }

      else if (tok.op == 'X') {
        sub += sdecr
            + 'a=S[sn];'
            + 'R[rn]=(a>>>16)|(a<<16);'
            + rincr
            + 'R[rn]=' + (k + 1) + ';'
            + rincr
      }

      else if (tok.op == '[') {
        sub += 'R[rn]=' + (k + 1) + ';'
            + rincr
      }

      else return ''

      return sub
    })

    body += instructions.join('')

    body += `
         }
         break
       }
       VS.top=sn
       RS.top=rn`

    return body
  }

  return { Stack, VM, Program, Console }

}))
