export function toBinary(dec, bits) {
    let bin = (dec >>> 0).toString(2); // convert decimal to unsigned 32-bit binary string
    if (dec < 0) { // handle negative numbers for two's complement
        bin = (Math.pow(2, bits) + dec).toString(2); // convert to two's complement then into binary string
    }
    return bin.slice(-bits).padStart(bits, '0');
}

export function binToHex(bin) {
    const dec = parseInt(bin, 2) >>> 0; // parses binary string to unsigned decimal
    return '0x' + dec.toString(16).toUpperCase().padStart(8, '0'); // converts decimal to hex, normalizes to uppercase, pads with leading zeros
}

export function formatHex(hex, len = 8) {
    let value = hex.startsWith('0x') ? hex.substring(2) : hex; // removes the 0x prefix
    return '0x' + value.toUpperCase().padStart(len, '0'); // normalizes to uppercase and pads with leading zeros
}