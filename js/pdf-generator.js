// pdf-generator.js — Native PDF Generation using PDFKit
// Menggunakan enkripsi native PDFKit dengan proteksi buffer untuk stabilitas di browser.

async function generateSlipGajiPDF(emp, periode, password = null) {
  return new Promise((resolve, reject) => {
    try {
      // 1. Inisialisasi PDFDocument dengan ENKRIPSI NATIVE
      // PDF versi 1.4 lebih stabil untuk enkripsi RC4 standar di lingkungan browser
      const pdfOptions = {
        size: 'A4',
        margin: 50,
        pdfVersion: '1.4',
        info: {
          Title: `Slip Gaji - ${emp.nama}`,
          Author: 'HRMS Lamlo'
        }
      };

      if (password) {
        console.log(`[SECURE] Generating encrypted PDF for ${emp.nama}...`);
        pdfOptions.userPassword = password;
        pdfOptions.ownerPassword = 'admin_lamlo_secure';
        pdfOptions.permissions = {
          printing: 'highResolution',
          modifying: false,
          copying: true
        };
      }

      const doc = new PDFDocument(pdfOptions);
      
      // Buffer collection manual untuk menghindari korupsi data stream di browser
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('error', (err) => reject(err));
      doc.on('end', () => {
        try {
          // Gabungkan chunks secara manual karena 'Buffer' tidak ada di browser
          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const finalBuffer = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            finalBuffer.set(chunk, offset);
            offset += chunk.length;
          }
          resolve(finalBuffer);
        } catch (err) {
          reject(err);
        }
      });

      // --- DESIGN SLIP GAJI ---
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
      
      const formatRupiahLocal = (num) => {
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
          doc.text(formatRupiahLocal(item.value), 450, currentY, { align: 'right', width: 85 });
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
          doc.text(`(${formatRupiahLocal(item.value)})`, 450, doc.y, { align: 'right', width: 85 });
          doc.moveDown(0.8);
        }
      });

      // Total
      doc.moveDown();
      const totalY = doc.y;
      doc.rect(50, totalY, 495, 25).fill('#e8f5e9').stroke();
      doc.fillColor('#2e7d32').fontSize(11).text('TAKE HOME PAY (TOTAL DITERIMA)', 60, totalY + 7, { bold: true });
      doc.text(formatRupiahLocal(emp.totalGaji), 450, totalY + 7, { align: 'right', width: 85 });

      // Footer: Tanda Tangan
      doc.fillColor('black').fontSize(10);
      doc.moveDown(4);
      const footerY = doc.y;
      doc.text('Dicetak pada: ' + new Date().toLocaleString('id-ID'), 50, footerY);
      
      doc.text('Penerima,', 400, footerY);
      doc.moveDown(3);
      doc.text(`( ${emp.nama} )`, 400, doc.y);

      // Finalize PDF file
      doc.end();

    } catch (err) {
      console.error("PDF Generation Error:", err);
      reject(err);
    }
  });
}
