// excel-parser.js — Parse sheet TEMPLATE dari file xlsx

// Column indices (0-based) berdasarkan structure file "slip gaji.xlsx"
const COL = {
  NO: 0, NAMA: 1, NIK: 2, NPWP: 3,
  JABATAN: 5,
  GAJI: 6, TUNJANGAN: 7, MAKAN: 8, TRANSPORT: 9,
  LEMBUR: 10, INSENTIF: 11, LAIN_INCOME: 12, TOTAL_INCOME: 13,
  JHT: 14, PENSIUN: 15, BPJS_KES: 16,
  PINJAMAN_TOTAL: 17, PINJAMAN_BAYAR: 18, PINJAMAN_SISA: 19,
  LAIN_DEDUCT: 20, TOTAL_DEDUCT: 21, GRAND_TOTAL: 22,
  PASSWORD: 23 // optional, added by HRD
};

function parseExcelFile(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Cari sheet TEMPLATE (case-insensitive)
  const sheetName = workbook.SheetNames.find(
    n => n.trim().toUpperCase() === 'TEMPLATE'
  );
  if (!sheetName) {
    throw new Error('Sheet "TEMPLATE" tidak ditemukan di file Excel ini.');
  }

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Row 0: nomor kolom (skip)
  // Row 1: header utama
  // Row 2: sub-header (JHT, PENSIUNAN, dst)
  // Row 3+: data karyawan

  if (raw.length < 4) {
    throw new Error('Data di sheet TEMPLATE terlalu sedikit. Pastikan format sesuai template.');
  }

  // Cek apakah ada kolom PASSWORD di row header (row 1)
  const headerRow = raw[1] || [];
  let passwordColIdx = COL.PASSWORD;
  for (let i = 23; i < headerRow.length; i++) {
    if ((headerRow[i] || '').toString().toUpperCase().includes('PASSWORD')) {
      passwordColIdx = i;
      break;
    }
  }

  const employees = [];

  for (let i = 3; i < raw.length; i++) {
    const row = raw[i];

    // Skip baris kosong atau baris TOTAL
    const firstCell = toStr(row[COL.NO]);
    if (!firstCell || firstCell.toUpperCase() === 'TOTAL') continue;
    if (!row[COL.NAMA] && !row[COL.NIK]) continue;

    const emp = {
      no:              row[COL.NO],
      nama:            toStr(row[COL.NAMA]),
      nik:             toStr(row[COL.NIK]),
      npwp:            toStr(row[COL.NPWP]),
      jabatan:         toStr(row[COL.JABATAN]),
      gaji_pokok:      toNum(row[COL.GAJI]),
      tunjangan:       toNum(row[COL.TUNJANGAN]),
      uang_makan:      toNum(row[COL.MAKAN]),
      uang_transport:  toNum(row[COL.TRANSPORT]),
      lembur:          toNum(row[COL.LEMBUR]),
      insentif:        toNum(row[COL.INSENTIF]),
      lain_income:     toNum(row[COL.LAIN_INCOME]),
      total_income:    toNum(row[COL.TOTAL_INCOME]),
      jht:             toNum(row[COL.JHT]),
      pensiun:         toNum(row[COL.PENSIUN]),
      bpjs_kes:        toNum(row[COL.BPJS_KES]),
      pinjaman_total:  toNum(row[COL.PINJAMAN_TOTAL]),
      pinjaman_bayar:  toNum(row[COL.PINJAMAN_BAYAR]),
      pinjaman_sisa:   toNum(row[COL.PINJAMAN_SISA]),
      lain_deduct:     toNum(row[COL.LAIN_DEDUCT]),
      total_deduct:    toNum(row[COL.TOTAL_DEDUCT]),
      grand_total:     toNum(row[COL.GRAND_TOTAL]),
      password:        toStr(row[passwordColIdx]),
      _rowIndex:       i + 1, // 1-based for display
    };

    // Auto-hitung jika nilai 0 tapi komponen ada
    if (!emp.total_income) {
      emp.total_income = emp.gaji_pokok + emp.tunjangan + emp.uang_makan +
        emp.uang_transport + emp.lembur + emp.insentif + emp.lain_income;
    }
    if (!emp.total_deduct) {
      emp.total_deduct = emp.jht + emp.pensiun + emp.bpjs_kes +
        emp.pinjaman_bayar + emp.lain_deduct;
    }
    if (!emp.grand_total) {
      emp.grand_total = emp.total_income - emp.total_deduct;
    }

    // Validasi field wajib
    const rowErrors = [];
    if (!emp.nama) rowErrors.push('Nama kosong');
    if (!emp.nik)  rowErrors.push('NIK kosong');
    if (!emp.gaji_pokok) rowErrors.push('Gaji Pokok = 0');

    emp._errors = rowErrors;
    emp._hasError = rowErrors.length > 0;
    emp._passwordFallback = !emp.password;
    emp._resolvedPassword = getPasswordForEmployee(emp);

    employees.push(emp);
  }

  return employees;
}

function toNum(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = val.toString();
  const n = parseFloat(s.replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function toStr(val) {
  if (val === undefined || val === null) return '';
  // Avoid scientific notation for long numbers like NIK/NPWP
  if (typeof val === 'number') {
    return val.toFixed(0); 
  }
  return val.toString().trim();
}
