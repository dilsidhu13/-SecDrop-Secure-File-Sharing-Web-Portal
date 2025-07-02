const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function encode(bytes) {
  let num = 0n;
  for (const b of bytes) {
    num = (num << 8n) + BigInt(b);
  }
  let out = '';
  while (num > 0n) {
    const rem = num % 58n;
    out = ALPHABET[Number(rem)] + out;
    num /= 58n;
  }
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    out = ALPHABET[0] + out;
  }
  return out || ALPHABET[0];
}

export function decode(str) {
  let num = 0n;
  for (const ch of str) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error('Invalid Base58 character');
    num = num * 58n + BigInt(idx);
  }
  const bytes = [];
  while (num > 0n) {
    bytes.push(Number(num % 256n));
    num /= 256n;
  }
  bytes.reverse();
  for (let i = 0; i < str.length && str[i] === ALPHABET[0]; i++) {
    bytes.unshift(0);
  }
  return new Uint8Array(bytes);
}