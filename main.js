import { assembleCode } from './assembler.js';
import * as Memory from './memory.js';
import { formatHex } from './utils.js';
import * as Registers from './registers.js'; 
import * as CPU from './cpu.js';

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

// --- Global Variables for Pipeline Map ---
let cycleCount = 0;
let pipelineHistory = []; // Stores the snapshot of every cycle

// Configuration: Defines which registers appear in the map rows
// This matches the Excel reference format
const MAP_ROWS = [
    // --- IF Stage ---
    { label: "IF/ID.IR",  path: (s) => s.IF_ID.IR,  section: "IF" },
    { label: "PC",        path: (s) => s.IF_ID.PC,  section: "IF" },
    
    // --- ID Stage ---
    { label: "ID/EX.A",   path: (s) => s.ID_EX.A,   section: "ID" },
    { label: "ID/EX.B",   path: (s) => s.ID_EX.B,   section: "ID" },
    { label: "ID/EX.IMM", path: (s) => s.ID_EX.IMM, section: "ID" },
    { label: "ID/EX.IR",  path: (s) => s.ID_EX.IR,  section: "ID" },

    // --- EX Stage ---
    { label: "EX/MEM.ALU",path: (s) => s.EX_MEM.ALUOutput, section: "EX" },
    { label: "EX/MEM.IR", path: (s) => s.EX_MEM.IR,        section: "EX" },
    { label: "EX/MEM.B",  path: (s) => s.EX_MEM.B,         section: "EX" },

    // --- MEM Stage ---
    { label: "MEM/WB.LMD",path: (s) => s.MEM_WB.LMD,       section: "MEM" },
    { label: "MEM/WB.IR", path: (s) => s.MEM_WB.IR,        section: "MEM" },
    { label: "MEM/WB.ALU",path: (s) => s.MEM_WB.ALUOutput, section: "MEM" }
];

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

// CPU / Execution Buttons
const stepBtn = document.getElementById('stepBtn');
const runBtn = document.getElementById('runBtn');
const resetCpuBtn = document.getElementById('resetCpuBtn');

if (stepBtn) {
    stepBtn.addEventListener('click', () => {
        try {
            CPU.step();
            recordCycleState();

            updateRegisterDisplay();
            updateMemoryDisplay();
            updatePipelineDisplay();
            renderPipelineMap();
        } catch (e) {
            errorOutput.textContent = `CPU Error: ${e.message}`;
            errorOutput.className = 'whitespace-pre-wrap text-red-400';
        }
    });
}

if (runBtn) {
    runBtn.addEventListener('click', () => {
        try {
            runBtn.disabled = true;
            stepBtn.disabled = true;
            let cycles = 0;
            const maxCycles = 1000;
            while(CPU.isRunning() || cycles < maxCycles) {
                if(CPU.getPC() < 0x80 || CPU.getPC() > 0xFF) break;

                CPU.step();
                recordCycleState(); // Record every step
                cycles++;
            }

            updateRegisterDisplay();
            updateMemoryDisplay();
            updatePipelineDisplay();
            renderPipelineMap();
        } catch (e) {
            errorOutput.textContent = `CPU Run Error: ${e.message}`;
            errorOutput.className = 'whitespace-pre-wrap text-red-400';
        } finally {
            runBtn.disabled = false;
            stepBtn.disabled = false;
        }
    });
}

if (resetCpuBtn) {
    resetCpuBtn.addEventListener('click', () => {
        CPU.reset();
        Registers.resetRegisters();

        // Reset Map Data
        cycleCount = 0;
        pipelineHistory = [];
        renderPipelineMap();

        updateRegisterDisplay();
        updateMemoryDisplay();
        updatePipelineDisplay()
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
           // Only load the new program code. Data segment (0x00-0x7F) remains untouched.
            Memory.loadProgramToMemory(result.data);
            // Reset CPU PC to program start so user can run/step immediately
            CPU.reset();
            
            // 2. Update the GUI
            updateRegisterDisplay();
            updateMemoryDisplay();
            updatePipelineDisplay();
            
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

/**
 * Captures the current CPU state and pushes it to history.
 */
function recordCycleState() {
    cycleCount++;
    
    // Get current state from CPU
    const currentState = CPU.getPipelineRegisters();
    
    // Create a DEEP COPY so it doesn't change later as the CPU runs
    const snapshot = JSON.parse(JSON.stringify(currentState));
    
    pipelineHistory.push({
        cycle: cycleCount,
        state: snapshot
    });
}

/**
 * Renders the Pipeline Map Table based on history.
 */
function renderPipelineMap() {
    const table = document.getElementById('pipelineMapTable');
    if (!table) return;

    // 1. Clear Table
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // 2. Build Header Row (Cycles)
    const headerRow = document.createElement('tr');
    
    // Corner Cell
    const cornerTh = document.createElement('th');
    cornerTh.className = "p-2 font-bold text-gray-300 min-w-[150px]";
    cornerTh.textContent = "Register / Stage";
    headerRow.appendChild(cornerTh);

    // Cycle Headers
    pipelineHistory.forEach(entry => {
        const th = document.createElement('th');
        th.className = "p-2 min-w-[100px] text-center border-l border-gray-700";
        th.textContent = `Cycle ${entry.cycle}`;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // 3. Build Data Rows
    MAP_ROWS.forEach((rowConfig, index) => {
        const tr = document.createElement('tr');
        
        // Add visual separation between sections (IF, ID, EX, MEM)
        if (index > 0 && MAP_ROWS[index-1].section !== rowConfig.section) {
            tr.className = "border-t-2 border-gray-700"; 
        } else {
            tr.className = "border-b border-gray-800 hover:bg-gray-800/50";
        }

        // Row Label (Sticky Left)
        const tdLabel = document.createElement('td');
        tdLabel.className = "p-2 font-mono text-cyan-400 font-bold text-xs";
        tdLabel.textContent = rowConfig.label;
        tr.appendChild(tdLabel);

        // Data Cells for each cycle
        pipelineHistory.forEach(entry => {
            const td = document.createElement('td');
            td.className = "p-2 text-center border-l border-gray-800 text-gray-300 font-mono text-xs";
            
            // Extract value using the path function
            const rawVal = rowConfig.path(entry.state);
            
            // Format to Hex
            td.textContent = formatHex((rawVal >>> 0).toString(16));
            
            // Highlight Non-Zero Instructions (IR) for readability
            if (rowConfig.label.includes("IR") && rawVal !== 0) {
                td.className += " text-yellow-200 bg-yellow-900/20";
            }
            
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

// --- The Render Function ---

function updateRegisterDisplay() {
    if (!registerContainer) return; 
    registerContainer.innerHTML = ''; 
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
        input.value = formatHex((val >>> 0).toString(16));

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
                    input.value = formatHex((Registers.getRegister(index) >>> 0).toString(16));
                    
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

    // Loop by 4 bytes (Word alignment)
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

        // 3. Create the Word view (Big Endian representation for readability)
        const wordHex = `0x${h3}${h2}${h1}${h0}`;

        // 4. Determine Segment Logic
        // Data Segment: 0x00 - 0x7F (Editable)
        // Program Segment: 0x80 - 0xFF (Read-Only)
        const isProgram = addr >= 0x80;
        const rowClass = isProgram ? "bg-gray-800/50" : "bg-gray-900 hover:bg-gray-800";
        const addrColor = isProgram ? "text-purple-400" : "text-cyan-400";

        // 5. Create Row
        const tr = document.createElement('tr');
        tr.className = `border-b border-gray-800 ${rowClass} transition-colors`;
        tr.id = `mem-row-${addr.toString(16).padStart(4,'0')}`;

        // Address Column
        const tdAddr = document.createElement('td');
        tdAddr.className = `p-3 ${addrColor} font-bold font-mono`;
        tdAddr.textContent = formatHex(addr.toString(16), 4);
        tr.appendChild(tdAddr);

        // Helper to generate a cell (either Input or Text)
        const createByteCell = (byteVal, hexVal, offset) => {
            const td = document.createElement('td');
            td.className = "p-2";

            if (!isProgram) {
                // --- EDITABLE INPUT for Data Segment ---
                const input = document.createElement('input');
                input.type = "text";
                input.value = hexVal;
                input.className = "w-10 bg-gray-800 text-white text-center border border-gray-600 rounded text-sm focus:border-cyan-500 focus:outline-none";
                input.maxLength = 2; // Limit to 2 hex chars

                // Event: Save on Change
                input.addEventListener('change', (e) => {
                    let valStr = e.target.value.trim();
                    // Auto-prepend 0x if missing for parsing
                    if (!valStr.startsWith('0x')) valStr = '0x' + valStr;
                    
                    let newVal = parseInt(valStr, 16);

                    if (!isNaN(newVal) && newVal >= 0 && newVal <= 255) {
                        Memory.storeByte(addr + offset, newVal);
                        // Update visual feedback (green border)
                        e.target.classList.add('border-green-500');
                        setTimeout(() => e.target.classList.remove('border-green-500'), 500);
                        
                        // Update the "Word" column immediately to reflect changes
                        // (Optional: you could just call updateMemoryDisplay() again to refresh all)
                        updateMemoryDisplay(); 
                    } else {
                        // Error feedback (red border)
                        e.target.classList.add('border-red-500');
                        e.target.value = hexVal; // Revert
                        setTimeout(() => e.target.classList.remove('border-red-500'), 500);
                    }
                });

                td.appendChild(input);
            } else {
                // --- READ-ONLY TEXT for Program Segment ---
                td.className += " text-gray-400 font-mono";
                td.textContent = hexVal;
            }
            return td;
        };

        // Append Byte Cells
        tr.appendChild(createByteCell(b0, h0, 0));
        tr.appendChild(createByteCell(b1, h1, 1));
        tr.appendChild(createByteCell(b2, h2, 2));
        tr.appendChild(createByteCell(b3, h3, 3));

        // Word Column (Read-Only Summary)
        const tdWord = document.createElement('td');
        tdWord.className = "p-3 text-right font-mono text-white tracking-wide opacity-70";
        tdWord.textContent = wordHex;
        tr.appendChild(tdWord);

        memoryBody.appendChild(tr);
    }
}

function updatePipelineDisplay() {
    const pipelineContainer = document.getElementById('pipelineContainer');
    if (!pipelineContainer) return;

    // 1. Fetch the latest state from the CPU
    // Ensure your cpu.js has the export function getPipelineRegisters() as discussed
    const pipeRegs = CPU.getPipelineRegisters(); 
    
    pipelineContainer.innerHTML = ''; // Clear previous

    // Define the stages and the keys we want to show for each
    const stages = [
        { name: "IF / ID", data: pipeRegs.IF_ID },
        { name: "ID / EX", data: pipeRegs.ID_EX },
        { name: "EX / MEM", data: pipeRegs.EX_MEM },
        { name: "MEM / WB", data: pipeRegs.MEM_WB }
    ];

    stages.forEach(stage => {
        // Create a Card for the Stage
        const card = document.createElement('div');
        card.className = "bg-gray-900 border border-gray-700 rounded p-3";
        
        // Header
        const title = document.createElement('h3');
        title.className = "text-cyan-400 font-bold border-b border-gray-700 pb-2 mb-2";
        title.textContent = stage.name;
        card.appendChild(title);

        // Data List
        const list = document.createElement('ul');
        list.className = "space-y-1 text-sm font-mono text-gray-300";

        // Iterate over keys (e.g., IR, NPC, A, B...)
        for (const [key, value] of Object.entries(stage.data)) {
            const li = document.createElement('li');
            li.className = "flex justify-between";
            
            const label = document.createElement('span');
            label.className = "text-gray-500";
            label.textContent = key + ":";

            const valSpan = document.createElement('span');
            // Format as Hex (32-bit unsigned)
            valSpan.textContent = formatHex((value >>> 0).toString(16)); 

            // Highlight IR (Instruction Register) specifically?
            if (key === "IR") valSpan.className = "text-yellow-200";
            else valSpan.className = "text-white";

            li.appendChild(label);
            li.appendChild(valSpan);
            list.appendChild(li);
        }
        
        card.appendChild(list);
        pipelineContainer.appendChild(card);
    });
}