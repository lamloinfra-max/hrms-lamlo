// app.js — Main application: step wizard, state, events

// ── State ─────────────────────────────────────────────────────────────────
const state = {
  currentStep: 1,
  file: null,
  employees: [],
  bulan: getCurrentMonth(),
  tahun: getCurrentYear(),
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Step Navigation ────────────────────────────────────────────────────────
function goToStep(step) {
  // Validate before advancing
  if (step > state.currentStep) {
    if (state.currentStep === 1 && !state.file) return showToast('Upload file Excel terlebih dahulu.', 'error');
    if (state.currentStep === 3) {
      const hasError = state.employees.some(e => e._hasError);
      if (hasError) return showToast('Perbaiki data yang error terlebih dahulu.', 'error');
    }
  }

  state.currentStep = step;

  document.querySelectorAll('.step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.toggle('active', s === step);
    el.classList.toggle('completed', s < step);
  });

  document.querySelectorAll('.step-panel').forEach(el => {
    el.classList.toggle('active', parseInt(el.id.split('-')[1]) === step);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (step === 2) renderPeriodePreview();
  if (step === 3) renderPreviewTable();
  if (step === 4) startGenerate();
}

// ── Step 1: Upload ─────────────────────────────────────────────────────────
function initUpload() {
  const area   = $('uploadArea');
  const input  = $('fileInput');
  const info   = $('fileInfo');
  const btnClr = $('clearFile');

  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', ()  => area.classList.remove('drag-over'));
  area.addEventListener('drop', e => {
    e.preventDefault(); area.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  input.addEventListener('change', () => { if (input.files[0]) handleFile(input.files[0]); });
  btnClr.addEventListener('click', clearFile);
}

function handleFile(file) {
  if (!file.name.match(/\.(xlsx|xls)$/i)) return showToast('Format file harus .xlsx atau .xls', 'error');
  if (file.size > 10 * 1024 * 1024) return showToast('Ukuran file maksimal 10MB', 'error');

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const employees = parseExcelFile(e.target.result);
      if (employees.length === 0) return showToast('Tidak ada data karyawan ditemukan di sheet TEMPLATE.', 'error');

      state.file = file;
      state.employees = employees;

      $('uploadArea').classList.add('hidden');
      $('fileInfo').classList.remove('hidden');
      $('fileName').textContent = file.name;
      $('fileMeta').textContent = `${formatFileSize(file.size)} · ${employees.length} karyawan terdeteksi`;
      $('btn-next-1').removeAttribute('disabled');
      showToast(`✅ ${employees.length} data karyawan berhasil dibaca.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function clearFile() {
  state.file = null;
  state.employees = [];
  $('uploadArea').classList.remove('hidden');
  $('fileInfo').classList.add('hidden');
  $('fileInput').value = '';
  $('btn-next-1').setAttribute('disabled', '');
}

// ── Step 2: Periode ────────────────────────────────────────────────────────
function initPeriode() {
  const selBulan = $('selBulan');
  const selTahun = $('selTahun');

  // Populate bulan
  MONTHS_ID.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1; opt.textContent = m;
    if (i + 1 === state.bulan) opt.selected = true;
    selBulan.appendChild(opt);
  });

  // Populate tahun (current-2 to current+2)
  const yr = getCurrentYear();
  for (let y = yr - 2; y <= yr + 2; y++) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    if (y === state.tahun) opt.selected = true;
    selTahun.appendChild(opt);
  }

  selBulan.addEventListener('change', () => { state.bulan = parseInt(selBulan.value); renderPeriodePreview(); });
  selTahun.addEventListener('change', () => { state.tahun = parseInt(selTahun.value); renderPeriodePreview(); });
}

function renderPeriodePreview() {
  $('periodePreview').textContent = getPeriodeLabel(state.bulan, state.tahun);
}

// ── Step 3: Preview ────────────────────────────────────────────────────────
function renderPreviewTable() {
  const employees = state.employees;
  const totalKaryawan = employees.length;
  const totalError    = employees.filter(e => e._hasError).length;
  const totalFallback = employees.filter(e => e._passwordFallback && !e._hasError).length;
  const totalGaji     = employees.reduce((s, e) => s + (e.grand_total || 0), 0);

  $('summaryTotal').textContent = totalKaryawan;
  $('summaryError').textContent = totalError;
  $('summaryGaji').textContent  = formatRupiah(totalGaji);

  if (state.employees.length > 0 && !state.employees.some(e => e._hasError)) {
    $('btn-next-3').removeAttribute('disabled');
  } else {
    $('btn-next-3').setAttribute('disabled', '');
  }

  const tbody = $('previewTbody');
  tbody.innerHTML = '';

  employees.forEach((emp, index) => {
    const tr = document.createElement('tr');
    tr.className = emp._hasError ? 'row-error' : '';
    tr.innerHTML = `
      <td>${emp.no}</td>
      <td><strong>${emp.nama}</strong></td>
      <td class="mono">${emp.nik}</td>
      <td>${emp.jabatan}</td>
      <td class="num">${formatRupiah(emp.gaji_pokok)}</td>
      <td class="num">${formatRupiah(emp.grand_total)}</td>
      <td>
        ${emp._hasError ? `<span class="badge badge-error">Error</span>` : `<span class="badge badge-ok">Siap</span>`}
      </td>
      <td>
        ${emp._hasError ? '-' : `<button class="btn btn-ghost btn-sm" onclick="previewEmployeePDF(${index})">👁️ Preview</button>`}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Search
  $('searchInput').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

async function previewEmployeePDF(index) {
  const emp = state.employees[index];
  const periodeLabel = getPeriodeLabel(state.bulan, state.tahun);
  
  showToast(`Mempersiapkan preview untuk ${emp.nama}...`, 'info');
  
  try {
    // 1. Generate PDF
    const pdfBytes = await generateSlipGajiPDF(emp, periodeLabel);

    // 2. Encrypt PDF (Optional for debugging)
    const password = getPasswordForEmployee(emp);
    const useEncryption = true; // AKTIFKAN KEMBALI: Sudah menggunakan logika selektif
    
    let finalBytes;
    if (useEncryption) {
      console.log("[DEBUG] Encrypting PDF...");
      finalBytes = await encryptPDF(new Uint8Array(pdfBytes), password, password);
    } else {
      console.log("[DEBUG] Skipping Encryption for testing...");
      finalBytes = new Uint8Array(pdfBytes);
    }

    // 3. Open in new tab
    const blob = new Blob([finalBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    // Buka tab baru
    const win = window.open(url, '_blank');
    if (!win) {
      showToast('Popup diblokir! Mohon izinkan popup untuk melihat preview.', 'error');
    } else {
      showToast(`Preview terbuka! Password: ${password}`, 'success');
    }
    
    // Kita tidak revoke URL di sini agar user bisa melihat PDF-nya
  } catch (err) {
    console.error(err);
    showToast('Gagal generate preview: ' + err.message, 'error');
  }
}

/**
 * Generate dan download file Excel template
 */
function downloadTemplateExcel() {
  const headers = [
    ['NO', 'NAMA', 'NIK', 'NPWP', 'STATUS', 'JABATAN', 'GAJI POKOK', 'TUNJANGAN JABATAN', 'UANG MAKAN', 'UANG TRANSPORT', 'LEMBUR', 'INSENTIF', 'LAIN-LAIN (INCOME)', 'TOTAL PENDAPATAN', 'JHT (2%)', 'PENSIUN (1%)', 'BPJS KESEHATAN (1%)', 'PINJAMAN TOTAL', 'PINJAMAN BAYAR', 'PINJAMAN SISA', 'LAIN-LAIN (POTONGAN)', 'TOTAL POTONGAN', 'GAJI BERSIH (TAKE HOME PAY)', 'PASSWORD PDF (OPTIONAL)'],
    ['1', 'Adit Suryadi', '1234567890', '987654321', 'Tetap', 'IT Manager', 5000000, 1000000, 500000, 500000, 0, 200000, 0, 7200000, 100000, 50000, 50000, 0, 0, 0, 0, 200000, 7000000, 'adit123']
  ];

  const ws = XLSX.utils.aoa_to_sheet([
    ['TEMPLATE SLIP GAJI PT. LAMLO PHARMACY'],
    [], // Row 1 & 2 used for padding in engine
    headers[0],
    headers[1]
  ]);

  // Set style minimal agar rapi (lebar kolom)
  ws['!cols'] = headers[0].map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "TEMPLATE");

  XLSX.writeFile(wb, "Template_Slip_Gaji_Lamlo.xlsx");
  showToast('Template Excel berhasil diunduh!', 'success');
}

// ── Step 4: Generate ────────────────────────────────────────────────────────
async function startGenerate() {
  const employees = state.employees;
  const periodeLabel = getPeriodeLabel(state.bulan, state.tahun);
  const periodeSlug  = getPeriodeSlug(state.bulan, state.tahun);

  const progressBar  = $('progressBar');
  const progressText = $('progressText');
  const logContainer = $('generateLog');
  const downloadSection = $('downloadSection');
  const btnDownload     = $('btnDownload');

  logContainer.innerHTML = '';
  downloadSection.classList.add('hidden');
  progressBar.style.width = '0%';
  progressText.textContent = `Mempersiapkan... 0 / ${employees.length}`;

  const zip = new JSZip();
  let done = 0;

  for (const emp of employees) {
    try {
      // 1. Generate PDF
      const pdfBytes = await generateSlipGajiPDF(emp, periodeLabel);

      // 2. Encrypt PDF
      const password = emp._resolvedPassword;
      const encBytes = await encryptPDF(new Uint8Array(pdfBytes), password, password);

      // 3. Add to ZIP
      const filename = sanitizeFilename(
        `SlipGaji_${emp.nik}_${emp.nama}_${periodeSlug}.pdf`
      );
      zip.file(filename, encBytes);

      logEntry(logContainer, `✅ ${emp.nama} (${emp.nik}) — password: ${password}`, 'ok');
    } catch (err) {
      logEntry(logContainer, `❌ ${emp.nama} — ${err.message}`, 'err');
    }

    done++;
    if (done % 10 === 0 || done === employees.length) {
      const pct = Math.round((done / employees.length) * 100);
      progressBar.style.width = `${pct}%`;
      progressText.textContent = `Generating ${done} / ${employees.length}`;
      await sleep(1); // Yield to browser to update UI
    }
  }

  progressText.textContent = `✅ Selesai! ${done} slip gaji berhasil di-generate.`;

  // Generate ZIP and trigger download
  const zipBlob = await zip.generateAsync({ 
    type: 'blob', 
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  const zipName = sanitizeFilename(`SlipGaji_${periodeSlug}.zip`);

  btnDownload.onclick = () => {
    try {
      console.log("Triggering robust Blob download for:", zipName);
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      
      // Trigger the download
      a.click();
      
      // Sangat Penting: Beri jeda panjang agar Chrome Download Manager selesai membaca atribut nama file
      // sebelum referensi memori ini dihancurkan.
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(url);
        console.log("Cleanup memori download selesai.");
      }, 10000); // 10 detik

    } catch (err) {
      console.error("Download Error:", err);
      alert("Gagal mendownload: " + err.message);
    }
  };
  downloadSection.classList.remove('hidden');

  showToast(`🎉 ${done} slip gaji siap diunduh!`, 'success');
}

function logEntry(container, msg, type) {
  const div = document.createElement('div');
  div.className = `log-entry log-${type}`;
  div.textContent = msg;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = $('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initUpload();
  initPeriode();

  // Wire navigation buttons
  $('btn-next-1').addEventListener('click', () => goToStep(2));
  $('btn-back-2').addEventListener('click', () => goToStep(1));
  $('btn-next-2').addEventListener('click', () => goToStep(3));
  $('btn-back-3').addEventListener('click', () => goToStep(2));
  $('btn-next-3').addEventListener('click', () => goToStep(4));
  $('btn-back-4').addEventListener('click', () => goToStep(3));
});
