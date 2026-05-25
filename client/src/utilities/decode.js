import { Buffer } from 'buffer';

// Manually expose Buffer to the window object
window.Buffer = window.Buffer || Buffer;

export function base32Decode_old_version(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const output = [];

    for (let i = 0; i < base32.length; i++) {
        const char = base32[i].toUpperCase();
        if (char === '=') continue; // padding
        const index = alphabet.indexOf(char);
        if (index === -1) throw new Error('Invalid Base32 string');

        value = (value << 5) | index;
        bits += 5;

        if (bits >= 8) {
            output.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return Buffer.from(output);
}

export function base32Decode(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = ''; // chuỗi nhị phân tích lũy

    for (let i = 0; i < base32.length; i++) {
        const char = base32[i].toUpperCase();
        if (char === '=') continue;
        const index = alphabet.indexOf(char);
        if (index === -1) throw new Error('Ký tự Base32 không hợp lệ');
        // Chuyển index thành 5 bit và nối vào chuỗi
        bits += index.toString(2).padStart(5, '0');
    }

    // Cắt chuỗi bit thành từng nhóm 8 bit (byte)
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }

    return new Uint8Array(bytes);
}