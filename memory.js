import { toBinary, formatHex } from './utils.js';

// Total memory size: 256 bytes (0x00 to 0xFF)
// Data Segment: 0x00 - 0x7F
// Text Segment: 0x80 - 0xFF
const MEM_SIZE = 256; 
const memory = new Uint8Array(MEM_SIZE); // 8 bits per index * 256 indices = 256 total bytes for µRISC

/**
 * Resets memory to all zeros.
 */
export function resetMemory() {
    memory.fill(0);
}

/**
 * Writes a single byte to a specific address.
 * @param {number} addr - Address (0 - 255)
 * @param {number} value - Byte value (0 - 255)
 */
export function storeByte(addr, value) {
    if (addr < 0 || addr >= MEM_SIZE) { // accessing outside µRISC memory bounds
        throw new Error(`Memory Access Violation: Address ${formatHex(addr.toString(16))} out of bounds.`);
    }
    memory[addr] = value & 0xFF; // keep only least significant 8-bits
}

/**
 * Reads a single byte from a specific address.
 */
export function loadByte(addr) {
    if (addr < 0 || addr >= MEM_SIZE) { // accessing outside µRISC memory bounds
        throw new Error(`Memory Access Violation: Address ${formatHex(addr.toString(16))} out of bounds.`);
    }
    return memory[addr];
}

/**
 * Writes a 32-bit Word (4 bytes) in Little Endian format.
 * Used for storing instructions or full integer data.
 */
export function storeWord(addr, value) {
    // Check bounds (we need 4 bytes space)
    if (addr < 0 || addr > MEM_SIZE - 4) { // stores 4 bytes (32bit word) at a time hence MEM_SIZE - 4
        throw new Error(`Memory Access Violation: Address ${formatHex(addr.toString(16))} out of bounds for Word store.`);
    }

    // Little Endian: LSB at the lowest address
    memory[addr]     =  value & 0xFF;         // Byte 0: no bit shift, mask least sig 8-bits
    memory[addr + 1] = (value >> 8)  & 0xFF;  // Byte 1: bit shift by 8 (skips a byte) to the right, mask least sig 8-bits
    memory[addr + 2] = (value >> 16) & 0xFF;  // Byte 2: bit shift by 16 (skips two bytes) to the right, mask least sig 8-bits
    memory[addr + 3] = (value >> 24) & 0xFF;  // Byte 3 (MSB): bit shift by 24 (skips three bytes) to the right, mask least sig 8-bits
}

/**
 * Reads a 32-bit Word (4 bytes) and combines them.
 */
export function loadWord(addr) {
    if (addr < 0 || addr > MEM_SIZE - 4) { // stores 4 bytes (32bit word) at a time hence MEM_SIZE - 4
        throw new Error(`Memory Access Violation: Address ${formatHex(addr.toString(16))} out of bounds for Word load.`);
    }

    // Combine bytes: b0 | (b1 << 8) | ...
    // We use >>> 0 to ensure we interpret it as an unsigned integer if needed, 
    // though JS bitwise usually results in signed 32-bit.
    const byte0 = memory[addr];
    const byte1 = memory[addr + 1];
    const byte2 = memory[addr + 2];
    const byte3 = memory[addr + 3];

   
    // assemble unsigned 32-bit value (returns 0..2^32-1)
    return ( (byte0 & 0xFF) | ((byte1 & 0xFF) << 8) | ((byte2 & 0xFF) << 16) | ((byte3 & 0xFF) << 24) ) >>> 0;
}

/**
 * Helper to load the Machine Code output into the Program Segment (0x80)
 * @param {string} hexOutput - The string output from the assembler (e.g., "0x0080: 0x12345678...")
 */
export function loadProgramToMemory(hexOutput) {
    // Clear Program Segment (0x80 - 0xFF) first if you want
    memory.fill(0, 0x80, 0xFF); 

    const lines = hexOutput.split('\n');
    lines.forEach(line => {
        // Line format: "0x0080: 0x00500093"
        const parts = line.split(':'); // split the hex address to its hex data
        if (parts.length === 2) {
            const addrStr = parts[0].trim(); 
            const valStr = parts[1].trim();

            const addr = parseInt(addrStr, 16); // converts into a base-16 int
            const val = parseInt(valStr, 16);

            storeWord(addr, val); // writes the program's current address and data into memory (should start at 0x80 and should not exceet 0xFF)
        }
    });
}

/**
 * Debug Helper: Returns the entire memory array for the GUI to render.
 */
export function getMemoryState() {
    return memory;
}