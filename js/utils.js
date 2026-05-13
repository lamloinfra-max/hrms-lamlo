// utils.js — Helper functions

const MONTHS_ID = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

function formatRupiah(amount) {
  if (!amount || isNaN(amount)) return 'Rp -';
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function formatRupiahShort(amount) {
  if (!amount || isNaN(amount)) return '-';
  return Number(amount).toLocaleString('id-ID');
}

function getPeriodeLabel(bulan, tahun) {
  return `BULAN ${MONTHS_ID[bulan - 1].toUpperCase()} ${tahun}`;
}

function getPeriodeSlug(bulan, tahun) {
  return `${MONTHS_ID[bulan - 1]}${tahun}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function sanitizeFilename(str) {
  return str.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/_+/g, '_');
}

function getPasswordForEmployee(row) {
  const pw = (row.password || '').toString().trim();
  if (pw) return pw;
  // fallback: last 5 chars of NIK
  const nik = (row.nik || '').toString().trim();
  return nik.slice(-5) || '00000';
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getCurrentMonth() {
  return new Date().getMonth() + 1; // 1-based
}
