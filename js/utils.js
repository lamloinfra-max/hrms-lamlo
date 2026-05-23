// utils.js — Helper functions

const MONTHS_ID = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

function formatRupiah(amount) {
  if (amount === undefined || amount === null || isNaN(amount) || amount === 0) return 'Rp -';
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function formatRupiahIncome(amount) {
  if (!amount || isNaN(amount) || Number(amount) === 0) return 'Rp -';
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function formatRupiahDeduct(amount) {
  if (!amount || isNaN(amount) || Number(amount) === 0) return 'Rp -';
  return '-Rp ' + Number(amount).toLocaleString('id-ID');
}

function formatRupiahShort(amount) {
  if (!amount || isNaN(amount)) return '-';
  return Number(amount).toLocaleString('id-ID');
}

function terbilang(angka) {
  angka = Math.floor(Math.abs(angka));
  const huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let temp = "";
  if (angka < 12) {
    temp = " " + huruf[angka];
  } else if (angka < 20) {
    temp = terbilang(angka - 10) + " Belas";
  } else if (angka < 100) {
    temp = terbilang(Math.floor(angka / 10)) + " Puluh" + terbilang(angka % 10);
  } else if (angka < 200) {
    temp = " Seratus" + terbilang(angka - 100);
  } else if (angka < 1000) {
    temp = terbilang(Math.floor(angka / 100)) + " Ratus" + terbilang(angka % 100);
  } else if (angka < 2000) {
    temp = " Seribu" + terbilang(angka - 1000);
  } else if (angka < 1000000) {
    temp = terbilang(Math.floor(angka / 1000)) + " Ribu" + terbilang(angka % 1000);
  } else if (angka < 1000000000) {
    temp = terbilang(Math.floor(angka / 1000000)) + " Juta" + terbilang(angka % 1000000);
  } else if (angka < 1000000000000) {
    temp = terbilang(Math.floor(angka / 1000000000)) + " Milyar" + terbilang(angka % 1000000000);
  }
  return temp.trim();
}

function formatTerbilang(angka) {
  if (!angka || isNaN(angka)) return "(Nol Rupiah)";
  const hasil = terbilang(angka);
  return `(${hasil} Rupiah)`;
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
