## jibniz
**jibniz** is a custom javascript implementation of the [IBNIZ VM](http://pelulamu.net/ibniz/).
A tiny demo can be found on https://flupe.github.io/jibniz/.

### TODO
- Check whether a giant switch statement is such a good idea. As I recall function calls are *really* expensive in JS, so I would like to avoid storing every instruction as a function in a big array, but I fear switch statements being not very efficient.  
  Maybe an hybrid solution, a table of instruction can only be used for conditional branches?
- Basic support for audio.
- External data segment.
- For the life of god fix this colour conversion from YUV to RGB.
- "smart" mode detection.
- Somehow add tests.
- Static analysis.  
  Under the assumption that every `jump` occurs because of coroutine calls or is already determined prior to compilation, instructions could be gathered in continuous chunks. Inside such chunks, we should be able to inline most stack instructions to speed things up.
  Obviously if we do not have such a guarantee, not much can be done. I can't really think of any good reason one would want to do arbitrary jumps but it should be doable.
- Self-code modification.  
  For now, this is not permitted. Although space is allocated for code storage, specification for how we should encode instructions is not defined in the official IBNIZ documentation. I also doubt we would be able to run programs at a reasonable framerate if they were to be modified at runtime.
- compile a version of the code with every mode possible, this would definitely remove foreign function call during execution.

### Ideas for static analysis

One could define a *continuous chunk* of instructions as a sequence of instructions that you never jump into, when considering the entirety of the program.
Given such a continuous chunk, you should be able to *collapse* instrutions:

1. By grouping them in a single *case* of the global `switch` statement.
2. By getting rid of temporary results stored on the stack during execution.

The second part is what should allow drastic performance gain.
Instructions such as `d*xd*+q` could be reduced to a single expression `sqrt(a*a+b*b)` with the stack being used only to read the initial values and writing the result in the end.

Obviously, robustly finding such continuous chunks is a tricky task. However if the user never writes on the return stack on its own, I assume that every well-defined intuitive separate area of code (the inside of a loop, the outside, branching) could act as a continuous chunk, but I need to take a closer look.
