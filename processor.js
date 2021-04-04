class AudioProcessor extends AudioWorkletProcessor {
  constructor(...args) {
    super(...args)
    this._buffer = new Float32Array(0x10000)
    this.position = 0
    this.port.onmessage = ({ data }) => {
        data.forEach((v , i) => {
          this._buffer[i] = (((v & 0xffff) - 0x8000) / 0x8000)
	})
    }
  }
  process (inputs, outputs, params) {
    const output = outputs[0]
    output.forEach(channel => {
      for (let i = 0; i < channel.length; i++)
        channel[i] = this._buffer[(i + this.position) & 0xffff]
    })
    this.position = (this.position + outputs[0][0].length) & 0xffff
    return true
  }
}

registerProcessor('processor', AudioProcessor)
