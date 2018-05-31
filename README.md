## jibniz
**jibniz** is a custom javascript implementation of the [IBNIZ VM](http://pelulamu.net/ibniz/).
A tiny demo can be found on https://flupe.github.io/jibniz/.

## Usage

```js
  const program = new jibniz.Program(`
    6{^^ddd***1%}
    5{v8rsdv*vv*^wpp8r-}
    4{v8rds4X3)Lx~2Xv*vv*+i!L1@2@^}
    3{ax8r+3lwd*xd*+q1x/x9r+^}
    2)6r3&3+V
  `)
```

## Running tests

For now, **jest** is being used to run unit tests. It is completely overkill for our purposes, and I really hate having to use **yarn** and **babel** for this. In the long term, I might replace it with some minimal custom testing framework.

```
yarn install
yarn test
```

### TODO
- Basic support for audio.
- External data segment.
- For the life of god fix this colour conversion from YUV to RGB.
- "smart" mode detection.
- Compile a version of the code for both T and TYX modes.
