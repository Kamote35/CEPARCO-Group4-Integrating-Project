import { assembleCode } from './assembler.js';
import * as Memory from './memory.js';

const assembleButton = document.getElementById('assembleButton');
const assemblyInput = document.getElementById('assemblyInput');
const opcodeOutput = document.getElementById('opcodeOutput');
const errorOutput = document.getElementById('errorOutput');

// Set default placeholder
assemblyInput.value = `    addi x1, x6, 1
    beq x1, x5, loop # Example
    lw x2, 4(x3)
    sw x2, 0(sp)
    .word 0xCEDBAF
loop:
    sub x1, x1, x2`;

assembleButton.addEventListener('click', () => {
    const code = assemblyInput.value;
    
    // Clear UI
    opcodeOutput.textContent = '';
    errorOutput.textContent = 'Processing...';
    errorOutput.className = 'whitespace-pre-wrap text-gray-400';

    // Run Assembler
    const result = assembleCode(code);

    if (result.success) {
        opcodeOutput.textContent = result.data;
        errorOutput.textContent = 'No errors.';
        errorOutput.className = 'whitespace-pre-wrap text-green-400';
        try {
            Memory.resetMemory(); // Clear old stuff
            Memory.loadProgramToMemory(result.data);
            console.log("Program loaded into memory successfully.");
        } catch (e) {
            errorOutput.textContent = `Memory Error: ${e.message}`;
        }
    } else {
        errorOutput.textContent = `Error on line ${result.line + 1}: ${result.error}`;
        errorOutput.className = 'whitespace-pre-wrap text-red-400';
    }
});