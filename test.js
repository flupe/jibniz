let bc = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]

// TYPE SECTION
bc.push(1)
bc.push(6)
bc.push(1, 0x60, 1, 0x7f, 1, 0x7f)

// FUNCTION SECTION
bc.push(3)
bc.push(2)
bc.push(1, 0)

// EXPORT (a)
bc.push(7)
bc.push(5)
bc.push(1, 1, 0x61, 0x00, 0)

// CODE SECTION
bc.push(10)
bc.push(7)
bc.push(1)    // code section size
bc.push(5)    // code size
bc.push(0)    // locals size
bc.push(0x20, 0, 0x68, 0x0b)

console.log(...bc)
let mem = new Uint8Array(bc)

WebAssembly.instantiate(mem, {})
  .then(program => console.log(program.instance.exports.a(16)))


// LEB128 encoding
function push32(bc, i) {
  var b
  while(true) {
    b = i & 7
    i >>= 7
    if (i) {
      b |= 7
      bc.push(b)
    }
    else return bc.push(b)
  }
}

