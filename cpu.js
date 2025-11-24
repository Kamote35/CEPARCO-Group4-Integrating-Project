import * as Memory from './memory.js';
import * as Registers from './registers.js';

// Simple single-cycle CPU for the supported instruction subset
// PC starts at 0x80 (program segment)
// cpu.js

// --- PIPELINE REGISTERS (LATCHES) ---
// These hold the state "between" stages.
let IF_ID = { IR: 0, NPC: 0, PC: 0 };
let ID_EX = { A: 0, B: 0, IMM: 0, IR: 0, NPC: 0, RS1: 0, RS2: 0, RD: 0 };
let EX_MEM = { ALUOutput: 0, Cond: 0, IR: 0, B: 0, RD: 0 };
let MEM_WB = { LMD: 0, IR: 0, ALUOutput: 0, RD: 0 };

// Global PC
let PC = 0x80;
let running = false;
let branchTakenInID = false; // Flag to help validitation

// Temporary objects for "Next" state
let next_IF_ID = { ...IF_ID };
let next_ID_EX = { ...ID_EX };
let next_EX_MEM = { ...EX_MEM };
let next_MEM_WB = { ...MEM_WB };

// return 11:7, 19:15, 24:20
function getRd(inst)  { return (inst >> 7) & 0x1F; }
function getRs1(inst) { return (inst >> 15) & 0x1F; }
function getRs2(inst) { return (inst >> 20) & 0x1F; }

export function step() {
    // Reset branch flag for this cycle
    branchTakenInID = false;

    // 1. EXECUTE STAGES
    // Order: WB -> MEM -> EX -> ID -> IF
    // This allows data to flow through latches correctly
    stageWB();
    stageMEM();
    stageEX();
    
    // 2. HAZARD DETECTION (Data Hazard - No Forwarding)
    // gets registers and opcodes from ID stage
    const id_inst = IF_ID.IR;
    const id_rs1 = getRs1(id_inst);
    const id_rs2 = getRs2(id_inst);
    const opcode = id_inst & 0x7F;

    // Hazards check against EX and MEM stages
    // looks at the instructions ahead in the pipeline that 
    // might be producing the data the ID stage needs.
    const ex_rd = next_EX_MEM.RD;
    const ex_has_write = (ex_rd !== 0);
    const mem_rd = next_MEM_WB.RD;
    const mem_has_write = (mem_rd !== 0);

    let stall = false;

    // If either EX or MEM destination in rs1 matches, then stall
    if (ex_has_write && ex_rd === id_rs1) stall = true;
    if (mem_has_write && mem_rd === id_rs1) stall = true;

    // R-Type (0x33), Store (0x23), Branch (0x63)
    // If either EX or MEM destination in rs2 matches, then stall
    if ((opcode === 0x33 || opcode === 0x23 || opcode === 0x63)) {
        if (ex_has_write && ex_rd === id_rs2) stall = true;
        if (mem_has_write && mem_rd === id_rs2) stall = true;
    }

    // 3. RUN ID/IF STAGES (If not stalled)
    if (!stall) {
        //if no stall, proceed normally
        stageID(); // If it is a branch, the PC is updated here due to Pipeline #2
        stageIF(); // Fetches based on the PC set by ID
    } else {
        // STALL LOGIC, like a NOP instruction in ID stage
        next_ID_EX = { 
            A: 0, B: 0, IMM: 0, IR: 0, NPC: 0, RS1: 0, RS2: 0, RD: 0 
        };
        // Freeze IF_ID and PC
        next_IF_ID = { ...IF_ID }; 
    }

    // 4. UPDATE LATCHES
    // EX_MEM and MEM_WB are updated regardless of the stall
    ID_EX = { ...next_ID_EX };
    EX_MEM = { ...next_EX_MEM };
    MEM_WB = { ...next_MEM_WB };
    
    //if stalled, IF_ID and PC remain unchanged
    if (!stall) {
        IF_ID = { ...next_IF_ID };
    }

    return { PC }; 
}

function signExtend(value, bits) {
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
export function getPipelineRegisters() { return { IF_ID, ID_EX, EX_MEM, MEM_WB }; }

// --- STAGES ---

function stageIF() {
    // Structural Hazard Check (Separate Memory)
    if (PC < 0x80 || PC > 0xFF) {
        next_IF_ID.IR = 0; // NOP
        next_IF_ID.NPC = PC;
        next_IF_ID.PC = PC;
        return;
    }

    let instruction = 0;
    try {
        instruction = Memory.loadWord(PC);
    } catch (e) {
        instruction = 0;
    }

    // If ID stage took a branch, it already updated global PC.
    // If not, we just move to next sequential instruction.
    const NPC = PC + 4;
    
    next_IF_ID.IR = instruction;
    next_IF_ID.NPC = NPC;
    next_IF_ID.PC = PC;

    // Update Global PC for the NEXT cycle
    PC = NPC; 
}

function stageID() {
    const inst = IF_ID.IR;
    if (inst === 0) { 
        next_ID_EX = { A: 0, B: 0, IMM: 0, IR: 0, NPC: IF_ID.NPC, RS1:0, RS2:0, RD:0 };
        return;
    }

    const opcode = inst & 0x7F;
    const funct3 = (inst >> 12) & 0x7;
    const rs1 = getRs1(inst);
    const rs2 = getRs2(inst);
    const rd  = getRd(inst);

    // Read Registers
    const valA = Registers.getRegister(rs1);
    const valB = Registers.getRegister(rs2);

    let imm = 0;
    
    // --- PIPELINE #2: BRANCH RESOLUTION IN ID ---
    if (opcode === 0x63) { // B-type (BEQ, BNE)
        // 1. Calculate Immediate
        imm = signExtend(
             (((inst >>> 31) & 0x1) << 12) |
             (((inst >>> 7) & 0x1) << 11) |
             (((inst >>> 25) & 0x3f) << 5) |
             (((inst >>> 8) & 0xf) << 1), 13);
        
        // 2. Check Condition, Zero Equality Test
        let take = false;
        if (funct3 === 0x0) take = (valA === valB); // BEQ
        else if (funct3 === 0x1) take = (valA !== valB); // BNE

        if (take) {
            // 3. Compute Target Address
            const target = (IF_ID.PC + imm) >>> 0;
            // 4. Update PC
            // This ensures stageIF (which runs next) fetches from 'target'
            // effectively "flushing" the sequential fetch that would have happened.
            PC = target; 
            branchTakenInID = true;
        }
    } 
    // Other Immediates
    else if (opcode === 0x13 || opcode === 0x03) { // I-type (ADDI, LW)
        imm = signExtend(inst >>> 20, 12);
    } else if (opcode === 0x23) {  // S-type (SW)
        imm = signExtend((((inst >>> 25) << 5) | ((inst >>> 7) & 0x1f)), 12);
    }

    next_ID_EX.A = valA;
    next_ID_EX.B = valB;
    next_ID_EX.IMM = imm;
    next_ID_EX.IR = inst;
    next_ID_EX.NPC = IF_ID.NPC;
    next_ID_EX.RS1 = rs1;
    next_ID_EX.RS2 = rs2;
    next_ID_EX.RD  = rd;
}

function stageEX() {
    const inst = ID_EX.IR;
    const A = ID_EX.A;
    const B = ID_EX.B;
    const imm = ID_EX.IMM;
    const rd = ID_EX.RD;
    
    if (inst === 0) { 
        next_EX_MEM = { ALUOutput: 0, Cond: 0, IR: 0, B: 0, RD: 0 };
        return;
    }

    const opcode = inst & 0x7F;
    const funct7 = (inst >> 25) & 0x7F;

    let aluResult = 0;

    // ALU Logic
    if (opcode === 0x33) { // R-Type
        if (funct7 === 0x20) aluResult = (A - B) >>> 0; 
        else aluResult = (A + B) >>> 0; 
    } 
    else if (opcode === 0x13 || opcode === 0x03 || opcode === 0x23) { // ADDI, LW, SW
        aluResult = (A + imm) >>> 0;
    }
    // Note: Branch (0x63) logic is removed from here as per Pipeline #2

    next_EX_MEM.ALUOutput = aluResult;
    next_EX_MEM.Cond = 0; // Unused now
    next_EX_MEM.B = B; 
    next_EX_MEM.IR = inst;
    
    // S-type and B-type don't write back
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
        if (addr >= 0x00 && addr <= 0x7F) lmd = Memory.loadWord(addr);
    } 
    else if (opcode === 0x23) { // SW
        if (addr >= 0x00 && addr <= 0x7F) Memory.storeWord(addr, writeData);
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
    const rd = MEM_WB.RD; 

    if (inst === 0) return;

    if (rd !== 0) { 
        if (opcode === 0x03) Registers.setRegister(rd, lmd);
        else if (opcode === 0x33 || opcode === 0x13) Registers.setRegister(rd, aluOut);
    }
}
