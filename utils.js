export function toBinary(dec, bits) {
    let bin = (dec >>> 0).toString(2);
    if (dec < 0) {
        bin = (Math.pow(2, bits) + dec).toString(2);
    }
    return bin.slice(-bits).padStart(bits, '0');
}

export function binToHex(bin) {
    const dec = parseInt(bin, 2) >>> 0; 
    return '0x' + dec.toString(16).toUpperCase().padStart(8, '0');
}

export function formatHex(hex, len = 8) {
    let value = hex.startsWith('0x') ? hex.substring(2) : hex;
    return '0x' + value.toUpperCase().padStart(len, '0');
}