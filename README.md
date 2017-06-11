## jibniz
**jibniz** is a custom javascript implementation of the [IBNIZ VM](http://pelulamu.net/ibniz/).

### todo:
- check whether a giant swith stmt is such a good idea. as I recall function calls are *really* expensive in JS, so I would like to avoid storing every instruction as a function in a big array, but I fear switch stmts being not very efficient.  
  maybe an hybrid solution, a table of instruction can only be used for conditional branches?
- conditional execution.
- loops.
- basic support for audio.
- user input.
- external data segment.
- for the life of god fix this colour conversion from YUV to RGB.
- support for subroutines.
- "smart" mode detection.
- somehow add tests.
