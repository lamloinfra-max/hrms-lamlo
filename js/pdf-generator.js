// pdf-generator.js — Native PDF Generation using PDFKit
// Menggunakan enkripsi native PDFKit dengan proteksi buffer untuk stabilitas di browser.

async function generateSlipGajiPDF(emp, periode, password = null) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Inisialisasi PDFDocument dengan ENKRIPSI NATIVE
      // Menggunakan margin bottom: 40 untuk memaksimalkan printable area halaman tunggal
      const pdfOptions = {
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 50, right: 50 },
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
          // Letakkan logo di pojok kiri atas dengan ukuran proporsional
          doc.image(logoArrayBuffer, 50, 40, { width: 52 });
        }
      } catch (e) {
        console.warn("Gagal memuat logo.png, melanjutkan tanpa logo.");
      }

      // --- DESIGN SLIP GAJI ---
      doc.fillColor('#000000');

      // 1. Header & Kop Surat (Gambar 1)
      doc.font('Helvetica-Bold').fontSize(12.5).text('PT. LAMLO PHARMACY', 120, 43, { align: 'left' });
      doc.font('Helvetica').fontSize(8)
         .text('JL. TEUKU FAKINAH NO. 07 LAM BLANG TRIENG', 120, 57, { align: 'left' })
         .text('DARUL IMARAH - ACEH BESAR', 120, 67, { align: 'left' });
      
      // Label Private & Confidential di sebelah kanan
      doc.font('Helvetica-BoldOblique').fontSize(9).fillColor('#333333')
         .text('PRIVATE & CONFIDENTIAL', 50, 43, { align: 'right', width: 495 });

      // Garis Pemisah (Tebal Tunggal)
      doc.moveTo(50, 85).lineTo(545, 85).lineWidth(1.2).strokeColor('#000000').stroke();

      // 2. Sub-Header Judul Slip (Gambar 1)
      // Judul: SLIP GAJI (Centered, Underlined)
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(12)
         .text('SLIP GAJI', 50, 102, { align: 'center', width: 495, underline: true });

      // Periode (Mei 2026 dst.)
      let cleanPeriode = periode;
      if (cleanPeriode.toUpperCase().startsWith("BULAN ")) {
        const parts = cleanPeriode.split(" ");
        if (parts.length >= 3) {
          const monthStr = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
          cleanPeriode = `${monthStr} ${parts[2]}`;
        }
      }
      doc.font('Helvetica-Bold').fontSize(9)
         .text(`Periode : ${cleanPeriode}`, 50, 118, { align: 'center', width: 495 });

      // 3. Detail Karyawan 2-Kolom (Gambar 1)
      // Kolom Kiri
      doc.font('Helvetica-Bold').fontSize(8.5).text('Nama', 50, 142);
      doc.font('Helvetica').text(`: ${emp.nama}`, 100, 142);
      
      doc.font('Helvetica-Bold').text('NIK', 50, 154);
      doc.font('Helvetica').text(`: ${emp.nik}`, 100, 154);
      
      doc.font('Helvetica-Bold').text('Jabatan', 50, 166);
      doc.font('Helvetica').text(`: ${emp.jabatan || '-'}`, 100, 166);

      // Kolom Kanan
      doc.font('Helvetica-Bold').text('No. BPJS Ketenagakerjaan', 310, 142);
      doc.font('Helvetica').text(`: ${emp.no_bpjstk || '-'}`, 435, 142);
      
      doc.font('Helvetica-Bold').text('No. BPJS Kesehatan', 310, 154);
      doc.font('Helvetica').text(`: ${emp.no_bpjs_kes || '-'}`, 435, 154);

      // 4. Rincian Gaji Vertikal Bertumpuk - Option A Static (Gambar 2)
      let currentY = 190;

      // --- SUB-TABEL PENDAPATAN ---
      // Header Pendapatan
      doc.rect(50, currentY, 495, 16).fill('#f5f5f5').stroke('#000000');
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8.5);
      doc.text('RINCIAN PENDAPATAN', 60, currentY + 4);
      doc.text('JUMLAH (IDR)', 400, currentY + 4, { align: 'right', width: 135 });

      currentY += 16;
      
      const incomeItems = [
        { label: 'Gaji Pokok', value: emp.gaji_pokok },
        { label: 'Tunjangan Jabatan', value: emp.tunjangan },
        { label: 'Uang Makan', value: emp.uang_makan },
        { label: 'Uang Transport', value: emp.uang_transport },
        { label: 'Lembur', value: emp.lembur },
        { label: 'Insentif', value: emp.insentif },
        { label: 'Lain-lain', value: emp.lain_income }
      ];

      doc.font('Helvetica').fontSize(8.5);
      incomeItems.forEach(item => {
        currentY += 3;
        doc.text(item.label, 60, currentY);
        doc.text(formatRupiahIncome(item.value), 400, currentY, { align: 'right', width: 135 });
        currentY += 10;
      });

      // Total Pendapatan
      currentY += 3;
      doc.moveTo(50, currentY).lineTo(545, currentY).lineWidth(0.5).strokeColor('#000000').stroke();
      
      currentY += 3;
      doc.font('Helvetica-Bold').fontSize(8.5).text('Total Pendapatan', 60, currentY);
      doc.text(formatRupiahIncome(emp.total_income), 400, currentY, { align: 'right', width: 135 });

      currentY += 13;

      // --- SUB-TABEL POTONGAN ---
      currentY += 10;

      // Header Potongan
      doc.rect(50, currentY, 495, 16).fill('#f5f5f5').stroke('#000000');
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8.5);
      doc.text('RINCIAN POTONGAN', 60, currentY + 4);
      doc.text('JUMLAH (IDR)', 400, currentY + 4, { align: 'right', width: 135 });

      currentY += 16;

      const bpjsTK = (emp.jht || 0) + (emp.pensiun || 0);
      const deductItems = [
        { label: 'BPJS Ketenagakerjaan', value: bpjsTK },
        { label: 'BPJS Kesehatan', value: emp.bpjs_kes },
        { label: 'Angsuran Pinjaman', value: emp.pinjaman_bayar },
        { label: 'Lain-lain', value: emp.lain_deduct }
      ];

      doc.font('Helvetica').fontSize(8.5);
      deductItems.forEach(item => {
        currentY += 3;
        doc.text(item.label, 60, currentY);
        doc.text(formatRupiahDeduct(item.value), 400, currentY, { align: 'right', width: 135 });
        currentY += 10;
      });

      // Total Potongan
      currentY += 3;
      doc.moveTo(50, currentY).lineTo(545, currentY).lineWidth(0.5).strokeColor('#000000').stroke();

      currentY += 3;
      doc.font('Helvetica-Bold').fontSize(8.5).text('Total Potongan', 60, currentY);
      doc.text(formatRupiahDeduct(emp.total_deduct), 400, currentY, { align: 'right', width: 135 });

      currentY += 13;

      // 5. Kotak Gaji Diterima (Gambar 3)
      currentY += 16;
      doc.rect(50, currentY, 495, 52).lineWidth(1.2).strokeColor('#000000').stroke();
      
      doc.fillColor('#000000');
      doc.font('Helvetica-Bold').fontSize(8.5).text('GAJI YANG DITERIMA', 50, currentY + 7, { align: 'center', width: 495 });
      doc.font('Helvetica-Bold').fontSize(13.5).text(formatRupiahIncome(emp.grand_total), 50, currentY + 19, { align: 'center', width: 495 });
      doc.font('Helvetica-Oblique').fontSize(8).text(formatTerbilang(emp.grand_total), 50, currentY + 36, { align: 'center', width: 495 });

      currentY += 52;

      // 6. Tanda Tangan Direktur Terpusat (Gambar 3)
      currentY += 30;
      doc.font('Helvetica-Bold').fontSize(8.5).text('PT. LAMLO PHARMACY', 50, currentY, { align: 'center', width: 495 });
      currentY += 45; // Mengurangi jeda kosong dari 60 ke 45 agar lebih rapat & aman
      doc.font('Helvetica-Bold').fontSize(8.5).text('DIREKTUR', 50, currentY, { align: 'center', width: 495 });

      // 7. Catatan Kaki (Footnote) dan Waktu Cetak di Bagian Bawah
      // Menurunkan bottomY ke 765, yang berada di dalam margin 40 (842 - 40 = 802) sehingga dijamin halaman pertama
      const bottomY = 765;
      doc.font('Helvetica-Oblique').fontSize(7).fillColor('#555555');
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
