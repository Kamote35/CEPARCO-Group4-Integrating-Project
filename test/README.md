# CEPARCO-Group4-Integrating-Project

## SPECS

### TASK: implement a simulator for a simplified RISC-V processor, μRISCV. 
 The μRISCV processor offers the following subset of RISC-V instructions: 
- Group 4: LW, SW, SUB ADD, ADDI, BEQ, BNE
- Minimum directive: .word

### The μRISCV processor is based on the RV32I architecture.
### The objective this project is to “execute” the program using pipelining with the following schemes to solve the hazards:
- Structural Hazard: Separate Memory
- Data Hazard: No forwarding
- Control Hazard: Group 4: Pipeline #2
  
**In this case project, we will create the following modules:**
1. Utility program to input the RISC-V program.
2. Utility program to input value for registers x1 to x31
3. Utility program to input value for memory (data segment). Note: The program is stored starting
from address 0080-00FF while data segment is from 0000-007F. Also, provide a “GOTO
Memory” option to go to target memory location. Note: each memory location is a byte
4. Write a simulator program using pipeline. Simulator should support (a) single-step instruction
execution mode and (b) full execution mode
5. Output screen #1: the equivalent opcode of the RISC-V program (in HEX)
6. Output screen #2: Error message screen
7. Output screen #3: the “pipeline map”
8. Output screen #4: the internal RISC-V registers as follows:
- IF Cycle: IF/ID.IR, IF/ID.NPC, PC
- ID Cycle: ID/EX.A, ID/EX.B, ID/EX.IMM, ID/EX.IR, ID/EX.NPC
- EX Cycle: EX/MEM.ALUOUTPUT, EX/MEM.cond, EX/MEM.IR, EX/MEM.B,
- MEM Cycle: MEM/WB.LMD, MEM/WB.IR, MEM/WB.ALUOUTPUT, actual memory affected
- WB Cycle: Registers affected

**Note**
- Note: The affected registers and affected memory should contain the actual value.
- Note: The program should be in an “Integrated Development Environment (IDE)” interface
- Note: Can be web-based (preferred) or standalone
- Note: Submission: Github link containing: Upload source code, web link, video demo and readme documents

**Milestone**
- Milestone #1: Nov 13, 2025: Program input w/ error checking, opcode
- Milestone #2: Nov 20, 2025: GUI (registers, memory), initial execution draft
- Milestone #3: Nov 27, 2025: Complete program
