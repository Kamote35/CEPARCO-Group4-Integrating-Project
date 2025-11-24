import * as Memory from './memory.js';
import * as Registers from './registers.js';

// --- PIPELINE REGISTERS (LATCHES) ---
let IF_ID = { IR: 0, NPC: 0, PC: 0 };
let ID_EX = { A: 0, B: 0, IMM: 0, IR: 0, NPC: 0, RS1: 0, RS2: 0, RD: 0 }; // Added RS/RD tracking
let EX_MEM = { ALUOutput: 0, Cond: 0, IR: 0, B: 0, RD: 0 };
let MEM_WB = { LMD: 0, IR: 0, ALUOutput: 0, RD: 0 };

// Global PC
let PC = 0x80;
let running = false;

// Temporary objects for "Next" state
let next_IF_ID = { ...IF_ID };
let next_ID_EX = { ...ID_EX };
let next_EX_MEM = { ...EX_MEM };
let next_MEM_WB = { ...MEM_WB };

// Helper: Extract Register Fields from Instruction
function getRd(inst)  { return (inst >> 7) & 0x1F; }
function getRs1(inst) { return (inst >> 15) & 0x1F; }
function getRs2(inst) { return (inst >> 20) & 0x1F; }
function getOpcode(inst) { return inst & 0x7F; }

export function step() {
    // 1. EXECUTE STAGES (Reverse order in code, but logical flow is standard)
    // Note: Running WB first effectively handles "Split-Cycle" (Write first, Read later)
    // so we don't need to stall for WB hazards.
    stageWB();
    stageMEM();
    stageEX();
    
    // 2. HAZARD DETECTION (Data Hazard - No Forwarding)
    // Check if instruction in ID needs registers being written by EX or MEM
    const id_inst = IF_ID.IR;
    const id_rs1 = getRs1(id_inst);
    const id_rs2 = getRs2(id_inst);
    
    // Determine if the instruction in ID actually uses rs1 or rs2
    // For simplicity in this subset, most instructions use rs1. 
    // Opcode check can refine this, but checking all is safe for "No Forwarding".

    // Hazard Sources:
    // 1. Instruction in EX (destined for WB)
    const ex_rd = next_EX_MEM.RD; // The RD that EX stage *just* calculated to pass to MEM
    const ex_has_write = (ex_rd !== 0); // Is it writing to a register?

    // 2. Instruction in MEM (destined for WB)
    const mem_rd = next_MEM_WB.RD; // The RD that MEM stage *just* passed to WB
    const mem_has_write = (mem_rd !== 0);

    let stall = false;

    // Check Data Hazards
    if (ex_has_write && (ex_rd === id_rs1 || ex_rd === id_rs2)) {
        stall = true;
    }
    if (mem_has_write && (mem_rd === id_rs1 || mem_rd === id_rs2)) {
        stall = true;
    }

    // 3. RUN REMAINING STAGES
    if (!stall) {
        stageID();
        stageIF();
    } else {
        // STALL BEHAVIOR:
        // 1. ID and IF stages do "nothing" effective (they don't consume new inputs)
        // 2. We inject a BUBBLE (NOP) into ID/EX
        next_ID_EX = { 
            A: 0, B: 0, IMM: 0, 
            IR: 0, // NOP (0x00000000 is usually treated as NOP or specific ADDI x0, x0, 0)
            NPC: 0, RS1: 0, RS2: 0, RD: 0 
        };
        
        // 3. IF_ID preserves its state (Freeze Decode)
        next_IF_ID = { ...IF_ID }; 
        
        // 4. PC preserves its state (Freeze Fetch) is handled by NOT updating PC below
    }

    // 4. UPDATE PIPELINE REGISTERS ("Clock Edge")
    ID_EX = { ...next_ID_EX };
    EX_MEM = { ...next_EX_MEM };
    MEM_WB = { ...next_MEM_WB };
    
    // Update IF_ID only if not stalled
    if (!stall) {
        IF_ID = { ...next_IF_ID };
        // PC Update:
        // In this Milestone, PC just increments. 
        // (Later for Control Hazard, PC logic will change)
        PC = next_IF_ID.NPC; 
    }
    // If stalled, PC stays the same (fetching same inst next cycle)

    return { PC }; 
}

function signExtend(value, bits) { // for two's complement
    const shift = 32 - bits;
    return (value << shift) >> shift;
}

export function reset() {
    PC = 0x80;
    
    IF_ID = { IR: 0, NPC: 0, PC: 0 };
    ID_EX = { A: 0, B: 0, IMM: 0, IR: 0, NPC: 0, RS1: 0, RS2: 0, RD: 0 };
    EX_MEM = { ALUOutput: 0, Cond: 0, IR: 0, B: 0, RD: 0 };
    MEM_WB = { LMD: 0, IR: 0, ALUOutput: 0, RD: 0 };

    next_IF_ID = { ...IF_ID };
    next_ID_EX = { ...ID_EX };
    next_EX_MEM = { ...EX_MEM };
    next_MEM_WB = { ...MEM_WB };
}

export function getPC() { return PC; }
export function isRunning() { return running; }

export function run(maxCycles = 1000) {
    running = true;
    let cycles = 0;
    while (cycles < maxCycles) {
        if (PC < 0x80 || PC > 0xFF) break;
        step();
        cycles++;
    }
    running = false;
    return cycles;
}

// --- STAGES ---

function stageIF() {
    // Structural Hazard Check (Separate Memory)
    // Instruction Memory restricted to 0x80 - 0xFF
    if (PC < 0x80 || PC > 0xFF) {
        // In real HW this might throw a fault, here we just fetch 0 (NOP) 
        next_IF_ID.IR = 0;
        next_IF_ID.NPC = PC; // Trap PC
        next_IF_ID.PC = PC;
        return;
    }

    let instruction = 0;
    try {
        instruction = Memory.loadWord(PC); 
    } catch (e) {
        instruction = 0;
    }

    const NPC = PC + 4;
    next_IF_ID.IR = instruction;
    next_IF_ID.NPC = NPC;
    next_IF_ID.PC = PC;
}

function stageID() {
    const inst = IF_ID.IR;
    if (inst === 0) { // NOP handling
        next_ID_EX = { A: 0, B: 0, IMM: 0, IR: 0, NPC: IF_ID.NPC, RS1:0, RS2:0, RD:0 };
        return;
    }

    const opcode = inst & 0x7F;
    const rs1 = getRs1(inst);
    const rs2 = getRs2(inst);
    const rd  = getRd(inst);

    // Read Registers
    const valA = Registers.getRegister(rs1);
    const valB = Registers.getRegister(rs2);

    let imm = 0;
    // Immediate Generation
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

    next_ID_EX.A = valA;
    next_ID_EX.B = valB;
    next_ID_EX.IMM = imm;
    next_ID_EX.IR = inst;
    next_ID_EX.NPC = IF_ID.NPC;
    next_ID_EX.RS1 = rs1;
    next_ID_EX.RS2 = rs2;
    next_ID_EX.RD  = rd; // Pass RD forward for hazard checking in future cycles
}

function stageEX() {
    const inst = ID_EX.IR;
    const A = ID_EX.A;
    const B = ID_EX.B;
    const imm = ID_EX.IMM;
    const rd = ID_EX.RD;
    
    // stall
    if (inst === 0) { // Bubble / NOP
        next_EX_MEM = { ALUOutput: 0, Cond: 0, IR: 0, B: 0, RD: 0 };
        return;
    }

    const opcode = inst & 0x7F;
    const funct3 = (inst >> 12) & 0x7;
    const funct7 = (inst >> 25) & 0x7F;

    let aluResult = 0;
    let cond = 0;

    // ALU Logic
    if (opcode === 0x33) { // R-Type (ADD, SUB)
        if (funct7 === 0x20) aluResult = (A - B) >>> 0; // SUB
        else aluResult = (A + B) >>> 0; // ADD
    } 
    else if (opcode === 0x13) { // I-Type (ADDI)
        aluResult = (A + imm) >>> 0;
    }
    else if (opcode === 0x03 || opcode === 0x23) { // LW, SW
        aluResult = (A + imm) >>> 0; 
    }
    else if (opcode === 0x63) { // Branches
        if (funct3 === 0) cond = (A === B) ? 1 : 0; // BEQ
        else if (funct3 === 1) cond = (A !== B) ? 1 : 0; // BNE
    }

    next_EX_MEM.ALUOutput = aluResult;
    next_EX_MEM.Cond = cond;
    next_EX_MEM.B = B; 
    next_EX_MEM.IR = inst;
    
    // Pass RD forward. Note: Branches and Stores don't write back to RD.
    // S-type (0x23) and B-type (0x63) don't write to RD.
    if (opcode === 0x23 || opcode === 0x63) {
        next_EX_MEM.RD = 0; 
    } else {
        next_EX_MEM.RD = rd;
    }
}

function stageMEM() {
    const inst = EX_MEM.IR;
    const addr = EX_MEM.ALUOutput;
    const writeData = EX_MEM.B;
    const rd = EX_MEM.RD;
    const opcode = inst & 0x7F;

    if (inst === 0) {
        next_MEM_WB = { LMD: 0, IR: 0, ALUOutput: 0, RD: 0 };
        return;
    }

    let lmd = 0;

    if (opcode === 0x03) { // LW
        // Structural Hazard: Data Memory Check (0x00 - 0x7F)
        if (addr >= 0x00 && addr <= 0x7F) { // check bounds
            lmd = Memory.loadWord(addr);
        } else {
            // Access violation or Program Memory access -> Return 0 or handle error
            lmd = 0; 
        }
    } 
    else if (opcode === 0x23) { // SW
        // Structural Hazard: Data Memory Check
        if (addr >= 0x00 && addr <= 0x7F) { // check bounds
            Memory.storeWord(addr, writeData);
        }
    }

    next_MEM_WB.LMD = lmd;
    next_MEM_WB.ALUOutput = addr; 
    next_MEM_WB.IR = inst;
    next_MEM_WB.RD = rd;
}

function stageWB() {
    const inst = MEM_WB.IR;
    const lmd = MEM_WB.LMD;
    const aluOut = MEM_WB.ALUOutput;
    const opcode = inst & 0x7F;
    const rd = MEM_WB.RD; // Use passed RD

    if (inst === 0) return;

    if (rd !== 0) { 
        if (opcode === 0x03) { // LW
            Registers.setRegister(rd, lmd);
        } 
        else if (opcode === 0x33 || opcode === 0x13) { // R-Type, ADDI
            Registers.setRegister(rd, aluOut);
        }
    }
}

export function getPipelineRegisters() {
    return { IF_ID, ID_EX, EX_MEM, MEM_WB };
}