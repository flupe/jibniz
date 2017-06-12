## jibniz
**jibniz** is a custom javascript implementation of the [IBNIZ VM](http://pelulamu.net/ibniz/).

### todo:
- Check whether a giant switch statement is such a good idea. As I recall function calls are *really* expensive in JS, so I would like to avoid storing every instruction as a function in a big array, but I fear switch statements being not very efficient.  
  Maybe an hybrid solution, a table of instruction can only be used for conditional branches?
- Basic support for audio.
- User input.
- External data segment.
- For the life of god fix this colour conversion from YUV to RGB.
- "smart" mode detection.
- Somehow add tests.
- Static analysis.  
  Under the assumption that every `jump` occurs because of coroutine calls or is already determined prior to compilation, instructions could be gathered in continuous chunks. Inside such chunks, we should be able to inline most stack instructions to speed things up.
  Obviously if we do not have such a guarantee, not much can be done. I can't really think of any good reason one would want to do arbitrary jumps but it should be doable.
- Self-code modification.  
  For now, this is not permitted. Although space is allocated for code storage, specification for how we should encode instructions is not defined in the official IBNIZ documentation. I also doubt we would be able to run programs at a reasonable framerate if they were to be modified at runtime.
