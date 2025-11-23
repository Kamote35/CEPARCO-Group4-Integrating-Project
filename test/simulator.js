// Simple non-pipelined RISC-V simulator (supports subset used by assembler)

export class Simulator {
    constructor() {
        this.memory = new Uint8Array(0x100); // 256 bytes (0x0000 - 0x00FF)
        this.registers = new Uint32Array(32);
        this.PC = 0x0080;
        this.halted = false;
    }

    reset(hard = false) {
        // soft reset: clear registers and PC, optionally clear memory when hard=true
        this.registers.fill(0);
        this.PC = 0x0080;
        this.halted = false;
        if (hard) this.memory.fill(0);
    }

    readWord(addr) {
        // little-endian
        if (addr < 0 || addr + 3 >= this.memory.length) return 0;
        return (this.memory[addr]) | (this.memory[addr+1] << 8) | (this.memory[addr+2] << 16) | (this.memory[addr+3] << 24) >>> 0;
    }

    writeWord(addr, val) {
        if (addr < 0 || addr + 3 >= this.memory.length) return;
        const v = val >>> 0;
        this.memory[addr] = v & 0xFF;
        this.memory[addr+1] = (v >>> 8) & 0xFF;
        this.memory[addr+2] = (v >>> 16) & 0xFF;
        this.memory[addr+3] = (v >>> 24) & 0xFF;
    }

    signExtend(value, bits) {
        const shift = 32 - bits;
        return (value << shift) >> shift;
    }

    step() {
        if (this.halted) return { halted: true };
        if (this.PC < 0x0080 || this.PC + 3 >= this.memory.length) return { error: 'PC out of program memory' };

        const instr = this.readWord(this.PC);
        // Treat an all-zero word at PC as HALT
        if (instr === 0) {
            this.halted = true;
            return { halted: true };
        }
        const opcode = instr & 0x7F;
        const rd = (instr >>> 7) & 0x1F;
        const funct3 = (instr >>> 12) & 0x7;
        const rs1 = (instr >>> 15) & 0x1F;
        const rs2 = (instr >>> 20) & 0x1F;
        const funct7 = (instr >>> 25) & 0x7F;

        let nextPC = this.PC + 4;

        // R-type (add, sub)
        if (opcode === 0x33) {
            if (funct3 === 0x0 && funct7 === 0x00) { // ADD
                this.registers[rd] = (this.registers[rs1] + this.registers[rs2]) >>> 0;
            } else if (funct3 === 0x0 && funct7 === 0x20) { // SUB
                this.registers[rd] = (this.registers[rs1] - this.registers[rs2]) >>> 0;
            } else {
                return { error: `Unsupported R-type funct7=${funct7.toString(16)}` };
            }
        }
        // I-type (addi, lw)
        else if (opcode === 0x13) { // addi
            const imm = this.signExtend((instr >>> 20) & 0xFFF, 12);
            this.registers[rd] = (this.registers[rs1] + imm) >>> 0;
        } else if (opcode === 0x03) { // loads
            const imm = this.signExtend((instr >>> 20) & 0xFFF, 12);
            const addr = (this.registers[rs1] + imm) >>> 0;
            if (funct3 === 0x2) { // LW
                this.registers[rd] = this.readWord(addr) >>> 0;
            } else {
                return { error: `Unsupported load funct3=${funct3}` };
            }
        }
        // S-type (sw)
        else if (opcode === 0x23) {
            const imm11_5 = (instr >>> 25) & 0x7F;
            const imm4_0 = (instr >>> 7) & 0x1F;
            const imm = this.signExtend((imm11_5 << 5) | imm4_0, 12);
            const addr = (this.registers[rs1] + imm) >>> 0;
            if (funct3 === 0x2) { // SW
                this.writeWord(addr, this.registers[rs2]);
            } else {
                return { error: `Unsupported store funct3=${funct3}` };
            }
        }
        // B-type (beq, bne)
        else if (opcode === 0x63) {
            const imm12 = (instr >>> 31) & 0x1;
            const imm11 = (instr >>> 7) & 0x1;
            const imm10_5 = (instr >>> 25) & 0x3F;
            const imm4_1 = (instr >>> 8) & 0xF;
            let imm = (imm12 << 12) | (imm11 << 11) | (imm10_5 << 5) | (imm4_1 << 1);
            imm = this.signExtend(imm, 13); // B-type uses 13 bits with lowest bit zero

            if (funct3 === 0x0) { // BEQ
                if (this.registers[rs1] === this.registers[rs2]) nextPC = (this.PC + imm) >>> 0;
            } else if (funct3 === 0x1) { // BNE
                if (this.registers[rs1] !== this.registers[rs2]) nextPC = (this.PC + imm) >>> 0;
            } else {
                return { error: `Unsupported branch funct3=${funct3}` };
            }
        }
        // For data (.word) treated as raw memory; executed as instruction but typically won't be used as instruction
        else {
            return { error: `Unsupported opcode: 0x${opcode.toString(16)}` };
        }

        // enforce x0 = 0
        this.registers[0] = 0;
        this.PC = nextPC >>> 0;
        return { ok: true };
    }

    run(maxCycles = 1000) {
        let cycles = 0;
        while (cycles < maxCycles) {
            const res = this.step();
            cycles++;
            if (res.error) return { error: res.error, cycles };
        }
        return { cycles };
    }
}
