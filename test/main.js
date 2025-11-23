import { assembleCode } from './assembler.js';
import { Simulator } from './simulator.js';

const assembleButton = document.getElementById('assembleButton');
const assemblyInput = document.getElementById('assemblyInput');
const opcodeOutput = document.getElementById('opcodeOutput');
const errorOutput = document.getElementById('errorOutput');
const memoryTable = document.getElementById('memoryTable');
const registersGrid = document.getElementById('registersGrid');
const stepButton = document.getElementById('stepButton');
const runButton = document.getElementById('runButton');
const resetButton = document.getElementById('resetButton');
const pcDisplay = document.getElementById('pcDisplay');
const gotoAddr = document.getElementById('gotoAddr');
const gotoBtn = document.getElementById('gotoBtn');

// simulator instance
const sim = new Simulator();

let lastHighlightedAddr = null;
let shouldScrollOnRender = false;

function byteToHex(b) {
    return b.toString(16).padStart(2, '0').toUpperCase();
}

function renderMemory() {
    // Render addresses 0x0000 - 0x007F as rows of 16 bytes
    const start = 0x0000;
    const end = 0x007F;
    const rows = [];
    for (let addr = start; addr <= end; addr += 16) {
        const cols = [];
        for (let i = 0; i < 16; i++) {
            const a = addr + i;
            const v = sim.memory[a];
            cols.push(`<td class="p-0"><input data-addr="${a}" class="memory-byte w-12 p-1 bg-gray-800 border border-gray-700 text-sm text-white text-center" value="${byteToHex(v)}"></td>`);
        }
        rows.push(`<tr id="row-${addr}"><td class="px-2 text-gray-300">${addr.toString(16).padStart(4,'0').toUpperCase()}</td>${cols.join('')}</tr>`);
    }
    memoryTable.innerHTML = `<thead><tr><th class="w-20 text-left text-gray-300">Addr</th>${Array.from({length:16}).map((_,i)=>`<th class="text-gray-400 text-center">+${i.toString(16).toUpperCase().padStart(2,'0')}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody>`;

    // attach listeners to inputs
    const inputs = memoryTable.querySelectorAll('input.memory-byte');
    inputs.forEach(inp => {
        inp.addEventListener('change', (e) => {
            const el = e.target;
            const addr = parseInt(el.dataset.addr, 10);
            const v = el.value.trim();
            let num = NaN;
            if (/^0x[0-9a-fA-F]+$/.test(v)) num = parseInt(v.substring(2), 16);
            else if (/^[0-9]+$/.test(v)) num = parseInt(v, 10);
            else if (/^[0-9a-fA-F]{1,2}$/.test(v)) num = parseInt(v, 16);
            if (!isNaN(num)) {
                sim.memory[addr] = num & 0xFF;
                el.value = byteToHex(sim.memory[addr]);
            } else {
                // restore previous
                el.value = byteToHex(sim.memory[addr]);
            }
        });
    });
    // reapply highlight if a cell was previously highlighted
    if (lastHighlightedAddr !== null) {
        const cell = memoryTable.querySelector(`input[data-addr="${lastHighlightedAddr}"]`);
        if (cell) {
            cell.classList.add('bg-yellow-600');
            cell.classList.add('text-black');
            // ensure visible
            const row = document.getElementById(`row-${lastHighlightedAddr - (lastHighlightedAddr % 16)}`);
            if (row && shouldScrollOnRender) {
                row.scrollIntoView({behavior: 'auto', block: 'center'});
                shouldScrollOnRender = false;
            }
        }
    }
}

function renderRegisters() {
    registersGrid.innerHTML = '';
    for (let i = 0; i < 32; i++) {
        const label = document.createElement('div');
        label.className = 'flex items-center gap-2';
        const name = document.createElement('div');
        name.textContent = `x${i}`;
        name.style.width = '40px';
        const input = document.createElement('input');
        input.className = 'p-1 bg-gray-800 border border-gray-700 rounded text-sm text-white w-full';
        input.value = `0x${(sim.registers[i] >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
        if (i === 0) { input.readOnly = true; }
        input.addEventListener('change', () => {
            const v = input.value.trim();
            const num = v.startsWith('0x') ? parseInt(v.substring(2), 16) : parseInt(v);
            if (!isNaN(num)) sim.registers[i] = num >>> 0;
            renderRegisters();
        });
        label.appendChild(name);
        label.appendChild(input);
        registersGrid.appendChild(label);
    }
}

function updatePCDisplay() {
    pcDisplay.textContent = `0x${sim.PC.toString(16).toUpperCase().padStart(4, '0')}`;
}

stepButton.addEventListener('click', () => {
    const info = sim.step();
    if (info.error) {
        errorOutput.textContent = info.error;
        errorOutput.className = 'whitespace-pre-wrap text-red-400';
    } else {
        renderRegisters();
        renderMemory();
        updatePCDisplay();
        errorOutput.textContent = 'Step executed.';
        errorOutput.className = 'whitespace-pre-wrap text-green-400';
    }
});

runButton.addEventListener('click', () => {
    const res = sim.run(1000);
    renderRegisters();
    renderMemory();
    updatePCDisplay();
    if (res.error) {
        errorOutput.textContent = res.error;
        errorOutput.className = 'whitespace-pre-wrap text-red-400';
    } else {
        errorOutput.textContent = `Run finished, cycles=${res.cycles}`;
        errorOutput.className = 'whitespace-pre-wrap text-green-400';
    }
});

gotoBtn.addEventListener('click', () => {
    const v = gotoAddr.value.trim();
    let addr = v.startsWith('0x') ? parseInt(v.substring(2), 16) : parseInt(v);
    if (isNaN(addr) || addr < 0 || addr > 0x7F) return;
    // remove previous highlight before re-render so it isn't re-applied
    if (lastHighlightedAddr !== null) {
        const prev = memoryTable.querySelector(`input[data-addr="${lastHighlightedAddr}"]`);
        if (prev) {
            prev.classList.remove('bg-yellow-600');
            prev.classList.remove('text-black');
        }
        lastHighlightedAddr = null;
    }

    // request render to scroll once for this action only
    shouldScrollOnRender = true;
    renderMemory();

    const cell = memoryTable.querySelector(`input[data-addr="${addr}"]`);
    if (cell) {
        cell.classList.add('bg-yellow-600');
        cell.classList.add('text-black');
        cell.focus();
        lastHighlightedAddr = addr;
    }
});

// Set default placeholder
assemblyInput.value = 
`   addi x1, x6, 1
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
        // also load binary words into simulator memory region 0x0080
        const lines = result.data.split('\n');
        for (const ln of lines) {
            const parts = ln.split(':').map(s => s.trim());
            if (parts.length !== 2) continue;
            const addr = parseInt(parts[0].startsWith('0x') ? parts[0].substring(2) : parts[0], 16);
            const wordHex = parts[1].startsWith('0x') ? parts[1].substring(2) : parts[1];
            const word = parseInt(wordHex, 16) >>> 0;
            // split into little-endian bytes
            const b0 = word & 0xFF;
            const b1 = (word >>> 8) & 0xFF;
            const b2 = (word >>> 16) & 0xFF;
            const b3 = (word >>> 24) & 0xFF;
            const base = addr;
            if (base >= 0x0080 && base + 3 < sim.memory.length) {
                sim.memory[base] = b0;
                sim.memory[base + 1] = b1;
                sim.memory[base + 2] = b2;
                sim.memory[base + 3] = b3;
            }
        }
        renderMemory();
        renderRegisters();
        updatePCDisplay();
        errorOutput.textContent = 'No errors.';
        errorOutput.className = 'whitespace-pre-wrap text-green-400';
    } else {
        errorOutput.textContent = `Error on line ${result.line + 1}: ${result.error}`;
        errorOutput.className = 'whitespace-pre-wrap text-red-400';
    }
});

// initial render
renderMemory();
renderRegisters();
updatePCDisplay();

resetButton.addEventListener('click', () => {
    // Hard reset: clear registers, PC, and memory (clear Memory Editor values)
    sim.reset(true);
    renderRegisters();
    renderMemory();
    updatePCDisplay();
    errorOutput.textContent = 'Simulator reset (registers and memory cleared).';
    errorOutput.className = 'whitespace-pre-wrap text-gray-400';
});