// registers.js
import { formatHex } from './utils.js';

// 32 Registers, initialized to 0
const registers = new Int32Array(32);

export const REG_NAMES = [
    "zero", "ra", "sp", "gp", "tp", "t0", "t1", "t2",
    "s0/fp", "s1", "a0", "a1", "a2", "a3", "a4", "a5",
    "a6", "a7", "s2", "s3", "s4", "s5", "s6", "s7",
    "s8", "s9", "s10", "s11", "t3", "t4", "t5", "t6"
];

/**
 * Resets all registers to 0.
 */
export function resetRegisters() {
    registers.fill(0);
}

/**
 * Get the entire register file array.
 */
export function getRegisters() {
    return registers;
}

/**
 * Sets a specific register value.
 * Enforces x0 = 0. 
 * @param {number} index - Register index (0-31)
 * @param {number} value - 32-bit integer value
 */
export function setRegister(index, value) {
    if (index === 0) return; // x0 is hardwired to 0
    registers[index] = value;
}

/**
 * Gets a specific register value.
 */
export function getRegister(index) {
    return registers[index];
}