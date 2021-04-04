## jibniz

**jibniz** is a custom javascript implementation of the [IBNIZ VM](http://pelulamu.net/ibniz/).
A tiny demo can be found on https://flupe.github.io/jibniz/.

## Running tests (deprecated for now)

```
yarn install
yarn test
```

## TODO

I've tried again and again to produce WASM from IBNIZ programs, sadly the `J`
instruction is too powerful. In the specification, it can jump to any instruction at runtime, depending on the address found on the stack, whereas WASM jumps have to be well-behaved.

- Fix endianness hacks.
- Basic support for audio.
- "smart" mode detection.
- Compile a version of the code for both T and TYX modes.
