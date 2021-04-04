const $ = document.getElementById.bind(document)
const on = (t, e, f) => t.addEventListener(e, f, false)
const $cvs       = $('cvs')
const $input     = $('input')
const $selection = $('selection')
const $fps       = $('fps')
const $time      = $('time')

const format = (x, b = 10) => x.toString(b).toUpperCase()

class Editor extends jibniz.Console {
  step() {
    super.step()
    fps.innerText  = ('0000' + format(this.fps     )).substr(-4)
    time.innerText = ('0000' + format(this.time, 16)).substr(-4)
  }

  install(program) {
    this._program = program
    super.install(program)
  }

  reset() {
    super.reset()
    if (this._program) super.install(this._program)
    if (!this.running) super.step()
  }
}

const IBNIZ = new Editor(cvs)

// set text to possibly selected value
if ($input.value == '') $input.value = $selection.value

on($selection, 'change', () => {
  $input.value = $selection.value
  IBNIZ.reset()
  IBNIZ.install(new jibniz.Program($input.value))
  if (!IBNIZ.running) IBNIZ.run()
})

// TODO: debounce
on($input, 'input', () => {
  IBNIZ.install(new jibniz.Program($input.value))
})

on($('reset'), 'click', () => { IBNIZ.reset()  })
on($('pause'), 'click', () => { IBNIZ.toggle() })

IBNIZ.install(new jibniz.Program($input.value))
IBNIZ.run()
