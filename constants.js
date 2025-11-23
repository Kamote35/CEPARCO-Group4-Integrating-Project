export const REG_MAP = {
    'x0': '00000', 'zero': '00000', // Hardwired to 0
    'x1': '00001', 'ra': '00001', // Return address
    'x2': '00010', 'sp': '00010', // Stack pointer
    'x3': '00011', 'gp': '00011', // Global pointer
    'x4': '00100', 'tp': '00100', // Thread pointer
    'x5': '00101', 't0': '00101', // Temporary register 0
    'x6': '00110', 't1': '00110', // Temporary register 1
    'x7': '00111', 't2': '00111', // Temporary register 2

    // Saved registers
    'x8': '01000', 's0': '01000', 'fp': '01000', // Frame pointer
    'x9': '01001', 's1': '01001',

    // Function argument registers/ return values
    'x10': '01010', 'a0': '01010',
    'x11': '01011', 'a1': '01011',

    // More function argument registers
    'x12': '01100', 'a2': '01100',
    'x13': '01101', 'a3': '01101',
    'x14': '01110', 'a4': '01110',
    'x15': '01111', 'a5': '01111',
    'x16': '10000', 'a6': '10000',
    'x17': '10001', 'a7': '10001',

    // More saved registers
    'x18': '10010', 's2': '10010',
    'x19': '10011', 's3': '10011',
    'x20': '10100', 's4': '10100',
    'x21': '10101', 's5': '10101',
    'x22': '10110', 's6': '10110',
    'x23': '10111', 's7': '10111',
    'x24': '11000', 's8': '11000',
    'x25': '11001', 's9': '11001',
    'x26': '11010', 's10': '11010',
    'x27': '11011', 's11': '11011',

    // More temporary registers
    'x28': '11100', 't3': '11100',
    'x29': '11101', 't4': '11101',
    'x30': '11110', 't5': '11110',
    'x31': '11111', 't6': '11111',
};

export const INSTR_MAP = {
    // [type, opcode, funct3, funct7]
    'add':  ['R', '0110011', '000', '0000000'],
    'sub':  ['R', '0110011', '000', '0100000'],

    // [type, opcode, funct3, imm[11:0]]
    'addi': ['I', '0010011', '000'], 
    'lw':   ['L', '0000011', '010'], // L-type instruction (Load) for lw

    // [type, opcode, funct3, imm[11:5], imm[4:0]]
    'sw':   ['S', '0100011', '010'],

    // [type, opcode, funct3, imm[12], imm[10:5], imm[4:1], imm[11]]
    'beq':  ['B', '1100011', '000'],
    'bne':  ['B', '1100011', '001'],
};