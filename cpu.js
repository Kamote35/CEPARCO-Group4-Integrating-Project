import * as Memory from './memory.js';
import * as Registers from './registers.js';

// Simple single-cycle CPU for the supported instruction subset
// PC starts at 0x80 (program segment)
// cpu.js

// --- PIPELINE REGISTERS (LATCHES) ---
// These hold the state "between" stages.

// 1. IF/ID Latch
let IF_ID = {
    IR: 0,      // Instruction Register
    NPC: 0,     // Next Program Counter
    PC: 0       // Program Counter (for display/branches)
};

// 2. ID/EX Latch
let ID_EX = {
    A: 0,       // Register Operand 1 Value
    B: 0,       // Register Operand 2 Value
    IMM: 0,     // Immediate Value (Sign Extended)
    IR: 0,      // Pass instruction along for debugging/control
    NPC: 0      // Pass NPC along
};

// 3. EX/MEM Latch
let EX_MEM = {
    ALUOutput: 0, // Result of arithmetic
    Cond: 0,      // Zero flag (for branches)
    IR: 0,
    B: 0          // Store value (for SW)
};

// 4. MEM/WB Latch
let MEM_WB = {
    LMD: 0,       // Load Memory Data (from LW)
    IR: 0,
    ALUOutput: 0  // Pass ALU result for R-type/I-type writeback
};

// Global PC
let PC = 0x80;
let running = false;

// Temporary objects to hold the "Next" state calculated during this cycle
let next_IF_ID = { ...IF_ID };
let next_ID_EX = { ...ID_EX };
let next_EX_MEM = { ...EX_MEM };
let next_MEM_WB = { ...MEM_WB };

export function step() {
    // 1. Calculate logic for each stage 
    // (Order doesn't strictly matter here if we write to 'next_' variables)
    stageWB();
    stageMEM();
    stageEX();
    stageID();
    stageIF();

    // 2. "Clock Edge": Update the actual registers
    IF_ID = { ...next_IF_ID };
    ID_EX = { ...next_ID_EX };
    EX_MEM = { ...next_EX_MEM };
    MEM_WB = { ...next_MEM_WB };
    
    // Return data for GUI
    return { PC }; 
}


function signExtend(value, bits) {
    const shift = 32 - bits;
    return (value << shift) >> shift;
}

export function reset() {
    PC = 0x80;
}

export function getPC() {
    return PC;
}

/**
 * Execute one instruction at PC and advance PC (or branch).
 * Returns an object with { pc: newPC }
 */
// export function step() {
//     const inst = Memory.loadWord(PC) >>> 0;

//     const opcode = inst & 0x7f;
//     const rd     = (inst >> 7) & 0x1f;
//     const funct3 = (inst >> 12) & 0x7;
//     const rs1    = (inst >> 15) & 0x1f;
//     const rs2    = (inst >> 20) & 0x1f;
//     const funct7 = (inst >> 25) & 0x7f;

//     let pcInc = 4; // default

//     switch (opcode) {
//         case 0x33: // R-type (add, sub)
//             if (funct3 === 0x0) {
//                 if (funct7 === 0x00) { // add
//                     // (a + b) >>> 0 ensures 32-bit unsigned wrap
//                     const val = (Registers.getRegister(rs1) + Registers.getRegister(rs2)) >>> 0;
//                     Registers.setRegister(rd, val);
//                 } else if (funct7 === 0x20) { // sub
//                     // FIX: (a - b) >>> 0 ensures the result is treated as a 32-bit integer
//                     // This handles the Two's Complement wrap-around automatically.
//                     const val = (Registers.getRegister(rs1) - Registers.getRegister(rs2)) >>> 0;
//                     Registers.setRegister(rd, val);
//                 }
//             }
//             break;

//         case 0x13: // I-type (addi)
//             if (funct3 === 0x0) {
//                 const imm = signExtend(inst >>> 20, 12);
//                 const val = (Registers.getRegister(rs1) + imm) | 0;
//                 Registers.setRegister(rd, val);
//             }
//             break;

//         case 0x03: // Loads (lw)
//             if (funct3 === 0x2) { // lw
//                 const imm = signExtend(inst >>> 20, 12);
//                 const addr = (Registers.getRegister(rs1) + imm) >>> 0;
//                 const loaded = Memory.loadWord(addr) | 0;
//                 Registers.setRegister(rd, loaded);
//             }
//             break;

//         case 0x23: // Stores (sw)
//             if (funct3 === 0x2) { // sw
//                 const imm = signExtend((((inst >>> 25) << 5) | ((inst >>> 7) & 0x1f)) >>> 0, 12);
//                 const addr = (Registers.getRegister(rs1) + imm) >>> 0;
//                 const value = Registers.getRegister(rs2) >>> 0;
//                 Memory.storeWord(addr, value);
//             }
//             break;

//         case 0x63: // Branches (beq, bne)
//             {
//                 // B-type immediate reconstruction
//                 const imm = signExtend(
//                     (((inst >>> 31) & 0x1) << 12) |
//                     (((inst >>> 7) & 0x1) << 11) |
//                     (((inst >>> 25) & 0x3f) << 5) |
//                     (((inst >>> 8) & 0xf) << 1)
//                 , 13);

//                 let take = false;
//                 if (funct3 === 0x0) { // beq
//                     take = Registers.getRegister(rs1) === Registers.getRegister(rs2);
//                 } else if (funct3 === 0x1) { // bne
//                     take = Registers.getRegister(rs1) !== Registers.getRegister(rs2);
//                 }

//                 if (take) pcInc = imm;
//             }
//             break;

//         default:
//             // Unknown opcode -> treat as NOP
//             break;
//     }

//     PC = (PC + pcInc) >>> 0;
//     return { pc: PC };
// }

/**
 * Run up to maxCycles instructions or until PC leaves program region.
 * Synchronous run (small maxCycles recommended).
 */
export function run(maxCycles = 1000) {
    running = true;
    let cycles = 0;
    while (cycles < maxCycles) {
        // Stop if PC outside program segment
        if (PC < 0x80 || PC > 0xFF) break;
        step();
        cycles++;
    }
    running = false;
    return cycles;
}


// CPU cycle stage implementations
function stageIF() {
    // 1. Fetch Instruction
    let instruction = 0;
    try {
        instruction = Memory.loadWord(PC); //
    } catch (e) {
        instruction = 0; // NOP if out of bounds
    }

    // 2. Calculate NPC (Next PC)
    const NPC = PC + 4;

    // 3. Write to IF/ID Latch (Next)
    next_IF_ID.IR = instruction;
    next_IF_ID.NPC = NPC;
    next_IF_ID.PC = PC;

    // 4. Update Global PC
    // NOTE: For Milestone 2 (No Hazards), we just increment. 
    // Later, Branch logic in EX will overwrite this.
    PC = NPC; 
}

function stageID() {
    // Input: IF_ID
    const inst = IF_ID.IR;

    // Decode basic fields
    const opcode = inst & 0x7F;
    const rs1 = (inst >> 15) & 0x1F;
    const rs2 = (inst >> 20) & 0x1F;

    // Read Registers
    const valA = Registers.getRegister(rs1);
    const valB = Registers.getRegister(rs2);

    // Generate Immediate (Simple version - needs robust sign extension helper)
    // You can reuse the signExtend function from your existing cpu.js
    let imm = 0;
    if (opcode === 0x13 || opcode === 0x03) { // I-type (ADDI, LW)
        imm = signExtend(inst >>> 20, 12);
    } else if (opcode === 0x23) { // S-type (SW)
        imm = signExtend((((inst >>> 25) << 5) | ((inst >>> 7) & 0x1f)), 12);
    } else if (opcode === 0x63) { // B-type (BEQ)
        imm = signExtend(
             (((inst >>> 31) & 0x1) << 12) |
             (((inst >>> 7) & 0x1) << 11) |
             (((inst >>> 25) & 0x3f) << 5) |
             (((inst >>> 8) & 0xf) << 1), 13);
    }

    // Write to ID/EX Latch
    next_ID_EX.A = valA;
    next_ID_EX.B = valB;
    next_ID_EX.IMM = imm;
    next_ID_EX.IR = inst;
    next_ID_EX.NPC = IF_ID.NPC;
}


function stageEX() {
    // Input: ID_EX
    const inst = ID_EX.IR;
    const A = ID_EX.A;
    const B = ID_EX.B;
    const imm = ID_EX.IMM;
    const opcode = inst & 0x7F;
    const funct3 = (inst >> 12) & 0x7;
    const funct7 = (inst >> 25) & 0x7F;

    let aluResult = 0;
    let cond = 0; // Zero flag

    // ALU Control
    if (opcode === 0x33) { // R-Type (ADD, SUB)
        if (funct7 === 0x20) aluResult = (A - B) >>> 0; // SUB
        else aluResult = (A + B) >>> 0; // ADD
    } 
    else if (opcode === 0x13) { // I-Type (ADDI)
        aluResult = (A + imm) >>> 0;
    }
    else if (opcode === 0x03 || opcode === 0x23) { // LW, SW
        aluResult = (A + imm) >>> 0; // Calculate Address
    }
    else if (opcode === 0x63) { // Branch (BEQ, BNE)
        // For pipeline #2 (control hazard), simple comparison here
        if (funct3 === 0) cond = (A === B) ? 1 : 0; // BEQ
        else if (funct3 === 1) cond = (A !== B) ? 1 : 0; // BNE
    }

    // Write to EX/MEM
    next_EX_MEM.ALUOutput = aluResult;
    next_EX_MEM.Cond = cond;
    next_EX_MEM.B = B; // Pass 'B' along for SW
    next_EX_MEM.IR = inst;
}

function stageMEM() {
    // Input: EX_MEM
    const inst = EX_MEM.IR;
    const addr = EX_MEM.ALUOutput; // Address calculated in EX
    const writeData = EX_MEM.B;    // Value to store
    const opcode = inst & 0x7F;

    let lmd = 0;

    if (opcode === 0x03) { // LW
        lmd = Memory.loadWord(addr);
    } 
    else if (opcode === 0x23) { // SW
        Memory.storeWord(addr, writeData);
    }

    // Write to MEM/WB
    next_MEM_WB.LMD = lmd;
    next_MEM_WB.ALUOutput = addr; // Pass ALU result (for R-type/I-type)
    next_MEM_WB.IR = inst;
}

function stageWB() {
    // Input: MEM_WB
    const inst = MEM_WB.IR;
    const lmd = MEM_WB.LMD;
    const aluOut = MEM_WB.ALUOutput;
    const opcode = inst & 0x7F;
    const rd = (inst >> 7) & 0x1F;

    if (rd !== 0) { // Don't write to x0
        if (opcode === 0x03) { // LW
            Registers.setRegister(rd, lmd);
        } 
        else if (opcode === 0x33 || opcode === 0x13) { // R-Type or ADDI
            Registers.setRegister(rd, aluOut);
        }
    }
}

// In cpu.js
export function getPipelineRegisters() {
    return {
        IF_ID,
        ID_EX,
        EX_MEM,
        MEM_WB
    };
}
export function isRunning() { return running; }
