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

### Design Methodology

The system is architected as a set of modular JavaScript files, each simulating a specific physical component of the processor.

#### ⭐ Core Simulation Logic

**cpu.js**

The "brain" of the simulator. It manages the execution of the 5-stage pipeline (IF, ID, EX, MEM, WB), holds the state of the pipeline registers (Latches), and implements the hazard detection logic (stalling).

**memory.js**

Simulates the computer's RAM. It creates a 256-byte storage array (Uint8Array) and provides functions to read/write data in 32-bit words (Little Endian format), distinguishing between the Data Segment ($00-7F) and Program Segment ($80-FF).

**registers.js**

Manages the 32 general-purpose registers (x0–x31). It stores their values in an array and enforces the hardware rule that register x0 is always zero (read-only).

#### ⭐ Assembler System

**assembler.js**

The main entry point for translating code. It runs a "Two-Pass" process: Pass 1 maps labels (like LOOP:) to addresses, and Pass 2 generates the final machine code.

**parsers.js**

A helper module containing the specific rules for each instruction type (R, I, S, B, L). It handles the bit-shifting and string manipulation required to format valid 32-bit binary instructions.

#### ⭐ Application & UI

**main.js**

The "controller" that connects your HTML interface to the JavaScript logic. It handles button clicks (Assemble, Step, Run), updates the visual tables (Memory Map, Register List), and records the history needed to draw the Pipeline Map.

**style.css**

Defines the visual look of the simulator, specifically handling the layout of the memory table and ensuring the "sticky" headers work correctly in the Pipeline Map.

#### ⭐ Utilities & Config

**constants.js**

A configuration file acting as the "Instruction Set Manual." It stores the mappings for register names (e.g., sp = x2) and the opcode definitions for supported instructions.

**utils.js**

A toolbox for math conversions. It handles converting numbers between Decimal, Binary (including Two's Complement for negative numbers), and Hexadecimal formats.

### Testing Methodology 

For our testing methodology, we implemented quite a few setups to verify the validity of the outputs we're getting in every assembly.

#### ⭐ Manual Testing

1. We create a mini set of instructions and verify the outputs ourselves. We check when the results we got through manual tracing reflect the output on our web page. 
2. We also verify the opcodes of each instruction through the RV32I Instruction Set Table.

#### ⭐ Bench Marking

1. We're trying to catch all the possible errors that must be caught by the system. (eg. Entering an invalid instruction, Checking Typos, and constantly checking the outputs).
2. Inputting instructions outside our specifications to look for possible bugs that are not fixed.

#### ⭐ Event Checker

1. We also test all the events we implemented in our system to ensure they are all working as expected. Like, for instance, the "GO TO" function in our memory map, the reset registers button, the step, run, and others.

### AHA moments

Load word instruction acts as an immediate type instructino in real RISC-V RV32I base architecture but in our μRISC Simulator we have to implement the load instruction as it's own type since we're not actually using an actual CPU, but rather we are parsing the instructions one-by-one, where the tokens are separated by spaces, commas, and parenthesis. 

### AI Declaration: Our group had the help of AI in making our GUI so that the outputs would be more pleasant 


