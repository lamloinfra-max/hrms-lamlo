// pdf-encrypt.js — Pure Binary PDF Encryption (RC4 128-bit)
// Menjamin integritas byte biner agar tidak terjadi "PDF Blank".

const PDF_PAD = new Uint8Array([
  0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41,
  0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
  0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80,
  0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A
]);

// --- MD5 & RC4 Core ---
function md5(input) {
  const bytes = input;
  const len8 = bytes.length;
  const lenBits = len8 * 8;
  const padLen = (len8 % 64 < 56) ? (56 - len8 % 64) : (120 - len8 % 64);
  const totalLen = len8 + padLen + 8;
  const m = new Uint8Array(totalLen);
  m.set(bytes);
  m[len8] = 0x80;
  const view = new DataView(m.buffer);
  view.setUint32(totalLen - 8, lenBits, true);
  view.setUint32(totalLen - 4, 0, true);

  const s = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const k = [0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391];

  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (let i = 0; i < totalLen; i += 64) {
    const w = new Uint32Array(16);
    for (let j = 0; j < 16; j++) w[j] = view.getUint32(i + j * 4, true);
    let aa = a, bb = b, cc = c, dd = d;
    for (let j = 0; j < 64; j++) {
      let f, g;
      if (j < 16) { f = (b & c) | (~b & d); g = j; }
      else if (j < 32) { f = (d & b) | (~d & c); g = (5 * j + 1) % 16; }
      else if (j < 48) { f = b ^ c ^ d; g = (3 * j + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * j) % 16; }
      const temp = d; d = c; c = b;
      b = (b + ((a + f + k[j] + w[g]) << s[j] | (a + f + k[j] + w[g]) >>> (32 - s[j]))) | 0;
      a = temp;
    }
    a = (a + aa) | 0; b = (b + bb) | 0; c = (c + cc) | 0; d = (d + dd) | 0;
  }
  const result = new Uint8Array(16);
  const resView = new DataView(result.buffer);
  resView.setUint32(0, a, true); resView.setUint32(4, b, true);
  resView.setUint32(8, c, true); resView.setUint32(12, d, true);
  return result;
}

function rc4(key, data) {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) % 256;
    [s[i], s[j]] = [s[j], s[i]];
  }
  let i = 0; j = 0;
  const out = new Uint8Array(data.length);
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) % 256; j = (j + s[i]) % 256;
    [s[i], s[j]] = [s[j], s[i]];
    out[k] = data[k] ^ s[(s[i] + s[j]) % 256];
  }
  return out;
}

// --- Binary Helpers ---
const bytesToHex = b => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
const concat = (...arrs) => {
  const total = arrs.reduce((s, a) => s + a.length, 0);
  const r = new Uint8Array(total);
  let o = 0;
  for (const a of arrs) { r.set(a, o); o += a.length; }
  return r;
};
const padPw = pw => {
  const b = new TextEncoder().encode(pw || '').slice(0, 32);
  const r = new Uint8Array(32); r.set(b);
  if (b.length < 32) r.set(PDF_PAD.slice(0, 32 - b.length), b.length);
  return r;
};

// --- Main Encryption Logic ---
async function encryptPDF(pdfBytes, userPassword, ownerPassword) {
  const userPw = userPassword || "";
  const ownerPw = ownerPassword || userPw;
  const perm = -3904;
  const fileId = crypto.getRandomValues(new Uint8Array(16));
  const fileIdHex = bytesToHex(fileId).toUpperCase();

  // 1. O Value
  let h = md5(padPw(ownerPw));
  for (let i = 0; i < 50; i++) h = md5(h);
  const ownerKey = h.slice(0, 16);
  let oValue = rc4(ownerKey, padPw(userPw));
  for (let i = 1; i <= 19; i++) {
    const xKey = ownerKey.map(b => b ^ i);
    oValue = rc4(xKey, oValue);
  }

  // 2. Encryption Key
  const pBytes = new Uint8Array(4);
  new DataView(pBytes.buffer).setInt32(0, perm, true);
  const keySeed = concat(padPw(userPw), oValue, pBytes, fileId);
  let encKey = md5(keySeed);
  for (let i = 0; i < 50; i++) encKey = md5(encKey);
  encKey = encKey.slice(0, 16);

  // 3. U Value
  const uSeed = md5(concat(PDF_PAD, fileId));
  let uValue = rc4(encKey, uSeed);
  for (let i = 1; i <= 19; i++) {
    const xKey = encKey.map(b => b ^ i);
    uValue = rc4(xKey, uValue);
  }

  // 4. Binary Processing
  const latin1 = new TextDecoder('latin1');
  const pdfStr = latin1.decode(pdfBytes);
  
  // Scaning objek menggunakan Regex tapi HANYA untuk mencari offset.
  // Data aslinya tetap diambil dari Uint8Array awal.
  const objRegex = /(\d+)\s+(\d+)\s+obj[\s\S]*?stream([\r\n]+)/g;
  let match;
  const finalPdf = new Uint8Array(pdfBytes);

  while ((match = objRegex.exec(pdfStr)) !== null) {
    const objNum = parseInt(match[1]);
    const genNum = parseInt(match[2]);
    const streamStart = match.index + match[0].length;
    
    // Temukan akhir stream
    const streamEnd = pdfStr.indexOf('endstream', streamStart);
    if (streamEnd === -1) continue;

    // Ambil data stream asli dari Uint8Array (Biner Murni)
    const rawStream = pdfBytes.slice(streamStart, streamEnd);

    // Hitung Object Key
    const extra = new Uint8Array([objNum & 0xff, (objNum>>8) & 0xff, (objNum>>16) & 0xff, genNum & 0xff, (genNum>>8) & 0xff]);
    const objKey = md5(concat(encKey, extra)).slice(0, Math.min(encKey.length + 5, 16));

    // Enkripsi
    const encrypted = rc4(objKey, rawStream);
    
    // Tulis kembali ke finalPdf (In-place)
    finalPdf.set(encrypted, streamStart);
  }

  // 5. Update Trailer (Dictionary update tetap aman via string replace karena biasanya hanya teks ASCII)
  const finalStr = latin1.decode(finalPdf);
  const encryptDict = `<< /Filter /Standard /V 2 /R 3 /Length 128 /P ${perm} /O <${bytesToHex(oValue).toUpperCase()}> /U <${bytesToHex(uValue.slice(0,16)).toUpperCase()}${bytesToHex(new Uint8Array(16)).toUpperCase()}> >>`;
  
  let resultStr = finalStr;
  if (finalStr.includes('trailer')) {
    resultStr = finalStr.replace(/trailer\s*<<([\s\S]*?)>>/g, (m, inner) => {
      let updated = inner.replace(/\/Encrypt\s+[^\n/]+/g, '').replace(/\/ID\s+\[[\s\S]*?\]/g, '');
      return `trailer <<${updated} /Encrypt ${encryptDict} /ID [<${fileIdHex}><${fileIdHex}>] >>`;
    });
  } else {
    resultStr = finalStr.replace(/<<([\s\S]*?)>>\s+%%EOF/g, (m, inner) => {
      let updated = inner.replace(/\/Encrypt\s+[^\n/]+/g, '').replace(/\/ID\s+\[[\s\S]*?\]/g, '');
      return `<<${updated} /Encrypt ${encryptDict} /ID [<${fileIdHex}><${fileIdHex}>] >> %%EOF`;
    });
  }

  return new Uint8Array(Array.from(resultStr).map(c => c.charCodeAt(0)));
}
