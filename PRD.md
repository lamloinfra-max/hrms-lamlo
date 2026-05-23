# PRD: Payslip PDF Generator (Slip Gaji)

> **Project**: hrms-lamlo — Payslip Generator
> **Perusahaan**: PT. Lamlo Pharmacy
> **Author**: Adeks
> **Created**: 2026-05-13
> **Status**: Draft v2 — Refined dari Excel Template

---

## 1. Ringkasan Eksekutif

Aplikasi web untuk **generate slip gaji dalam format PDF yang ter-enkripsi password** berdasarkan data karyawan dari file Excel yang di-upload. Setiap PDF dilindungi password unik per karyawan, sehingga hanya karyawan bersangkutan yang bisa membuka slip gajinya.

---

## 2. Problem Statement

| Masalah | Dampak |
|---------|--------|
| Pembuatan slip gaji manual satu per satu | Memakan waktu HRD yang signifikan |
| Distribusi slip gaji tanpa proteksi | Risiko kebocoran data sensitif gaji karyawan |
| Format slip gaji tidak konsisten | Kurang profesional dan sulit di-audit |
| Proses repetitif setiap bulan | Rentan human error & tidak efisien |

---

## 3. Goals & Success Metrics

### Goals
- **Otomatisasi**: Upload Excel → Generate semua PDF dalam hitungan detik
- **Keamanan**: Setiap PDF ter-enkripsi dengan password unik per karyawan
- **Efisiensi**: Mengurangi waktu pembuatan slip gaji dari berjam-jam menjadi menit
- **Konsistensi**: Template slip gaji seragam dan profesional

### Success Metrics
| Metric | Target |
|--------|--------|
| Waktu generate 100 slip gaji | < 30 detik |
| Tingkat error parsing Excel | < 1% |
| Ukuran file PDF per slip | < 500 KB |
| User satisfaction (HRD) | > 4.5/5 |

---

## 4. User Persona

### Primary User: Staff HRD / Payroll Admin
- Menggunakan Excel sebagai data source utama gaji karyawan
- Perlu generate slip gaji setiap bulan untuk seluruh karyawan
- Membutuhkan proteksi keamanan untuk data sensitif
- Skill teknis: Familiar dengan Excel, browser-based tools

---

## 5. Fitur Utama

### 5.1 Upload & Parsing Excel

- Upload file Excel (`.xlsx`, `.xls`)
- Baca sheet **TEMPLATE** sebagai data source utama
- Auto-detect baris header (Row 1: label, Row 2: sub-label)
- Preview data sebelum generate (tabel interaktif)
- Validasi data: cek field kosong, format angka, duplikat NIK
- Support drag & drop upload

#### Mapping Kolom dari Sheet `TEMPLATE`

Berdasarkan file `slip gaji.xlsx`, sheet `TEMPLATE` memiliki struktur berikut:

| Kolom Excel | Field | Tipe | Wajib | Keterangan |
|-------------|-------|------|-------|------------|
| `NO` | no | Number | ✅ | Nomor urut |
| `NAMA` | nama | String | ✅ | Nama lengkap karyawan |
| `NIK` | nik | String | ✅ | Nomor Induk Karyawan |
| `NO BPJS KETENAGAKERJAAN` | no_bpjstk | String | ❌ | Nomor kartu BPJS Ketenagakerjaan (default: `-`) |
| `NO BPJS KESEHATAN` | no_bpjs_kes | String | ❌ | Nomor kartu BPJS Kesehatan (default: `-`) |
| `JABATAN` | jabatan | String | ✅ | Posisi/jabatan |
| `GAJI` | gaji_pokok | Number | ✅ | Gaji pokok |
| `TUNJANGAN` | tunjangan | Number | ❌ | Tunjangan jabatan |
| `MAKAN` | uang_makan | Number | ❌ | Uang makan |
| `TRANSPORT` | uang_transport | Number | ❌ | Uang transport |
| `LEMBUR` | lembur | Number | ❌ | Upah lembur |
| `INSENTIF` | insentif | Number | ❌ | Insentif / bonus |
| `LAIN-LAIN` *(penghasilan)* | lain_penghasilan | Number | ❌ | Penghasilan lain-lain |
| `TOTAL` *(penghasilan)* | total_penghasilan | Number | auto | Auto-hitung |
| `BPJSTK - JHT` | potongan_jht | Number | ❌ | Potongan JHT karyawan |
| `BPJSTK - PENSIUNAN` | potongan_pensiun | Number | ❌ | Potongan pensiun |
| `BPJS KESEHATAN` | potongan_bpjs_kes | Number | ❌ | BPJS Kesehatan |
| `PINJAMAN - TOTAL` | pinjaman_total | Number | ❌ | Total nilai pinjaman |
| `PINJAMAN - BAYAR` | pinjaman_bayar | Number | ❌ | Cicilan pinjaman bulan ini |
| `PINJAMAN - SISA` | pinjaman_sisa | Number | ❌ | Sisa saldo pinjaman |
| `LAIN-LAIN` *(potongan)* | lain_potongan | Number | ❌ | Potongan lain-lain |
| `TOTAL` *(potongan)* | total_potongan | Number | auto | Auto-hitung |
| `GRAND TOTAL` | gaji_bersih | Number | auto | Take Home Pay |
| `PASSWORD` | password | String | ❌ | Password enkripsi PDF — opsional, ada fallback otomatis |

> **Password Rule:**
> - Jika kolom `PASSWORD` **diisi** → pakai nilai tersebut
> - Jika kolom `PASSWORD` **kosong / tidak ada** → fallback ke **5 huruf terakhir NIK** (contoh: NIK `001234567` → password `34567`)

### 5.2 PDF Generation

- Template slip gaji mengikuti layout dari sheet **SLIP GAJI** di file Excel
- Branding header perusahaan di-design seragam (kop surat + logo)
- Layout dua kolom: Penghasilan (kiri) | Potongan (kanan)
- Label "PRIVATE & CONFIDENTIAL" di pojok kanan atas

#### Layout PDF (berdasarkan sheet `SLIP GAJI`)

```
┌────────────────────────────────────────────────────────┐
│  [LOGO]  PT. LAMLO PHARMACY        PRIVATE & CONFIDENTIAL │
│          Jl. Teuku Fakinah No. 07 Lam Blang Trieng     │
│          Darul Imarah - Aceh Besar                     │
├────────────────────────────────────────────────────────┤
│              SLIP GAJI                                 │
│           BULAN MEI 2026                               │
├────────────────────────────────────────────────────────┤
│  Nama    : John Doe                                    │
│  NIK     : 001234                                      │
│  Jabatan : Software Engineer                           │
├─────────────────────────────┬──────────────────────────┤
│ PENGHASILAN :               │ POTONGAN :               │
│                             │                          │
│ 1. Gaji Pokok        : Rp   │ 1. BPJSTK (JHT)   : Rp  │
│ 2. Tunjangan         : Rp   │ 2. BPJSTK (Pensiun): Rp │
│ 3. Uang Makan        : Rp   │ 3. BPJS Kesehatan  : Rp  │
│ 4. Uang Transport    : Rp   │ 4. Cicilan Pinjaman: Rp  │
│ 5. Lembur            : Rp   │ 5. Lain-lain       : Rp  │
│ 6. Insentif          : Rp   │                          │
│ 7. Lain-lain         : Rp   │                          │
├─────────────────────────────┼──────────────────────────┤
│ Total Penghasilan    : Rp   │ Total Potongan     : Rp  │
├─────────────────────────────┴──────────────────────────┤
│  Gaji Bersih         : Rp xxxxxxx                      │
│  Saldo Pinjaman      : Rp xxxxxxx                      │
└────────────────────────────────────────────────────────┘
```

#### Komponen Kop Surat (Header Design)
- Logo perusahaan (placeholder / upload by admin)
- Nama perusahaan: **PT. LAMLO PHARMACY** (bold, font besar)
- Alamat: Jl. Teuku Fakinah No. 07 Lam Blang Trieng
- Sub-alamat: Darul Imarah - Aceh Besar
- Label **PRIVATE & CONFIDENTIAL** (merah, pojok kanan atas)
- Garis separator tebal di bawah header

### 5.3 Enkripsi PDF

- Setiap PDF di-enkripsi dengan password dari kolom `Password` di Excel
- Algoritma enkripsi: **AES-256** (standar PDF encryption)
- User harus memasukkan password untuk membuka PDF
- Password tidak disimpan di server (zero-knowledge)

### 5.4 Download & Distribusi

- **Bulk download**: Semua PDF dalam satu file `.zip`
- **Naming convention**: `SlipGaji_[NIK]_[Nama]_[Periode].pdf`
- **Opsional (v2)**: Kirim langsung ke email karyawan

---

## 6. User Flow — Step by Step UI

```
Step 1: Upload Excel
Step 2: Pilih Periode (Bulan & Tahun)
Step 3: Preview & Validasi Data
Step 4: Generate + Download ZIP
```

### 6.1 Step-by-Step UI Detail

#### Step 1 — Upload File Excel
- Drag & drop area yang prominent
- Tombol "Browse File" sebagai alternatif
- Validasi: hanya `.xlsx`, maks 10MB
- Indikator loading saat file diproses
- Tampilkan nama file + jumlah baris yang terdeteksi
- Tombol "Lanjut →" aktif setelah file valid

#### Step 2 — Pilih Periode
- Dropdown **Bulan** (Januari — Desember)
- Dropdown **Tahun** (auto-fill tahun berjalan, bisa diubah)
- Preview teks real-time: *"SLIP GAJI BULAN MEI 2026"*
- Navigasi: ← Kembali | Lanjut →

#### Step 3 — Preview & Validasi Data
- Tabel interaktif dari data sheet TEMPLATE
- Badge status per baris:
  - 🟢 **OK** — data lengkap, password defined
  - 🟡 **Fallback** — password akan pakai 5 char terakhir NIK
  - 🔴 **Error** — field wajib kosong (nama/NIK/gaji pokok)
- Sortable & searchable
- Summary card: Total karyawan | Total gaji bersih | Jumlah error
- Harus 0 error sebelum bisa lanjut ke step berikutnya
- Navigasi: ← Kembali | Generate Semua Slip →

#### Step 4 — Generate & Download
- Progress bar dengan label: *"Generating 12 / 45 PDF..."*
- Log per karyawan (nama — ✅ Berhasil / ❌ Error)
- Setelah selesai: tombol **⬇ Download ZIP**
- Naming ZIP: `SlipGaji_[BulanTahun].zip`
- Naming tiap PDF: `SlipGaji_[NIK]_[Nama]_[BulanTahun].pdf`

---

## 7. Arsitektur & Tech Stack

> **Keputusan arsitektur yang perlu didiskusikan:**
> Apakah ini akan jadi **standalone web app** atau **bagian dari HRMS yang lebih besar**?

### Opsi A: Client-Side Only (Ringan & Cepat) ⭐ Rekomendasi untuk MVP

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| **Frontend** | HTML + Vanilla JS + CSS | Simpel, cepat, no framework overhead |
| **Excel Parsing** | SheetJS (xlsx) | Library terpopuler untuk parsing Excel di browser |
| **PDF Generation** | jsPDF + jsPDF-AutoTable | Generate PDF di client-side |
| **PDF Encryption** | pdf-lib | Enkripsi PDF dengan password |
| **Bundling** | JSZip | Bundle multiple PDF ke satu file ZIP |
| **Download** | FileSaver.js | Trigger download dari browser |

**Keunggulan Opsi A**: Semua proses berjalan di **client-side (browser)**. Tidak perlu backend/server. Data gaji **TIDAK PERNAH** dikirim ke server manapun — **privacy by design**. Zero hosting cost.

### Opsi B: Full-Stack Web App (Scalable)

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| **Frontend** | Next.js / Vite + React | SPA dengan UX lebih kaya |
| **Backend** | Next.js API Routes / Express | Server-side processing |
| **Excel Parsing** | exceljs (Node.js) | Parsing di server |
| **PDF Generation** | Puppeteer / PDFKit | Server-side PDF generation |
| **PDF Encryption** | node-qpdf / pdf-lib | Enkripsi di server |
| **Storage** | Temporary (auto-delete) | Hanya untuk proses, tidak persist |

---

## 8. Pertimbangan Keamanan

| Aspek | Implementasi |
|-------|-------------|
| **Data tidak disimpan** | Semua proses di memori, tidak ada penyimpanan permanen |
| **Password handling** | Password hanya dipakai untuk enkripsi, tidak di-log/simpan |
| **Client-side processing** | Data Excel tidak pernah keluar dari browser user (Opsi A) |
| **PDF Encryption** | AES-256 bit encryption standard |
| **No authentication needed** | Tool internal, bisa di-deploy di intranet |
| **Auto-cleanup** | File temporary dihapus setelah download selesai |

---

## 9. Batasan & Asumsi

### Asumsi
- Format Excel sudah memiliki struktur kolom yang konsisten
- Password sudah disediakan oleh HRD di dalam file Excel
- Jumlah karyawan per batch: maksimal **1.000 karyawan**
- Browser modern (Chrome, Firefox, Edge terbaru)

### Batasan (v1)
- Tidak ada fitur login/authentication
- Tidak ada penyimpanan history
- Tidak ada pengiriman email otomatis
- Template slip gaji fixed (1 template)
- Hanya support format `.xlsx`

---

## 10. Roadmap

### Phase 1 — MVP (v1.0) 🎯
- [ ] Upload & parsing Excel
- [ ] Validasi data
- [ ] Preview data di tabel
- [ ] Generate PDF slip gaji
- [ ] Enkripsi PDF dengan password
- [ ] Bulk download sebagai ZIP
- [ ] UI/UX yang clean dan profesional

### Phase 2 — Enhancement (v1.5)
- [ ] Multiple template slip gaji
- [ ] Custom branding (upload logo, warna perusahaan)
- [ ] Column mapping UI (drag & drop kolom Excel ke field slip)
- [ ] Riwayat generate (localStorage)

### Phase 3 — Advanced (v2.0)
- [ ] Kirim slip gaji via email otomatis
- [ ] Integration dengan Google Sheets
- [ ] Multi-bahasa (ID/EN)
- [ ] Export summary report (rekapitulasi)
- [ ] Role-based access (admin, viewer)

---

## 11. Open Questions

**Pertanyaan yang perlu dijawab sebelum development:**

1. ~~**Arsitektur**~~ ✅ **RESOLVED**: Opsi A — client-side only, data tidak keluar browser.

2. ~~**Template Slip Gaji**~~ ✅ **RESOLVED**: Layout mengikuti sheet `SLIP GAJI` dari file Excel.

3. ~~**Password Rule**~~ ✅ **RESOLVED**:
   - Jika kolom `PASSWORD` diisi di Excel → gunakan nilai tersebut
   - Jika kosong → fallback otomatis ke **5 karakter terakhir NIK**

4. ~~**Branding**~~ ✅ **RESOLVED**: **PT. Lamlo Pharmacy**, Jl. Teuku Fakinah No. 07, Darul Imarah - Aceh Besar.

5. ~~**Kolom Tambahan**~~ ✅ **RESOLVED**: Kolom terpetakan lengkap — Insentif, BPJSTK JHT & Pensiun, Cicilan Pinjaman.

6. ~~**Periode**~~ ✅ **RESOLVED**: Dipilih oleh user melalui UI **Step 2** (dropdown Bulan + Tahun).

7. ~~**Logo**~~ ✅ **RESOLVED**: File `logo.png` sudah tersedia di project folder.

> **Semua open questions telah resolved. PRD siap untuk masuk ke fase development.**

---

## 12. Referensi Desain

### UI Inspirasi
- Clean dashboard style dengan card-based layout
- Dark mode support
- Drag & drop upload area yang prominent
- Progress bar saat generate PDF
- Tabel preview yang sortable & searchable

### Warna & Tema
- Primary: Deep blue / Navy (`#1a365d`) — profesional & trustworthy
- Accent: Teal (`#38b2ac`) — modern & fresh
- Background: Slate gray (`#f7fafc`) — clean & readable
- Danger/Error: Coral (`#e53e3e`)
- Success: Emerald (`#38a169`)

---

*Dokumen ini akan di-update seiring brainstorming berlanjut.*
