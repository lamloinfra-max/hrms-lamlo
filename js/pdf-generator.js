// pdf-generator.js — Native PDF Generation using PDFKit
// Menggunakan enkripsi native PDFKit dengan proteksi buffer untuk stabilitas di browser.

async function generateSlipGajiPDF(emp, periode, password = null) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Inisialisasi PDFDocument dengan ENKRIPSI NATIVE
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
        pdfOptions.userPassword = password;
        pdfOptions.ownerPassword = 'admin_lamlo_secure';
        pdfOptions.permissions = {
          printing: 'highResolution',
          modifying: false,
          copying: true
        };
      }

      const doc = new PDFDocument(pdfOptions);
      
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('error', (err) => reject(err));
      doc.on('end', () => {
        try {
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

      // --- MUAT LOGO ---
      try {
        const logoRes = await fetch('logo.png');
        if (logoRes.ok) {
          const logoArrayBuffer = await logoRes.arrayBuffer();
          // Letakkan logo di pojok kiri atas
          doc.image(logoArrayBuffer, 50, 45, { width: 55 });
        }
      } catch (e) {
        console.warn("Gagal memuat logo.png, melanjutkan tanpa logo.");
      }

      // --- DESIGN SLIP GAJI ---
      
      // Header: Nama & Alamat Perusahaan (Digeser ke kanan sedikit jika ada logo)
      doc.font('Helvetica-Bold').fontSize(14).text('PT. LAMLO PHARMACY', 120, 50, { align: 'left' });
      doc.font('Helvetica').fontSize(9)
         .text('JL. TEUKU FAKINAH NO. 07 LAM BLANG TRIENG', 120, 68, { align: 'left' })
         .text('DARUL IMARAH - ACEH BESAR', 120, 80, { align: 'left' });
      
      doc.y = 110; // Reset Y setelah header
      
      // Garis Pemisah Double
      doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1.5).stroke();
      doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).lineWidth(0.5).stroke();
      doc.moveDown(1.5);

      // Reset X ke margin kiri (50) agar align: 'center' benar-benar di tengah halaman
      doc.x = 50; 
      doc.font('Helvetica-Bold').fontSize(12).text('SLIP GAJI KARYAWAN', { align: 'center' });
      doc.font('Helvetica').fontSize(10).text(`Periode: ${periode}`, { align: 'center' });
      doc.moveDown(2);

      // Data Karyawan (Layout Kolom)
      const startY = doc.y;
      doc.fontSize(10);
      
      // Kolom Kiri
      doc.font('Helvetica-Bold').text('NIK', 50, startY);
      doc.font('Helvetica').text(`: ${emp.nik}`, 130, startY);
      
      doc.font('Helvetica-Bold').text('Nama', 50, startY + 15);
      doc.font('Helvetica').text(`: ${emp.nama}`, 130, startY + 15);
      
      // Kolom Kanan
      doc.font('Helvetica-Bold').text('Jabatan', 320, startY);
      doc.font('Helvetica').text(`: ${emp.jabatan || '-'}`, 400, startY);
      
      doc.font('Helvetica-Bold').text('Departemen', 320, startY + 15);
      doc.font('Helvetica').text(`: ${emp.departemen || '-'}`, 400, startY + 15);
      
      doc.moveDown(3);

      // --- TABEL PENDAPATAN & POTONGAN ---
      const tableTop = doc.y;
      const col1 = 60;
      const col2 = 400;
      
      // Header Tabel
      doc.rect(50, tableTop, 495, 20).fill('#f5f5f5').stroke('#cccccc');
      doc.fillColor('black').font('Helvetica-Bold').text('DESKRIPSI', col1, tableTop + 6);
      doc.text('JUMLAH (IDR)', col2, tableTop + 6, { align: 'right', width: 135 });

      let currentY = tableTop + 28;
      doc.font('Helvetica');
      
      const formatRupiah = (num) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
      };

      // 1. PENDAPATAN
      doc.font('Helvetica-Bold').text('PENDAPATAN', col1, currentY);
      currentY += 18;
      doc.font('Helvetica');

      const incomeItems = [
        { label: 'Gaji Pokok', value: emp.gaji_pokok },
        { label: 'Tunjangan Tetap', value: emp.tunjangan },
        { label: 'Uang Makan', value: emp.uang_makan },
        { label: 'Uang Transport', value: emp.uang_transport },
        { label: 'Lembur', value: emp.lembur },
        { label: 'Insentif / Bonus', value: emp.insentif },
        { label: 'Pendapatan Lain-lain', value: emp.lain_income }
      ];

      incomeItems.forEach(item => {
        if (item.value > 0) {
          doc.text(item.label, col1 + 10, currentY);
          doc.text(formatRupiah(item.value), col2, currentY, { align: 'right', width: 135 });
          currentY += 15;
        }
      });

      // Subtotal Pendapatan
      doc.moveTo(col1, currentY + 5).lineTo(545, currentY + 5).lineWidth(0.5).stroke('#dddddd');
      currentY += 12;
      doc.font('Helvetica-Bold').text('Total Pendapatan (A)', col1, currentY);
      doc.text(formatRupiah(emp.total_income), col2, currentY, { align: 'right', width: 135 });
      currentY += 25;

      // 2. POTONGAN
      doc.font('Helvetica-Bold').text('POTONGAN', col1, currentY);
      currentY += 18;
      doc.font('Helvetica');

      const bpjsTK = (emp.jht || 0) + (emp.pensiun || 0);
      const deductItems = [
        { label: 'BPJS Kesehatan', value: emp.bpjs_kes },
        { label: 'BPJS Ketenagakerjaan', value: bpjsTK },
        { label: 'Angsuran Pinjaman', value: emp.pinjaman_bayar },
        { label: 'Potongan Lain-lain', value: emp.lain_deduct }
      ];

      deductItems.forEach(item => {
        if (item.value > 0) {
          doc.text(item.label, col1 + 10, currentY);
          doc.text(`(${formatRupiah(item.value)})`, col2, currentY, { align: 'right', width: 135 });
          currentY += 15;
        }
      });

      // Subtotal Potongan
      doc.moveTo(col1, currentY + 5).lineTo(545, currentY + 5).lineWidth(0.5).stroke('#dddddd');
      currentY += 12;
      doc.font('Helvetica-Bold').text('Total Potongan (B)', col1, currentY);
      doc.text(`(${formatRupiah(emp.total_deduct)})`, col2, currentY, { align: 'right', width: 135 });
      currentY += 30;

      // --- GRAND TOTAL ---
      doc.rect(50, currentY, 495, 30).fill('#e8f5e9').stroke('#2e7d32');
      doc.fillColor('#1b5e20').font('Helvetica-Bold').fontSize(11).text('TAKE HOME PAY (A - B)', col1, currentY + 10);
      doc.text(formatRupiah(emp.grand_total), col2, currentY + 10, { align: 'right', width: 135 });

      // Footer: Tanda Tangan
      doc.fillColor('black').fontSize(9).font('Helvetica');
      doc.moveDown(5);
      const footerY = doc.y;
      
      // Bagian Kiri: Info Cetak
      doc.text('Dicetak pada: ' + new Date().toLocaleString('id-ID'), 50, footerY);
      
      // Bagian Kanan: Area Tanda Tangan (Gunakan width agar teks terpusat)
      const signAreaWidth = 150;
      const signAreaX = 545 - signAreaWidth; // Rata kanan halaman
      
      doc.text('Penerima,', signAreaX, footerY, { align: 'center', width: signAreaWidth });
      doc.moveDown(4);
      doc.font('Helvetica-Bold').text(`( ${emp.nama} )`, signAreaX, doc.y, { align: 'center', width: signAreaWidth });

      // Finalize PDF file
      doc.end();

    } catch (err) {
      console.error("PDF Generation Error:", err);
      reject(err);
    }
  });
}
