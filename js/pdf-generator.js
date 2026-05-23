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
      doc.fillColor('#000000');

      // 1. Header & Kop Surat (Gambar 1)
      doc.font('Helvetica-Bold').fontSize(13).text('PT. LAMLO PHARMACY', 120, 50, { align: 'left' });
      doc.font('Helvetica').fontSize(8.5)
         .text('JL. TEUKU FAKINAH NO. 07 LAM BLANG TRIENG', 120, 66, { align: 'left' })
         .text('DARUL IMARAH - ACEH BESAR', 120, 76, { align: 'left' });
      
      // Label Private & Confidential di sebelah kanan
      doc.font('Helvetica-BoldOblique').fontSize(9.5).fillColor('#333333')
         .text('PRIVATE & CONFIDENTIAL', 50, 50, { align: 'right', width: 495 });

      // Garis Pemisah (Tebal Tunggal)
      doc.moveTo(50, 95).lineTo(545, 95).lineWidth(1.5).strokeColor('#000000').stroke();

      // 2. Sub-Header Judul Slip (Gambar 1)
      // Judul: SLIP GAJI (Centered, Underlined)
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(13)
         .text('SLIP GAJI', 50, 115, { align: 'center', width: 495, underline: true });

      // Periode (Mei 2026 dst.)
      let cleanPeriode = periode;
      if (cleanPeriode.toUpperCase().startsWith("BULAN ")) {
        const parts = cleanPeriode.split(" ");
        if (parts.length >= 3) {
          const monthStr = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
          cleanPeriode = `${monthStr} ${parts[2]}`;
        }
      }
      doc.font('Helvetica-Bold').fontSize(9.5)
         .text(`Periode : ${cleanPeriode}`, 50, 134, { align: 'center', width: 495 });

      // 3. Detail Karyawan 2-Kolom (Gambar 1)
      // Kolom Kiri
      doc.font('Helvetica-Bold').fontSize(9).text('Nama', 50, 160);
      doc.font('Helvetica').text(`: ${emp.nama}`, 100, 160);
      
      doc.font('Helvetica-Bold').text('NIK', 50, 174);
      doc.font('Helvetica').text(`: ${emp.nik}`, 100, 174);
      
      doc.font('Helvetica-Bold').text('Jabatan', 50, 188);
      doc.font('Helvetica').text(`: ${emp.jabatan || '-'}`, 100, 188);

      // Kolom Kanan
      doc.font('Helvetica-Bold').text('No. BPJS Ketenagakerjaan', 310, 160);
      doc.font('Helvetica').text(`: ${emp.no_bpjstk || '-'}`, 435, 160);
      
      doc.font('Helvetica-Bold').text('No. BPJS Kesehatan', 310, 174);
      doc.font('Helvetica').text(`: ${emp.no_bpjs_kes || '-'}`, 435, 174);

      // 4. Rincian Gaji Vertikal Bertumpuk - Option A Static (Gambar 2)
      let currentY = 215;

      // --- SUB-TABEL PENDAPATAN ---
      // Header Pendapatan
      doc.rect(50, currentY, 495, 18).fill('#f5f5f5').stroke('#000000');
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
      doc.text('RINCIAN PENDAPATAN', 60, currentY + 5);
      doc.text('JUMLAH (IDR)', 400, currentY + 5, { align: 'right', width: 135 });

      currentY += 18;
      
      const incomeItems = [
        { label: 'Gaji Pokok', value: emp.gaji_pokok },
        { label: 'Tunjangan Jabatan', value: emp.tunjangan },
        { label: 'Uang Makan', value: emp.uang_makan },
        { label: 'Uang Transport', value: emp.uang_transport },
        { label: 'Lembur', value: emp.lembur },
        { label: 'Insentif', value: emp.insentif },
        { label: 'Lain-lain', value: emp.lain_income }
      ];

      doc.font('Helvetica').fontSize(9);
      incomeItems.forEach(item => {
        currentY += 4;
        doc.text(item.label, 60, currentY);
        doc.text(formatRupiahIncome(item.value), 400, currentY, { align: 'right', width: 135 });
        currentY += 11;
      });

      // Total Pendapatan
      currentY += 4;
      doc.moveTo(50, currentY).lineTo(545, currentY).lineWidth(0.5).strokeColor('#000000').stroke();
      
      currentY += 4;
      doc.font('Helvetica-Bold').fontSize(9).text('Total Pendapatan', 60, currentY);
      doc.text(formatRupiahIncome(emp.total_income), 400, currentY, { align: 'right', width: 135 });

      currentY += 15;

      // --- SUB-TABEL POTONGAN ---
      currentY += 12;

      // Header Potongan
      doc.rect(50, currentY, 495, 18).fill('#f5f5f5').stroke('#000000');
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
      doc.text('RINCIAN POTONGAN', 60, currentY + 5);
      doc.text('JUMLAH (IDR)', 400, currentY + 5, { align: 'right', width: 135 });

      currentY += 18;

      const bpjsTK = (emp.jht || 0) + (emp.pensiun || 0);
      const deductItems = [
        { label: 'BPJS Ketenagakerjaan', value: bpjsTK },
        { label: 'BPJS Kesehatan', value: emp.bpjs_kes },
        { label: 'Angsuran Pinjaman', value: emp.pinjaman_bayar },
        { label: 'Lain-lain', value: emp.lain_deduct }
      ];

      doc.font('Helvetica').fontSize(9);
      deductItems.forEach(item => {
        currentY += 4;
        doc.text(item.label, 60, currentY);
        doc.text(formatRupiahDeduct(item.value), 400, currentY, { align: 'right', width: 135 });
        currentY += 11;
      });

      // Total Potongan
      currentY += 4;
      doc.moveTo(50, currentY).lineTo(545, currentY).lineWidth(0.5).strokeColor('#000000').stroke();

      currentY += 4;
      doc.font('Helvetica-Bold').fontSize(9).text('Total Potongan', 60, currentY);
      doc.text(formatRupiahDeduct(emp.total_deduct), 400, currentY, { align: 'right', width: 135 });

      currentY += 15;

      // 5. Kotak Gaji Diterima (Gambar 3)
      currentY += 20;
      doc.rect(50, currentY, 495, 60).lineWidth(1.5).strokeColor('#000000').stroke();
      
      doc.fillColor('#000000');
      doc.font('Helvetica-Bold').fontSize(9).text('GAJI YANG DITERIMA', 50, currentY + 8, { align: 'center', width: 495 });
      doc.font('Helvetica-Bold').fontSize(14).text(formatRupiahIncome(emp.grand_total), 50, currentY + 22, { align: 'center', width: 495 });
      doc.font('Helvetica-Oblique').fontSize(8.5).text(formatTerbilang(emp.grand_total), 50, currentY + 42, { align: 'center', width: 495 });

      currentY += 60;

      // 6. Tanda Tangan Direktur Terpusat (Gambar 3)
      currentY += 35;
      doc.font('Helvetica-Bold').fontSize(9).text('PT. LAMLO PHARMACY', 50, currentY, { align: 'center', width: 495 });
      currentY += 60;
      doc.font('Helvetica-Bold').fontSize(9).text('DIREKTUR', 50, currentY, { align: 'center', width: 495 });

      // 7. Catatan Kaki (Footnote) dan Waktu Cetak di Bagian Bawah
      const bottomY = 800;
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#555555');
      doc.text('Slip gaji ini dibuat secara otomatis oleh sistem dan sah tanpa tanda tangan.', 50, bottomY, { align: 'left', width: 300 });

      const now = new Date();
      const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
      doc.text(`Dicetak pada : ${dateStr} | ${timeStr} WIB`, 300, bottomY, { align: 'right', width: 245 });

      // Finalisasi Dokumen PDF
      doc.end();

    } catch (err) {
      console.error("PDF Generation Error:", err);
      reject(err);
    }
  });
}
