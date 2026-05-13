# Slip Gaji Generator — PT. Lamlo Pharmacy

Aplikasi berbasis web (Client-Side) untuk men-generate slip gaji PDF secara massal dari file Excel dengan fitur enkripsi password otomatis.

## ✨ Fitur Utama

- **Zero-Server Processing**: Data diproses sepenuhnya di browser. Tidak ada data yang dikirim ke server (Aman & Privat).
- **Bulk PDF Generation**: Mendukung generate ratusan slip gaji sekaligus dari satu file Excel.
- **Auto-Encryption**: PDF dilindungi password menggunakan standar RC4 128-bit.
- **Smart Password**: Otomatis menggunakan 5 digit terakhir NIK jika kolom password di Excel kosong.
- **ZIP Download**: Hasil generate dikemas dalam satu file ZIP yang rapi.
- **Modern UI**: Interface bersih dengan stepper wizard untuk memudahkan HRD.

## 🚀 Cara Penggunaan

1. **Persiapkan Data**: Gunakan file Excel dengan sheet bernama `TEMPLATE`. Pastikan kolom `nama`, `nik`, dan detail gaji sudah terisi.
2. **Upload**: Buka aplikasi dan upload file Excel tersebut.
3. **Pilih Periode**: Tentukan bulan dan tahun gaji.
4. **Validasi**: Cek preview data di layar. Pastikan tidak ada status error.
5. **Generate**: Klik tombol Generate. Tunggu hingga proses enkripsi selesai.
6. **Download**: Klik 'Download ZIP' untuk mendapatkan semua file PDF.

## 🛠️ Teknologi yang Digunakan

- **jsPDF**: Untuk pembuatan dokumen PDF.
- **SheetJS (XLSX)**: Untuk pembacaan data Excel.
- **JSZip**: Untuk pengarsipan file.
- **Vanilla JS & CSS**: Tanpa framework berat, menjamin kecepatan akses.
- **Custom Encryption Engine**: Implementasi RC4 biner untuk keamanan dokumen.

## 📦 Menjalankan Secara Lokal

Cukup jalankan web server sederhana di folder project ini:

```bash
# Menggunakan npx
npx http-server

# Atau buka index.html langsung di browser (disarankan via server untuk fitur download yang optimal)
```

---
*PT. Lamlo Pharmacy — Sistem Manajemen Sumber Daya Manusia*
