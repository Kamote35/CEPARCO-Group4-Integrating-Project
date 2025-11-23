import { REG_MAP } from './constants.js';
//registers to binary
import { toBinary, formatHex } from './utils.js';
//number formtting (ex. dec to bin, 2A to 002A)

export function parseRType(parts, def) {
//parse r type instruction
    const [_, funct7, funct3, opcode] = def;
    //extract the components of the instruction from def
    
    const rd = REG_MAP[parts[1]];
    //rd
    const rs1 = REG_MAP[parts[2]];
    //rs1
    const rs2 = REG_MAP[parts[3]];
    //rs2
    
    if (!rd) return `Invalid destination register: ${parts[1]}`;
    if (!rs1) return `Invalid source register 1: ${parts[2]}`;
    if (!rs2) return `Invalid source register 2: ${parts[3]}`;
    //to check if register exist

    return `${funct7}${rs2}${rs1}${funct3}${rd}${opcode}`;
    //format binary instruction in RISC-V R-Type format
}

export function parseIType(parts, def, instr) {
//parse i type instruction
    const [_, opcode, funct3] = def;
    //extract opcode and function code
    const rd = REG_MAP[parts[1]];
    //rd
    const rs1 = REG_MAP[parts[2]];
    //rs1
    const imm = parseInt(parts[3]);
    //parse imm

    if (!rd) return `Invalid destination register: ${parts[1]}`;
    if (!rs1) return `Invalid source register 1: ${parts[2]}`;
    if (isNaN(imm)) return `Invalid immediate value: ${parts[3]}`;
    //to check if inputs exist

    if (imm < -2048 || imm > 2047) return `Immediate value out of range (-2048 to 2047)`;
    //check range is within
    
    const imm_bin = toBinary(imm, 12);
    //make it a 12 bit binary
    return `${imm_bin}${rs1}${funct3}${rd}${opcode}`;
    //format binary instruction
}

export function parseLoadType(parts, def) {
//parse load type instruction
    const [_, opcode, funct3] = def;
    //extract opcode and function code
    const rd = REG_MAP[parts[1]];
    //rd
    const memOperand = parts[2].match(/(-?\d+)\((x\d+|[a-z]+)\)/);
    //extract memory operand components: offset and base register

    if (!memOperand) return `Invalid load format.`;
    //check memOperand format

    const imm = parseInt(memOperand[1]);
    //offset
    const rs1 = REG_MAP[memOperand[2]];
    //base reg

    if (!rd) return `Invalid destination register: ${parts[1]}`;
    if (!rs1) return `Invalid base register: ${memOperand[2]}`;
    if (isNaN(imm)) return `Invalid immediate offset`;
    //check regs

    if (imm < -2048 || imm > 2047) return `Offset out of range`;
    //check offset range
    
    const imm_bin = toBinary(imm, 12);
    return `${imm_bin}${rs1}${funct3}${rd}${opcode}`;
    //same format with i type
}

export function parseSType(parts, def) {
//parse s type instruction
    const [_, opcode, funct3] = def;
    const rs2 = REG_MAP[parts[1]];
    //source reg
    const memOperand = parts[2].match(/(-?\d+)\((x\d+|[a-z]+)\)/);
    //extract memory operand components: offset and base register

    if (!memOperand) return `Invalid store format.`;
    //check memOperand format

    const imm = parseInt(memOperand[1]);
    //offset
    const rs1 = REG_MAP[memOperand[2]];
    //base reg

    if (!rs2) return `Invalid source register: ${parts[1]}`;
    if (!rs1) return `Invalid base register: ${memOperand[2]}`;
     //check the regs
    
    if (imm < -2048 || imm > 2047) return `Offset out of range`;
    //check if offset in range

    const imm_bin = toBinary(imm, 12);
    //make imm_bin to 12 bit binary
    const imm_11_5 = imm_bin.substring(0, 7);
    //11-5 bit of imm
    const imm_4_0 = imm_bin.substring(7);
    //4-0 bit of imm

    return `${imm_11_5}${rs2}${rs1}${funct3}${imm_4_0}${opcode}`;
    //format: [imm 11-5][rs2][rs1][funct3][imm 4-0][opcode]
}

export function parseBType(parts, def, labelMap, currentAddr) {
//parse b type instruction
    const [_, opcode, funct3] = def;
    const rs1 = REG_MAP[parts[1]];
    //first comparison
    const rs2 = REG_MAP[parts[2]];
    //second comparison
    const label = parts[3];
    //branch target

    if (!rs1) return `Invalid source register 1`;
    if (!rs2) return `Invalid source register 2`;
    if (!labelMap.hasOwnProperty(label)) return `Undefined label: ${label}`;
    //check regs and label

    const labelAddr = labelMap[label];
    const offset = labelAddr - currentAddr;
    //calculate offset

    if (offset % 2 !== 0) return `Branch offset not even`;
    if (offset < -4096 || offset > 4094) return `Branch offset out of range`;
    //check offset

    const imm_bin = toBinary(offset, 13);
    //make imm-bin 13 bit binary
    const imm_12 = imm_bin[0];
    //bit 12 of imm
    const imm_11 = imm_bin[1];
    //bit 11 of imm
    const imm_10_5 = imm_bin.substring(2, 8);
    //bit 10-5 of imm
    const imm_4_1 = imm_bin.substring(8, 12);
    //bit 4-0 of imm

    return `${imm_12}${imm_10_5}${rs2}${rs1}${funct3}${imm_4_1}${imm_11}${opcode}`;
    //format: [imm 12][imm 10-5][rs2][rs1][funct3][imm 4-1][imm 11][opcode]
}
