import * as Memory from './memory.js';
import * as Registers from './registers.js';

// Simple single-cycle CPU for the supported instruction subset
// PC starts at 0x80 (program segment)
let PC = 0x80;
let running = false;

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
export function step() {
    const inst = Memory.loadWord(PC) >>> 0;

    const opcode = inst & 0x7f;
    const rd     = (inst >> 7) & 0x1f;
    const funct3 = (inst >> 12) & 0x7;
    const rs1    = (inst >> 15) & 0x1f;
    const rs2    = (inst >> 20) & 0x1f;
    const funct7 = (inst >> 25) & 0x7f;

    let pcInc = 4; // default

    switch (opcode) {
        case 0x33: // R-type (add, sub)
            if (funct3 === 0x0) {
                if (funct7 === 0x00) { // add
                    // (a + b) >>> 0 ensures 32-bit unsigned wrap
                    const val = (Registers.getRegister(rs1) + Registers.getRegister(rs2)) >>> 0;
                    Registers.setRegister(rd, val);
                } else if (funct7 === 0x20) { // sub
                    // FIX: (a - b) >>> 0 ensures the result is treated as a 32-bit integer
                    // This handles the Two's Complement wrap-around automatically.
                    const val = (Registers.getRegister(rs1) - Registers.getRegister(rs2)) >>> 0;
                    Registers.setRegister(rd, val);
                }
            }
            break;

        case 0x13: // I-type (addi)
            if (funct3 === 0x0) {
                const imm = signExtend(inst >>> 20, 12);
                const val = (Registers.getRegister(rs1) + imm) | 0;
                Registers.setRegister(rd, val);
            }
            break;

        case 0x03: // Loads (lw)
            if (funct3 === 0x2) { // lw
                const imm = signExtend(inst >>> 20, 12);
                const addr = (Registers.getRegister(rs1) + imm) >>> 0;
                const loaded = Memory.loadWord(addr) | 0;
                Registers.setRegister(rd, loaded);
            }
            break;

        case 0x23: // Stores (sw)
            if (funct3 === 0x2) { // sw
                const imm = signExtend((((inst >>> 25) << 5) | ((inst >>> 7) & 0x1f)) >>> 0, 12);
                const addr = (Registers.getRegister(rs1) + imm) >>> 0;
                const value = Registers.getRegister(rs2) >>> 0;
                Memory.storeWord(addr, value);
            }
            break;

        case 0x63: // Branches (beq, bne)
            {
                // B-type immediate reconstruction
                const imm = signExtend(
                    (((inst >>> 31) & 0x1) << 12) |
                    (((inst >>> 7) & 0x1) << 11) |
                    (((inst >>> 25) & 0x3f) << 5) |
                    (((inst >>> 8) & 0xf) << 1)
                , 13);

                let take = false;
                if (funct3 === 0x0) { // beq
                    take = Registers.getRegister(rs1) === Registers.getRegister(rs2);
                } else if (funct3 === 0x1) { // bne
                    take = Registers.getRegister(rs1) !== Registers.getRegister(rs2);
                }

                if (take) pcInc = imm;
            }
            break;

        default:
            // Unknown opcode -> treat as NOP
            break;
    }

    PC = (PC + pcInc) >>> 0;
    return { pc: PC };
}

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

export function isRunning() { return running; }
