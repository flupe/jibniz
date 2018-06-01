const $ = document.getElementById.bind(document)
const cvs = $('cvs')
const field = $('input')
const selection = $('selection')
const fps = $('fps')
const time = $('time')

class Editor extends jibniz.Console {
  step() {
    jibniz.Console.prototype.step.call(this)
    fps.innerText = ('0000' + this.fps.toString().toUpperCase()).substr(-4)
    time.innerText = ('0000' + this.time.toString(16).toUpperCase()).substr(-4)
  }
}
const IBNIZ = new Editor(cvs)

field.value = selection.value

selection.addEventListener('change', () => {
  field.value = selection.value
  IBNIZ.VM.program = new jibniz.Program(field.value)
  IBNIZ.reset()
})

field.addEventListener('input', () => {
  IBNIZ.VM.program = new jibniz.Program(field.value)
})

IBNIZ.VM.program = new jibniz.Program(field.value)

/*
  \\ static mandelbrot set
  \\ 1l0!1l1!0d2!3!p
  \\ EX3@d2@*1l1@+3!d*d2@d*dv-0@+2!+4-<?L0:i;F^4r

  \\ julia sets morpher
  \\ 1l2!1l3!10rdF2*s0!F9*s1!EX3@d2@*1l1@+3!d*d2@d*dv-0@+2!+4-<?L0:i;F^4r

  \\ interactive julia sets
  Ud8l2X.FF&.8-xL4X1l4i-!LpEX3@d2@*1l1@+3!d*d2@d*dv-0@+2!+4-<?L0:i;F^4r
  */

IBNIZ.run()
