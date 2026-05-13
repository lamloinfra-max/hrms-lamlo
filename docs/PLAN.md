# PLAN: Perbaikan Final PDF Blank & Sync Enkripsi

## 🔍 Analisis Masalah
Meskipun password diterima, PDF tampil blank. Ini menandakan:
1. **Integritas Konten:** Stream data terenkripsi namun tidak bisa didekompresi oleh PDF Reader.
2. **Sync ID:** Objek `/ID` di trailer PDF harus identik dengan ID yang digunakan dalam derivasi kunci enkripsi. Jika tidak sinkron, Reader akan gagal membaca stream.
3. **Missing Strings:** Selain stream, string teks di luar stream (seperti judul atau metadata tertentu) mungkin perlu ditangani agar tidak dianggap korup oleh Reader.

## 🛠️ Rencana Aksi

### Tahap 1: Sinkronisasi Trailer & ID (Debugger)
- Memastikan `/ID` di trailer memiliki dua entri yang identik dan sesuai dengan `fileId` biner yang digunakan dalam fungsi `md5`.
- Membersihkan trailer dari entri lama secara total sebelum menyuntikkan entri baru.

### Tahap 2: Optimasi Pembangkitan PDF (Frontend Specialist)
- Mengaktifkan kompresi internal `jsPDF` (`compress: true`) untuk mengurangi beban string.
- Memastikan logo yang di-resize tetap memiliki integritas biner yang baik.

### Tahap 3: Verifikasi Output (Test Engineer)
- Melakukan audit biner pada PDF hasil generate untuk memastikan kata kunci `stream` dan `endstream` tidak terenkripsi secara tidak sengaja.

## 🚀 Langkah Eksekusi
1. Update `js/pdf-encrypt.js` untuk pembersihan trailer yang lebih agresif.
2. Update `js/pdf-generator.js` untuk memastikan opsi kompresi aktif.
3. Final check pada alur `app.js`.

---
**Status: Menunggu Persetujuan User**
