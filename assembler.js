import { INSTR_MAP } from './constants.js';
import { toBinary, binToHex, formatHex } from './utils.js';
import * as Parsers from './parsers.js';

/**
 * Main assemble function. 
 * Returns object: { success: boolean, data: string (output), error: string (message), line: number }
 */
export function assembleCode(code) {
    const lines = code.split('\n');
    const labelMap = {};
    const programLines = [];
    let currentAddr = 0x80; // starting address of each opcode in mem
    
    // --- Pass 1: Map Labels ---
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        const commentIndex = line.indexOf('#');
        if (commentIndex !== -1) line = line.substring(0, commentIndex).trim();
        if (line.length === 0) continue;

        const labelIndex = line.indexOf(':');
        if (labelIndex !== -1) {
            const label = line.substring(0, labelIndex).trim();
            if (labelMap.hasOwnProperty(label)) {
                return { success: false, error: `Duplicate label: ${label}`, line: i };
            }
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) {
                return { success: false, error: `Invalid label: ${label}`, line: i };
            }
            labelMap[label] = currentAddr;
            line = line.substring(labelIndex + 1).trim();
        }

        if (line.length > 0) {
            programLines.push({ line, addr: currentAddr, lineNum: i });
            currentAddr += 4;
        }
    }

    // --- Pass 2: Generate Opcodes ---
    let output = [];

    for (const { line, addr, lineNum } of programLines) {
        const parts = line.split(/[\s,()]+/);
        const instr = parts[0].toLowerCase();
        
        let binaryInstr = null;
        let errorMessage = null;

        if (instr === '.word') {
            if (parts.length !== 2) {
                errorMessage = `'.word' expects 1 arg.`;
            } else {
                let numVal = parts[1].startsWith('0x') ? parseInt(parts[1].substring(2), 16) : parseInt(parts[1]);
                if (isNaN(numVal)) errorMessage = `Invalid number: ${parts[1]}`;
                else binaryInstr = toBinary(numVal, 32);
            }
        } else {
            const def = INSTR_MAP[instr];
            if (!def) {
                errorMessage = `Unknown instruction: ${instr}`;
            } else {
                const type = def[0];
                let instrParts = line.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
                
                try {
                    if (type === 'R') errorMessage = Parsers.parseRType(instrParts, def);
                    else if (type === 'I') errorMessage = Parsers.parseIType(instrParts, def, instr);
                    else if (type === 'L') errorMessage = Parsers.parseLoadType(instrParts, def);
                    else if (type === 'S') errorMessage = Parsers.parseSType(instrParts, def);
                    else if (type === 'B') errorMessage = Parsers.parseBType(instrParts, def, labelMap, addr);
                    
                    // If errorMessage is a 32-char string, it's actually the binary code
                    if (typeof errorMessage === 'string' && /^[01]{32}$/.test(errorMessage)) {
                        binaryInstr = errorMessage;
                        errorMessage = null;
                    }
                } catch (e) {
                    errorMessage = `Internal error: ${e.message}`;
                }
            }
        }

        if (errorMessage) {
            return { success: false, error: errorMessage, line: lineNum };
        }

        if (binaryInstr) {
            output.push(`${formatHex(addr.toString(16), 4)}: ${binToHex(binaryInstr)}`);
        }
    }

    return { success: true, data: output.join('\n') };
}