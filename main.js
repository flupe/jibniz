const $ = document.getElementById.bind(document)
const on = (t, e, f) => t.addEventListener(e, f, false)
const $form      = document.forms.editor
const $input     = $('input')
const $selection = $('selection')
const $fps       = $('fps')
const $time      = $('time')
const query      = new URLSearchParams(window.location.hash.substr(1))

const format = (x, b = 10) => x.toString(b).toUpperCase()

class Editor extends jibniz.Console {
  constructor(cvs, query) {
    super(cvs)

    // initial mode
    if (query.has('m')) this.mode = query.get('m')
    else this.mode = $form.elements.mode.value

    // initial program
    if (query.has('c')) $input.value = query.get('c')
    else $input.value = $selection.value

    this.query = query
    this.changeProgram($input.value)
  }

  step() {
    super.step()
    $fps.innerText  = ('0000' + format(this.fps     )).substr(-4)
    $time.innerText = ('0000' + format(this.time, 16)).substr(-4)
  }

  install(program) {
    this._program = program
    super.install(program)
  }

  changeProgram(code) {
    this.reset()
    this.install(new jibniz.Program(code))
    this.query.set('c', code)
    this.updateHash()
  }

  reset() {
    super.reset()
    if (this._program) super.install(this._program)
    // if (!this.running) super.step()
  }

  updateHash() {
    this.query.set('m', this.mode)
    window.location.hash = '#' + this.query.toString()
  }
}

const IBNIZ = new Editor($('cvs'), query)

IBNIZ.init().then(() => {
  $form.elements.mode.forEach(i => on(i, 'change', () => {
    IBNIZ.mode = $form.elements.mode.value
    IBNIZ.updateHash()
  }))
  
  // set text to possibly selected value
  on($selection, 'change', () => {
    $input.value = $selection.value
    IBNIZ.changeProgram($input.value)
  })
  
  // TODO: debounce
  on($input, 'input', () => { IBNIZ.changeProgram($input.value) })
  on($('reset'), 'click', () => { IBNIZ.reset()  })
  on($('pause'), 'click', () => { IBNIZ.toggle() })
  
  IBNIZ.run()
})

