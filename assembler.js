import { INSTR_MAP } from './constants.js';
import { toBinary, binToHex, formatHex } from './utils.js';
import * as Parsers from './parsers.js';

/**
 * Main assemble function. 
 * Returns object: { success: boolean, data: string (output), error: string (message), line: number }
 */
export function assembleCode(code) {
    const lines = code.split('\n'); // split code into lines
    const labelMap = {};
    const programLines = [];
    let currentAddr = 0x80; // starting address of each opcode in mem
    
    // --- Pass 1: Map Labels ---
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim(); // trim leading/trailing whitespace then assign the current line to line
        const commentIndex = line.indexOf('#'); // gets the first instance of a '#'
        if (commentIndex !== -1) line = line.substring(0, commentIndex).trim(); // removes the comment
        if (line.length === 0) continue; // skip empty lines

        const labelIndex = line.indexOf(':'); // returns the index of the first occurrence of an ':'
        if (labelIndex !== -1) { // checks if a label is present
            const label = line.substring(0, labelIndex).trim(); // extracts the label name
            if (labelMap.hasOwnProperty(label)) { // check duplicate label names
                return { success: false, error: `Duplicate label: ${label}`, line: i };
            }
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) { // check if valid label name 
                return { success: false, error: `Invalid label: ${label}`, line: i };
            }
            labelMap[label] = currentAddr; // map a label name to it's corresponding address
            line = line.substring(labelIndex + 1).trim(); // get the instruction that follows after label name
        }

        if (line.length > 0) { // push remaining instructions into array
            programLines.push({ line, addr: currentAddr, lineNum: i }); // stores all information about the instruction into array object
            currentAddr += 4;
        }
    }

    // --- Pass 2: Generate Opcodes ---
    let output = [];

    for (const { line, addr, lineNum } of programLines) {
        const parts = line.split(/[\s,()]+/); // tokeninze by spaces, commas, and parentheses
        const instr = parts[0].toLowerCase(); // normalize instruction to lowercase
        
        let binaryInstr = null;
        let errorMessage = null;

        if (instr === '.word') { // checks if .word directive
            if (parts.length !== 2) { // error check for .word directive
                errorMessage = `'.word' expects 1 arg.`;
            } else {
                let numVal = parts[1].startsWith('0x') ? parseInt(parts[1].substring(2), 16) : parseInt(parts[1]); // check if string starts with "0x" then parse to hex, else parse the decimal
                if (isNaN(numVal)) errorMessage = `Invalid number: ${parts[1]}`; // check if decimal value is a number
                else binaryInstr = toBinary(numVal, 32); // convert decimal value to 32-bit binary string then stores the binary opcode
            }
        } else {
            const def = INSTR_MAP[instr];
            if (!def) { // check if instruction exists in map
                errorMessage = `Unknown instruction: ${instr}`;
            } else {
                const type = def[0]; // get instruction type
                let instrParts = line.replace(/,/g, ' ').split(/\s+/).filter(Boolean); // separates a line by spaces and splits them by spaces
                
                try { //dispatch to instruction-specific parser
                    if (type === 'R') errorMessage = Parsers.parseRType(instrParts, def);
                    else if (type === 'I') errorMessage = Parsers.parseIType(instrParts, def, instr);
                    else if (type === 'L') errorMessage = Parsers.parseLoadType(instrParts, def);
                    else if (type === 'S') errorMessage = Parsers.parseSType(instrParts, def);
                    else if (type === 'B') errorMessage = Parsers.parseBType(instrParts, def, labelMap, addr);
                    
                    // If errorMessage is a 32-char string, it's actually the binary code
                    if (typeof errorMessage === 'string' && /^[01]{32}$/.test(errorMessage)) { // check if the returned string is in a 32-bit format
                        binaryInstr = errorMessage;
                        errorMessage = null; //clear error flag
                    }
                } catch (e) {
                    errorMessage = `Internal error: ${e.message}`;
                }
            }
        }

        if (errorMessage) { //handle errors encountered during the process
            return { success: false, error: errorMessage, line: lineNum };
        }

        if (binaryInstr) { //format successful output
            output.push(`${formatHex(addr.toString(16), 4)}: ${binToHex(binaryInstr)}`);
        }
    }

    return { success: true, data: output.join('\n') };
}