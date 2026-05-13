// pdf-generator.js — Generate slip gaji PDF menggunakan jsPDF

const COMPANY = {
  name: 'PT. LAMLO PHARMACY',
  addr1: 'Jl. Teuku Fakinah No. 07 Lam Blang Trieng',
  addr2: 'Darul Imarah - Aceh Besar',
};

// Colors
const C = {
  navy: [26, 54, 93],
  teal: [56, 178, 172],
  white: [255, 255, 255],
  lightGray: [245, 247, 250],
  midGray: [180, 190, 200],
  darkGray: [60, 80, 100],
  red: [220, 38, 38],
  black: [30, 40, 50],
};

let _logoDataUrl = null;

async function loadLogoDataUrl() {
  if (_logoDataUrl) return _logoDataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        
        // Optimasi: Batasi ukuran maksimum logo agar PDF tidak membengkak
        const MAX_DIMENSION = 300;
        let targetWidth = img.width;
        let targetHeight = img.height;
        
        if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * MAX_DIMENSION) / targetWidth);
            targetWidth = MAX_DIMENSION;
          } else {
            targetWidth = Math.round((targetWidth * MAX_DIMENSION) / targetHeight);
            targetHeight = MAX_DIMENSION;
          }
        }
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.getContext('2d').drawImage(img, 0, 0, targetWidth, targetHeight);
        
        _logoDataUrl = canvas.toDataURL('image/png');
        resolve(_logoDataUrl);
      } catch (err) {
        console.warn("Gagal memuat logo karena masalah CORS/Local File.", err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = 'logo.png';
  });
}

async function generateSlipGajiPDF(emp, periodeLabel) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: false // Matikan kompresi agar struktur trailer mudah dibaca
  });

  const pw = 210, ph = 297;
  const ml = 14, mr = 14, mt = 14;
  let y = mt;

  // ── HEADER ──────────────────────────────────────────────────────────────
  // Background header bar
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pw, 38, 'F');

  // Logo - Dinonaktifkan sementara untuk troubleshooting
  // const logo = await loadLogoDataUrl();
  // if (logo) {
  //   doc.addImage(logo, 'PNG', ml, 6, 22, 22);
  // }
  const logo = null;

  // Company name
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(COMPANY.name, ml + (logo ? 26 : 0), 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(COMPANY.addr1, ml + (logo ? 26 : 0), 20);
  doc.text(COMPANY.addr2, ml + (logo ? 26 : 0), 25);

  // PRIVATE & CONFIDENTIAL badge
  doc.setFillColor(...C.red);
  doc.roundedRect(pw - mr - 48, 8, 48, 8, 1.5, 1.5, 'F');
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('PRIVATE & CONFIDENTIAL', pw - mr - 24, 13.2, { align: 'center' });

  y = 44;

  // ── TITLE ───────────────────────────────────────────────────────────────
  doc.setFillColor(...C.teal);
  doc.rect(0, 38, pw, 14, 'F');
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('SLIP GAJI', pw / 2, 44, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(periodeLabel, pw / 2, 49.5, { align: 'center' });

  y = 58;

  // ── EMPLOYEE INFO ────────────────────────────────────────────────────────
  doc.setFillColor(...C.lightGray);
  doc.rect(ml, y - 3, pw - ml - mr, 22, 'F');
  doc.setDrawColor(...C.midGray);
  doc.setLineWidth(0.3);
  doc.rect(ml, y - 3, pw - ml - mr, 22);

  doc.setTextColor(...C.darkGray);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const infoLeft = ml + 4;
  const infoColon = ml + 35;
  const infoValue = ml + 38;

  function infoRow(label, value, yPos) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.navy);
    doc.text(label, infoLeft, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.darkGray);
    doc.text(':', infoColon, yPos);
    doc.text(value || '-', infoValue, yPos);
  }

  infoRow('Nama', emp.nama, y + 3);
  infoRow('NIK', emp.nik, y + 9);
  infoRow('Jabatan', emp.jabatan, y + 15);

  y += 26;

  // ── TWO-COLUMN TABLE ────────────────────────────────────────────────────
  const colMid = pw / 2;
  const colW = colMid - ml - 2;

  // Column headers
  function columnHeader(label, x, width) {
    doc.setFillColor(...C.navy);
    doc.rect(x, y, width, 7, 'F');
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(label, x + width / 2, y + 5, { align: 'center' });
  }

  columnHeader('PENGHASILAN', ml, colW);
  columnHeader('POTONGAN', colMid + 2, colW);
  y += 7;

  // Table rows
  const incomeRows = [
    ['Gaji Pokok', emp.gaji_pokok],
    ['Tunjangan', emp.tunjangan],
    ['Uang Makan', emp.uang_makan],
    ['Uang Transport', emp.uang_transport],
    ['Lembur', emp.lembur],
    ['Insentif', emp.insentif],
    ['Lain-lain', emp.lain_income],
  ];

  const deductRows = [
    ['BPJSTK (JHT)', emp.jht],
    ['BPJSTK (Pensiun)', emp.pensiun],
    ['BPJS Kesehatan', emp.bpjs_kes],
    ['Cicilan Pinjaman', emp.pinjaman_bayar],
    ['Lain-lain', emp.lain_deduct],
  ];

  const rowH = 7;
  const maxRows = Math.max(incomeRows.length, deductRows.length);

  for (let i = 0; i < maxRows; i++) {
    const bg = i % 2 === 0 ? C.white : C.lightGray;
    doc.setFillColor(...bg);
    doc.rect(ml, y, colW, rowH, 'F');
    doc.rect(colMid + 2, y, colW, rowH, 'F');

    doc.setDrawColor(...C.midGray);
    doc.setLineWidth(0.15);
    doc.rect(ml, y, colW, rowH);
    doc.rect(colMid + 2, y, colW, rowH);

    doc.setTextColor(...C.black);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Left column
    if (incomeRows[i]) {
      doc.text(incomeRows[i][0], ml + 3, y + 4.8);
      doc.text(formatRupiah(incomeRows[i][1]), ml + colW - 3, y + 4.8, { align: 'right' });
    }
    // Right column
    if (deductRows[i]) {
      doc.text(deductRows[i][0], colMid + 5, y + 4.8);
      doc.text(formatRupiah(deductRows[i][1]), colMid + colW - 1, y + 4.8, { align: 'right' });
    }
    y += rowH;
  }

  // Total row
  doc.setFillColor(...C.navy);
  doc.rect(ml, y, colW, 8, 'F');
  doc.rect(colMid + 2, y, colW, 8, 'F');
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Total Penghasilan', ml + 3, y + 5.5);
  doc.text(formatRupiah(emp.total_income), ml + colW - 3, y + 5.5, { align: 'right' });
  doc.text('Total Potongan', colMid + 5, y + 5.5);
  doc.text(formatRupiah(emp.total_deduct), colMid + colW - 1, y + 5.5, { align: 'right' });
  y += 8;

  // ── GRAND TOTAL / GAJI BERSIH ────────────────────────────────────────────
  y += 3;
  doc.setFillColor(...C.teal);
  doc.rect(ml, y, pw - ml - mr, 12, 'F');
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Gaji Bersih (Take Home Pay)', ml + 4, y + 8);
  doc.text(formatRupiah(emp.grand_total), pw - mr - 4, y + 8, { align: 'right' });
  y += 12;

  // Saldo Pinjaman (jika ada)
  if (emp.pinjaman_sisa > 0) {
    y += 2;
    doc.setFillColor(...C.lightGray);
    doc.rect(ml, y, pw - ml - mr, 8, 'F');
    doc.setTextColor(...C.darkGray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Saldo Pinjaman', ml + 4, y + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(formatRupiah(emp.pinjaman_sisa), pw - mr - 4, y + 5.5, { align: 'right' });
    y += 8;
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────
  y += 10;
  doc.setDrawColor(...C.midGray);
  doc.setLineWidth(0.3);
  doc.line(ml, y, pw - mr, y);
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...C.midGray);
  doc.text('Dokumen ini diterbitkan secara elektronik dan sah tanpa tanda tangan.', pw / 2, y, { align: 'center' });
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, pw / 2, y + 4, { align: 'center' });

  const out = doc.output('arraybuffer');
  console.log(`[DEBUG] PDF Generated size: ${out.byteLength} bytes`);
  return out;
}
