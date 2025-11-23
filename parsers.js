import { REG_MAP } from './constants.js';
import { toBinary, formatHex } from './utils.js';

export function parseRType(parts, def) {
    const [_, funct7, funct3, opcode] = def;
    const rd = REG_MAP[parts[1]];
    const rs1 = REG_MAP[parts[2]];
    const rs2 = REG_MAP[parts[3]];
    
    if (!rd) return `Invalid destination register: ${parts[1]}`;
    if (!rs1) return `Invalid source register 1: ${parts[2]}`;
    if (!rs2) return `Invalid source register 2: ${parts[3]}`;

    return `${funct7}${rs2}${rs1}${funct3}${rd}${opcode}`;
}

export function parseIType(parts, def, instr) {
    const [_, opcode, funct3] = def;
    const rd = REG_MAP[parts[1]];
    const rs1 = REG_MAP[parts[2]];
    const imm = parseInt(parts[3]);

    if (!rd) return `Invalid destination register: ${parts[1]}`;
    if (!rs1) return `Invalid source register 1: ${parts[2]}`;
    if (isNaN(imm)) return `Invalid immediate value: ${parts[3]}`;

    if (imm < -2048 || imm > 2047) return `Immediate value out of range (-2048 to 2047)`;
    
    const imm_bin = toBinary(imm, 12);
    return `${imm_bin}${rs1}${funct3}${rd}${opcode}`;
}

export function parseLoadType(parts, def) {
    const [_, opcode, funct3] = def;
    const rd = REG_MAP[parts[1]];
    const memOperand = parts[2].match(/(-?\d+)\((x\d+|[a-z]+)\)/);

    if (!memOperand) return `Invalid load format.`;

    const imm = parseInt(memOperand[1]);
    const rs1 = REG_MAP[memOperand[2]];

    if (!rd) return `Invalid destination register: ${parts[1]}`;
    if (!rs1) return `Invalid base register: ${memOperand[2]}`;
    if (isNaN(imm)) return `Invalid immediate offset`;

    if (imm < -2048 || imm > 2047) return `Offset out of range`;
    
    const imm_bin = toBinary(imm, 12);
    return `${imm_bin}${rs1}${funct3}${rd}${opcode}`;
}

export function parseSType(parts, def) {
    const [_, opcode, funct3] = def;
    const rs2 = REG_MAP[parts[1]];
    const memOperand = parts[2].match(/(-?\d+)\((x\d+|[a-z]+)\)/);

    if (!memOperand) return `Invalid store format.`;

    const imm = parseInt(memOperand[1]);
    const rs1 = REG_MAP[memOperand[2]];

    if (!rs2) return `Invalid source register: ${parts[1]}`;
    if (!rs1) return `Invalid base register: ${memOperand[2]}`;
    
    if (imm < -2048 || imm > 2047) return `Offset out of range`;

    const imm_bin = toBinary(imm, 12);
    const imm_11_5 = imm_bin.substring(0, 7);
    const imm_4_0 = imm_bin.substring(7);

    return `${imm_11_5}${rs2}${rs1}${funct3}${imm_4_0}${opcode}`;
}

export function parseBType(parts, def, labelMap, currentAddr) {
    const [_, opcode, funct3] = def;
    const rs1 = REG_MAP[parts[1]];
    const rs2 = REG_MAP[parts[2]];
    const label = parts[3];

    if (!rs1) return `Invalid source register 1`;
    if (!rs2) return `Invalid source register 2`;
    if (!labelMap.hasOwnProperty(label)) return `Undefined label: ${label}`;

    const labelAddr = labelMap[label];
    const offset = labelAddr - currentAddr;

    if (offset % 2 !== 0) return `Branch offset not even`;
    if (offset < -4096 || offset > 4094) return `Branch offset out of range`;

    const imm_bin = toBinary(offset, 13);
    const imm_12 = imm_bin[0];
    const imm_11 = imm_bin[1];
    const imm_10_5 = imm_bin.substring(2, 8);
    const imm_4_1 = imm_bin.substring(8, 12);

    return `${imm_12}${imm_10_5}${rs2}${rs1}${funct3}${imm_4_1}${imm_11}${opcode}`;
}