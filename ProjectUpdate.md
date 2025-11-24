# Integrating project milestone #1 (Nov 13, 2025)

## Program input w/ error checking, opcode

The primary function of this milestone is to implement a two-pass assembler that translates µRISCV assembly code into 32-bit machine code (opcodes), starting from memory address 0x0080, and performing essential error checking.

The assembler supports the following instructions and directives, with program memory starting at 0x0080

LW, SW, SUB ADD, ADDI, BEQ, BNE

<img width="1177" height="678" alt="image" src="https://github.com/user-attachments/assets/68472a60-e8e2-4794-b863-a8b655dcc86a" />

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

# Integrating project milestone #2 (Nov 20, 2025)

## GUI (registers, memory), initial execution draft

The primary objective of this milestone was to transform the static assembler into an interactive "Integrated Development Environment (IDE)" that visualizes the internal state of the µRISCV processor. This interface bridges the gap between the machine code generated in Milestone 1 and the hardware simulation.

**We implemented a reactive Memory Map that visualizes the full 256-byte memory space of the µRISCV processor.**
<img width="586" height="417" alt="image" src="https://github.com/user-attachments/assets/98db53c4-1e7e-4323-aea0-46e16a008618" />

- The memory is visually and logically divided into the Data Segment (0x00–0x7F) and the Text/Program Segment (0x80–0xFF), adhering to the project's structural hazard constraints.
- The GUI displays memory in 4-byte rows but allows individual byte manipulation. This clearly demonstrates Little Endian architecture, where a word like 0xDEADBEEF is stored sequentially as EF, BE, AD, DE.
- The Data Segment is fully editable via the GUI, allowing users to manually input test data, while the Text Segment is Read-Only and automatically populated by the assembler output.
- A "Go To Address" feature was added to quickly jump to specific memory locations (e.g., jumping to the start of the program at 0x0080).

**Register File Interface A dynamic control panel was created for the 32 General Purpose Registers (GPR).**
<img width="1169" height="807" alt="image" src="https://github.com/user-attachments/assets/318b4176-0816-41a1-b0ac-38a140287b8c" />

- Registers are displayed with both their hardware names (x0-x31) and their ABI aliases (zero, ra, sp, t0, etc.) to aid in debugging.
- Users can manually edit register values to set up specific test conditions before execution.
- The interface enforces the hardware constraint of x0 being read-only and always zero; inputs to x0 are disabled or ignored.

The Assembler from Milestone 1 was integrated directly into the memory module. Upon clicking "Assemble," the generated machine code is parsed and loaded directly into the Text Segment of the simulated memory, preparing the system for the cycle-by-cycle execution phase (which is yet to be implemented).

# Integrating project milestone #3 (Nov 23, 2025)

## Discussion of your project implementation: 

**Design Methodology**

**Testing Methodology** 

**AHA moments****
