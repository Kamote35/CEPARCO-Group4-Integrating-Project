import { INSTR_MAP } from './constants.js';
// loads table that describes instruction
import { toBinary, binToHex, formatHex } from './utils.js';
// helper converting bin to hex
import * as Parsers from './parsers.js';
// group of parsing function turns instruction to 32-bit bin string

/**
 * Main assemble function. 
 * code - contains all assembly functions
 * Returns object: { success: boolean, data: string (output), error: string (message), line: number }
 */
export function assembleCode(code) {
    const lines = code.split('\n');
	//break to lines
    const labelMap = {};
	//for storing the labels and the address
    const programLines = [];
	//store instruction lines
    let currentAddr = 0x80; 
	// starting address of each opcode in mem
    
    // --- Pass 1: Map Labels ---
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
	//remove start/end spaces
        const commentIndex = line.indexOf('#');
	//determine comments
        if (commentIndex !== -1) line = line.substring(0, commentIndex).trim();
        if (line.length === 0) continue;
	//if comment, remove, if not continue

        const labelIndex = line.indexOf(':');
	//check the label
        if (labelIndex !== -1) {
            const label = line.substring(0, labelIndex).trim();
		//get everything before the :
            if (labelMap.hasOwnProperty(label)) {
                return { success: false, error: `Duplicate label: ${label}`, line: i };
		//error if repeating label
            }
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) {
                return { success: false, error: `Invalid label: ${label}`, line: i };
		//valid characters only
            }
            labelMap[label] = currentAddr;
		//labelstored in the address in labelMap
            line = line.substring(labelIndex + 1).trim();
		//remove label part, leaving instructions
        }

        if (line.length > 0) {
            programLines.push({ line, addr: currentAddr, lineNum: i });
            currentAddr += 4;
		//store instructions with metadata, and increment by 4 bytes
        }
    }

    // --- Pass 2: Generate Opcodes ---
    let output = [];
	//store formatted output lines

    for (const { line, addr, lineNum } of programLines) {
        const parts = line.split(/[\s,()]+/);
	//tokenize
        const instr = parts[0].toLowerCase();
	//normalize
        
        let binaryInstr = null;
	//will hold 32 bit binary
        let errorMessage = null;
	//will hold parsing error

        if (instr === '.word') {
	//handle data directives
            if (parts.length !== 2) {
                errorMessage = `'.word' expects 1 arg.`;
            } else {
		//parse numeric value
                let numVal = parts[1].startsWith('0x') ? parseInt(parts[1].substring(2), 16) : parseInt(parts[1]);
                if (isNaN(numVal)) errorMessage = `Invalid number: ${parts[1]}`;
                else binaryInstr = toBinary(numVal, 32);
		//convert to 32 bit binary
            }
        } else {
		//handle regular instruction
            const def = INSTR_MAP[instr];
		//get instruction definition
            if (!def) {
                errorMessage = `Unknown instruction: ${instr}`;
            } else {
                const type = def[0];
		// Extract instruction type (R/I/L/S/B)
                let instrParts = line.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
		//clean tokens
                
                try {
                    if (type === 'R') errorMessage = Parsers.parseRType(instrParts, def);
                    else if (type === 'I') errorMessage = Parsers.parseIType(instrParts, def, instr);
                    else if (type === 'L') errorMessage = Parsers.parseLoadType(instrParts, def);
                    else if (type === 'S') errorMessage = Parsers.parseSType(instrParts, def);
                    else if (type === 'B') errorMessage = Parsers.parseBType(instrParts, def, labelMap, addr);
			//dispatch to instruction-specific parser
                    
                    // If errorMessage is a 32-char string, it's actually the binary code
                    if (typeof errorMessage === 'string' && /^[01]{32}$/.test(errorMessage)) {
                        binaryInstr = errorMessage;
			//get binary result
                        errorMessage = null;
			//clear error flag
                    }
                } catch (e) {
                    errorMessage = `Internal error: ${e.message}`;
			//catch parser exceptions
                }
            }
        }

        if (errorMessage) {
	//handle errors encountered during the process
            return { success: false, error: errorMessage, line: lineNum };
        }

        if (binaryInstr) {
	//format successful output
            output.push(`${formatHex(addr.toString(16), 4)}: ${binToHex(binaryInstr)}`);
		//AAAA:XXXXXXXX
        }
    }

    return { success: true, data: output.join('\n') };
	//return joined output lines
}
