const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encode(buffer) {
  let num = BigInt('0x' + Buffer.from(buffer).toString('hex'));
  let encoded = '';
  while (num > 0n) {
    const rem = num % 58n;
    encoded = ALPHABET[Number(rem)] + encoded;
    num /= 58n;
  }
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    encoded = ALPHABET[0] + encoded;
  }
  return encoded || ALPHABET[0];
}

function decode(str) {
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
  for (let i = 0; i < str.length && str[i] === ALPHABET[0]; i++) {
    bytes.push(0);
  }
  return Buffer.from(bytes.reverse());
}

module.exports = { encode, decode };