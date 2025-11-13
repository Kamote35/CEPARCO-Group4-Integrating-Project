# Integrating project milestone #1 (Nov 13, 2025)

## Program input w/ error checking, opcode

The primary function of this milestone is to implement a two-pass assembler that translates µRISCV assembly code into 32-bit machine code (opcodes), starting from memory address 0x0080, and performing essential error checking.

The assembler supports the following instructions and directives, with program memory starting at 0x0080

LW, SW, SUB ADD, ADDI, BEQ, BNE

The assembler utilizes a standard two-pass architecture to handle forward references

**Pass 1: Label and Address Resolution**

The first pass scans the entire assembly code to:

- Identify all labels (e.g., loop:).

- Map each label to its corresponding Program Counter (PC) address, ensuring all instructions/directives occupy 4 bytes of memory.

- Filter out comments and empty lines.

- Initial Error Check: Detects duplicate label definitions.

**Pass 2: Opcode Generation and Encoding**

The second pass uses the addresses resolved in Pass 1 to translate each instruction into a 32-bit binary string, which is then converted to an 8-digit hexadecimal opcode.

- Two's Complement: Handled for all negative immediate values and branch offsets.

- Instruction Formatting: Fields (register indices, funct3, funct7, opcode, and immediate) are correctly extracted and concatenated based on the instruction type.

**Conclusion**

Milestone 1 has been successfully completed, providing a reliable opcode generator that validates input syntax and adherence to RISC-V immediate constraints. The generated hexadecimal opcodes are ready to serve as the input for the simulation phase.
