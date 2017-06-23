(function() {
'use strict'

let J = window.jibniz = {}

// increase/decrease stack pointer
let sincr = 'sn=sn+1&sm;'
let sdecr = 'sn=sn+sm&sm;'

// increase/decrease ret pointer
let rincr = 'rn=rn+1&rm;'
let rdecr = 'rn=rn+rm&rm;'

/*
 * nbst: nb of variables taken on value stack
 * nbrt: nb of variables taken on return stack
 * spv: values pushed on value stack
 * rpv: values pushed on return stack
 * action
 */

function make_instr([ nbst, nbrt, code, spv, rpv ]) {
  return { nbst, nbrt, code, spv, rpv }
}

let instructions = {}

// $n ... $2 $1 --
// #n ... #2 #1 --

;[[ '+', 2, 0, '', ['$1+$2'], [] ],
  [ '-', 2, 0, '', ['$1-$2'], [] ],
  [ '*', 2, 0, '', ['($1/65536)*($2/65536)*65536|0'], [] ],
  [ '/', 2, 0, '', ['$1==0?0:$2*65536/$1'], [] ],
  [ '%', 2, 0, '', ['$1==0?0:$2%$1'], [] ],

  [ 'q', 1, 0, '', ['$1>0?Math.sqrt($1/65536)*65536|0:0'], [] ],

  [ '&', 2, 0, '', ['$1&$2'], [] ],
  [ '|', 2, 0, '', ['$1|$2'], [] ],
  [ '^', 2, 0, '', ['$1^$2'], [] ],
  [ 'r', 2, 0, 'a=$1>>>16;', ['($2>>>a)|($2<<(16-a))'], [] ],
  [ 'l', 2, 0, '', ['$2<<($1>>>16)'], [] ],
  [ '~', 1, 0, '', ['~$1'], [] ],

  [ 's', 1, 0, '', ['Math.sin($1*Math.PI/32768)*65536|0'], [] ],
  [ 'a', 2, 0, '', ['Math.atan2($1/65536,$2/65536)/Math.PI*32768|0'], [] ],

  [ '<', 1, 0, '', ['$1>0?0:$1'], [] ],
  [ '>', 1, 0, '', ['$1<0?0:$1'], [] ],
  [ '=', 1, 0, '', ['($1==0)<<16'], [] ],

  [ 'd', 1, 0, '', ['$1', '$1'], [] ],
  [ 'p', 1, 0, '', [], [] ],
  [ 'x', 2, 0, '', ['$1', '$2'], [] ],
  [ 'v', 3, 0, '', ['$2', '$1', '$3'], [] ],
].map(args => {
  instructions[args.pop()] = make_instr(args)
})

let codes = {

  // pick: i -- val
  // TODO: wrap within stack range
  ')': 'a=sn+sm&sm;'
     + 'S[a]=S[a+sm+1-(S[a]>>16)&sm];',

  // bury: val i --
  '(': sdecr
     + 'a=S[sn]>>16;'
     + sdecr
     + 'S[sn+sm-a&sm]=S[sn];',

  // EXTERIOR LOOP

  // M: mediaswitch

  // whereami
  'w': 'sn=w(sn);',

  // terminate
  'T': 'break;',


  // MEMORY MANIPULATION

  // load: addr -- val
  '@': 'a=sn+sm&sm;'
     + 'b=S[a];'
     + 'S[a]=M[(b>>>16)|((b&0xf)<<16)];',

  // store: val addr --
  '!': 'b=S[sn=sn+sm&sm];'
     + 'a=S[sn=sn+sm&sm];'
     + 'M[(b>>>16)|((b&0xf)<<16)]=a;',

  // PROGRAM CONTROL

  // Conditional Execution

  // if, else, endif
  // TODO: take care of this at parsing
  //       i.e. finding end of scopes

  // Loops
  // loop
  'L': 'a=--R[rn+(rm<<1)&rm];'
     + 'if(a!=0){i=R[rn+rm&rm];continue}'
     + 'else ' + rdecr,

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
  'U': 'S[sn]=U;' + sincr,
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
}

J.compile = function(src) {
  let state = {
    src,
    pos:  0,
    inst: 0,
    len:  src.length,
    body: '',
  }

  state.body += 'let l=true,i=0,{S,R,sm,rm,sn,rn}=o,a,b,c,d;'
  state.body += 'while(l){switch(i){'

  while (state.pos < state.len)
    next(state)

  state.body += '\n}l=false}o.sn=sn;o.rn=rn'

  return new Function('o', 'M', 'w', 'U', state.body)
}

})()
