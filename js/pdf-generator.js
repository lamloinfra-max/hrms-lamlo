// pdf-generator.js — Native PDF Generation using PDFKit
// Menghasilkan PDF yang terenkripsi secara native tanpa manipulasi byte manual.

async function generateSlipGajiPDF(emp, periode, password = null) {
  return new Promise((resolve, reject) => {
    try {
      // 1. Inisialisasi PDFKit Document
      // Jika password diberikan, PDFKit akan mengenkripsi file secara native
      const doc = new PDFKit.PDFDocument({
        size: 'A4',
        margin: 50,
        userPassword: password, // PASSWORD NATIVE!
        ownerPassword: 'admin_lamlo'
      });

      const stream = doc.pipe(blobStream());

      // --- DESIGN SLIP GAJI (Mapping dari jsPDF ke PDFKit) ---
      
      // Header: Nama Perusahaan
      doc.fontSize(16).text('PT. LAMLO PHARMACY', { align: 'center' });
      doc.fontSize(10).text('Gubug, Grobogan, Jawa Tengah', { align: 'center' });
      doc.moveDown();
      
      // Garis Pemisah
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      doc.fontSize(14).text('SLIP GAJI KARYAWAN', { align: 'center', underline: true });
      doc.fontSize(10).text(`Periode: ${periode}`, { align: 'center' });
      doc.moveDown(2);

      // Data Karyawan
      const startY = doc.y;
      doc.fontSize(10);
      doc.text(`NIK           : ${emp.nik}`, 50, startY);
      doc.text(`Nama          : ${emp.nama}`, 50, startY + 15);
      doc.text(`Jabatan       : ${emp.jabatan || '-'}`, 50, startY + 30);
      doc.text(`Departemen    : ${emp.departemen || '-'}`, 50, startY + 45);
      doc.moveDown(4);

      // Tabel Pendapatan & Potongan
      const tableTop = doc.y;
      doc.rect(50, tableTop, 495, 20).fill('#f0f0f0').stroke();
      doc.fillColor('black').text('DESKRIPSI', 60, tableTop + 5);
      doc.text('JUMLAH (IDR)', 450, tableTop + 5, { align: 'right', width: 85 });

      let currentY = tableTop + 25;
      
      const formatRupiah = (num) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
      };

      // Item Pendapatan
      const items = [
        { label: 'Gaji Pokok', value: emp.gajiPokok },
        { label: 'Tunjangan Jabatan', value: emp.tunjanganJabatan },
        { label: 'Tunjangan Transport', value: emp.tunjanganTransport },
        { label: 'Tunjangan Makan', value: emp.tunjanganMakan },
        { label: 'Lembur', value: emp.lembur },
        { label: 'Bonus/Insentif', value: emp.bonus }
      ];

      items.forEach(item => {
        if (item.value > 0) {
          doc.text(item.label, 60, currentY);
          doc.text(formatRupiah(item.value), 450, currentY, { align: 'right', width: 85 });
          currentY += 15;
        }
      });

      // Potongan
      doc.moveDown();
      doc.text('POTONGAN:', 60, doc.y, { underline: true });
      doc.moveDown(0.5);
      
      const deductions = [
        { label: 'BPJS Kesehatan', value: emp.bpjsKesehatan },
        { label: 'BPJS Ketenagakerjaan', value: emp.bpjsKetenagakerjaan },
        { label: 'Pajak (PPh21)', value: emp.pajak },
        { label: 'Potongan Lainnya', value: emp.potonganLain }
      ];

      deductions.forEach(item => {
        if (item.value > 0) {
          doc.text(item.label, 60, doc.y);
          doc.text(`(${formatRupiah(item.value)})`, 450, doc.y, { align: 'right', width: 85 });
          doc.moveDown(0.8);
        }
      });

      // Total
      doc.moveDown();
      doc.rect(50, doc.y, 495, 25).fill('#e8f5e9').stroke();
      doc.fillColor('#2e7d32').fontSize(11).text('TAKE HOME PAY (TOTAL DITERIMA)', 60, doc.y + 7, { bold: true });
      doc.text(formatRupiah(emp.totalGaji), 450, doc.y - 12, { align: 'right', width: 85 });

      // Footer: Tanda Tangan
      doc.fillColor('black').fontSize(10);
      doc.moveDown(4);
      const signY = doc.y;
      doc.text('Diterima Oleh,', 100, signY);
      doc.text('HRD Department,', 400, signY);
      doc.moveDown(4);
      doc.text(`( ${emp.nama} )`, 100, doc.y);
      doc.text('( PT. Lamlo Pharmacy )', 400, doc.y);

      // --- AKHIR DOKUMEN ---
      doc.end();

      stream.on('finish', function() {
        const blob = stream.toBlob('application/pdf');
        blob.arrayBuffer().then(resolve).catch(reject);
      });

    } catch (err) {
      reject(err);
    }
  });
}
