import { assembleCode } from './assembler.js';
import * as Memory from './memory.js';
import { formatHex } from './utils.js';
import * as Registers from './registers.js'; 

const assembleButton = document.getElementById('assembleButton');
const assemblyInput = document.getElementById('assemblyInput');
const opcodeOutput = document.getElementById('opcodeOutput');
const errorOutput = document.getElementById('errorOutput');
const registerContainer = document.getElementById('registerContainer');
const resetRegBtn = document.getElementById('resetRegBtn');

// Memory UI Elements
const memoryBody = document.getElementById('memoryBody');
const gotoInput = document.getElementById('gotoAddr');
const gotoBtn = document.getElementById('gotoBtn');

// Default placeholder
assemblyInput.value = `    addi x1, x6, 1
    sw x1, 4(x0)      # Store to Data Memory
    .word 0xDEADBEEF  # Store to Program Memory`;

// --- Event Listeners ---
if (resetRegBtn) {
    resetRegBtn.addEventListener('click', () => {
        Registers.resetRegisters();
        updateRegisterDisplay();
    });
}

assembleButton.addEventListener('click', () => {
    const code = assemblyInput.value;
    
    opcodeOutput.textContent = '';
    errorOutput.textContent = 'Processing...';
    errorOutput.className = 'whitespace-pre-wrap text-gray-400';

    const result = assembleCode(code);

    if (result.success) {
        opcodeOutput.textContent = result.data;
        errorOutput.textContent = 'No errors.';
        errorOutput.className = 'whitespace-pre-wrap text-green-400';

        try {
            // 1. Reset and Load Memory
            Memory.resetMemory();
            Memory.loadProgramToMemory(result.data);
            
            // 2. Update the GUI
            updateRegisterDisplay();
            updateMemoryDisplay();
            
        } catch (e) {
            errorOutput.textContent = `Memory Error: ${e.message}`;
            errorOutput.className = 'whitespace-pre-wrap text-red-400';
        }
    } else {
        errorOutput.textContent = `Error on line ${result.line + 1}: ${result.error}`;
        errorOutput.className = 'whitespace-pre-wrap text-red-400';
    }
});

// "Go To" Button Logic
gotoBtn.addEventListener('click', () => {
    const target = gotoInput.value.trim();
    // Simple logic to scroll element into view would go here
    // For now, we rely on the user scrolling or Ctrl+F
    const rowId = `mem-row-${target.toLowerCase().replace('0x', '')}`;
    const row = document.getElementById(rowId);
    if(row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
});


// --- The Render Function ---

function updateRegisterDisplay() {
    if (!registerContainer) return; // Nothing to update if container missing
    registerContainer.innerHTML = ''; // Clear current list
    const regs = Registers.getRegisters();

    regs.forEach((val, index) => {
        const regName = `x${index}`;
        const alias = Registers.REG_NAMES[index];
        
        // Create container for one register row
        const row = document.createElement('div');
        row.className = "flex items-center justify-between bg-gray-900 p-2 rounded border border-gray-700";

        // Label: "x1 (ra)"
        const label = document.createElement('span');
        label.className = "text-cyan-400 font-mono font-bold w-16";
        label.textContent = alias ? `${regName} (${alias})` : regName;

        // Input Field
        const input = document.createElement('input');
        input.type = "text";
        input.className = "bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 font-mono text-sm w-full ml-2 focus:outline-none focus:ring-1 focus:ring-cyan-500";
        
        // Display value as Hex (0x...)
        input.value = formatHex(val.toString(16));

        // Special handling for x0 (Read Only)
        if (index === 0) {
            input.disabled = true;
            input.className += " opacity-50 cursor-not-allowed";
        } else {
            // Event Listener: Update register value on change
            input.addEventListener('change', (e) => {
                let newValStr = e.target.value.trim();
                let newVal;

                // Handle Hex (0x) or Decimal input
                if (newValStr.toLowerCase().startsWith('0x')) {
                    newVal = parseInt(newValStr, 16);
                } else {
                    newVal = parseInt(newValStr, 10);
                }

                if (!isNaN(newVal)) {
                    Registers.setRegister(index, newVal);
                    // Re-format to hex for display consistency
                    input.value = formatHex(Registers.getRegister(index).toString(16));
                    
                    // Visual feedback (flash green)
                    input.classList.add('border-green-500');
                    setTimeout(() => input.classList.remove('border-green-500'), 500);
                } else {
                    // Invalid input: revert to previous value
                    input.value = formatHex(Registers.getRegister(index).toString(16));
                    input.classList.add('border-red-500');
                    setTimeout(() => input.classList.remove('border-red-500'), 500);
                }
            });
        }

        row.appendChild(label);
        row.appendChild(input);
        registerContainer.appendChild(row);
    });
}

function updateMemoryDisplay() {
    const memState = Memory.getMemoryState(); // Returns Uint8Array(256)
    memoryBody.innerHTML = ''; // Clear existing rows

    // We loop by 4 because we want to show 32-bit Words (4 bytes) per row
    for (let addr = 0; addr < 256; addr += 4) {
        
        // 1. Get the 4 individual bytes
        const b0 = memState[addr];
        const b1 = memState[addr + 1];
        const b2 = memState[addr + 2];
        const b3 = memState[addr + 3];

        // 2. Format bytes for display (2 digits hex)
        const h0 = b0.toString(16).toUpperCase().padStart(2, '0');
        const h1 = b1.toString(16).toUpperCase().padStart(2, '0');
        const h2 = b2.toString(16).toUpperCase().padStart(2, '0');
        const h3 = b3.toString(16).toUpperCase().padStart(2, '0');

        // 3. Create the Word view (Big Endian for display: MSB at left)
        // Note: Memory is Little Endian, so b3 is MSB.
        const wordHex = `0x${h3}${h2}${h1}${h0}`;

        // 4. Determine Segment Color
        // Data Segment: 0x0000 - 0x007F (Cyan tint)
        // Program Segment: 0x0080 - 0x00FF (Purple tint)
        const isProgram = addr >= 0x80;
        const rowClass = isProgram ? "bg-gray-800/50 hover:bg-gray-700" : "bg-gray-900 hover:bg-gray-800";
        const addrColor = isProgram ? "text-purple-400" : "text-cyan-400";

        // 5. Create Row HTML
        const tr = document.createElement('tr');
        tr.className = `border-b border-gray-800 ${rowClass} transition-colors`;
        // Add ID for the "Go To" button to find
        tr.id = `mem-row-${addr.toString(16).padStart(4,'0')}`;

        tr.innerHTML = `
            <td class="p-3 ${addrColor} font-bold">${formatHex(addr.toString(16), 4)}</td>
            <td class="p-3 text-gray-400">${h0}</td>
            <td class="p-3 text-gray-400">${h1}</td>
            <td class="p-3 text-gray-400">${h2}</td>
            <td class="p-3 text-gray-400">${h3}</td>
            <td class="p-3 text-right font-mono text-white tracking-wide">${wordHex}</td>
        `;

        memoryBody.appendChild(tr);
    }
}