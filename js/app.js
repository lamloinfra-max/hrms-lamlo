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
      $('fileMeta').textContent = `${formatFileSize(file.size)} · ${employees.length} karyawan`;
      $('btn-next-1').removeAttribute('disabled');
      showToast(`✅ ${employees.length} karyawan terdeteksi.`, 'success');
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

  MONTHS_ID.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1; opt.textContent = m;
    if (i + 1 === state.bulan) opt.selected = true;
    selBulan.appendChild(opt);
  });

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
      <td class="num">${formatRupiah(emp.gaji_pokok)}</td>
      <td class="num">${formatRupiah(emp.grand_total)}</td>
      <td>
        ${emp._hasError ? `<span class="badge badge-error">Error</span>` : `<span class="badge badge-ok">Berhasil</span>`}
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
  
  showToast(`Mempersiapkan preview ${emp.nama}...`, 'info');
  
  try {
    const password = getPasswordForEmployee(emp);
    const finalBytes = await generateSlipGajiPDF(emp, periodeLabel, password);
    
    const blob = new Blob([finalBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const win = window.open(url, '_blank');
    if (!win) {
      showToast('Popup diblokir! Mohon izinkan popup.', 'error');
    } else {
      showToast(`Preview terbuka! Password: ${password}`, 'success');
    }
  } catch (err) {
    showToast('Gagal generate preview: ' + err.message, 'error');
  }
}

function downloadTemplateExcel() {
  const headers = [
    ['NO', 'NAMA', 'NIK', 'NO BPJS KETENAGAKERJAAN', 'NO BPJS KESEHATAN', 'JABATAN', 'GAJI POKOK', 'TUNJANGAN JABATAN', 'UANG MAKAN', 'UANG TRANSPORT', 'LEMBUR', 'INSENTIF', 'LAIN-LAIN (INCOME)', 'TOTAL PENDAPATAN', 'BPJSTK - JHT (2%)', 'BPJSTK - PENSIUNAN (1%)', 'BPJS KESEHATAN (1%)', 'PINJAMAN TOTAL', 'PINJAMAN BAYAR', 'PINJAMAN SISA', 'LAIN-LAIN (POTONGAN)', 'TOTAL POTONGAN', 'GAJI BERSIH (TAKE HOME PAY)', 'PASSWORD PDF (OPTIONAL)'],
    ['1', 'Adit Suryadi', '1234567890', '00012345678', '00009876543', 'IT Manager', 5000000, 1000000, 500000, 500000, 0, 200000, 0, 7200000, 100000, 50000, 50000, 0, 0, 0, 0, 200000, 7000000, 'adit123']
  ];

  const ws = XLSX.utils.aoa_to_sheet([
    ['TEMPLATE SLIP GAJI PT. LAMLO PHARMACY'],
    [],
    headers[0],
    headers[1]
  ]);

  ws['!cols'] = headers[0].map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "TEMPLATE");
  XLSX.writeFile(wb, "Template_Slip_Gaji_Lamlo.xlsx");
  showToast('Template berhasil diunduh!', 'success');
}

// ── Step 4: Generate ────────────────────────────────────────────────────────
async function startGenerate() {
  const employees = state.employees;
  const periodeLabel = getPeriodeLabel(state.bulan, state.tahun);
  const periodeSlug  = getPeriodeSlug(state.bulan, state.tahun);

  const progressBar  = $('progressBar');
  const progressText = $('progressText');
  const logTbody     = $('generateLogTable');
  const downloadSection = $('downloadSection');
  const btnDownload     = $('btnDownload');

  logTbody.innerHTML = '';
  downloadSection.classList.add('hidden');
  progressBar.style.width = '0%';
  progressText.textContent = `Mempersiapkan... 0 / ${employees.length}`;

  const zip = new JSZip();
  let done = 0;
  let hasError = false;

  // Render initial pending states in the table
  employees.forEach(emp => {
    const password = getPasswordForEmployee(emp);
    const tr = document.createElement('tr');
    tr.id = `log-row-${emp.nik}`;
    tr.innerHTML = `
      <td>${emp.no}</td>
      <td><strong>${emp.nama}</strong></td>
      <td class="mono">${password}</td>
      <td class="log-status log-pending">Menunggu...</td>
    `;
    logTbody.appendChild(tr);
  });

  for (const emp of employees) {
    const statusCell = document.querySelector(`#log-row-${emp.nik} .log-status`);
    statusCell.textContent = 'Memproses...';
    statusCell.className = 'log-status'; // Reset

    try {
      const password = getPasswordForEmployee(emp);
      const finalBytes = await generateSlipGajiPDF(emp, periodeLabel, password);

      const fileName = sanitizeFilename(`SlipGaji_${emp.nama}_${periodeSlug}.pdf`);
      zip.file(fileName, finalBytes);

      statusCell.textContent = '✅ Berhasil';
      statusCell.classList.add('log-ok');
    } catch (err) {
      hasError = true;
      statusCell.textContent = '❌ Gagal';
      statusCell.classList.add('log-err');
    }

    done++;
    const pct = Math.round((done / employees.length) * 100);
    progressBar.style.width = `${pct}%`;
    progressText.textContent = `Progress: ${done} / ${employees.length}`;
    
    // Auto scroll the log table container
    const wrapper = logTbody.closest('.table-wrapper') || logTbody.parentElement;
    wrapper.scrollTop = wrapper.scrollHeight;

    await sleep(10); // Small delay for UI smoothness
  }

  if (hasError) {
    progressText.textContent = `⚠️ Selesai dengan kesalahan.`;
    showToast(`Beberapa slip gaji gagal dibuat.`, 'error');
    return;
  }

  progressText.textContent = `✅ Selesai! ${done} slip gaji siap.`;

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipName = sanitizeFilename(`SlipGaji_${periodeSlug}.zip`);

  btnDownload.onclick = () => {
    const url = window.URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url; a.download = zipName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 10000);
  };
  downloadSection.classList.remove('hidden');
  showToast(`🎉 Slip gaji siap diunduh!`, 'success');
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

  $('btn-next-1').addEventListener('click', () => goToStep(2));
  $('btn-back-2').addEventListener('click', () => goToStep(1));
  $('btn-next-2').addEventListener('click', () => goToStep(3));
  $('btn-back-3').addEventListener('click', () => goToStep(2));
  $('btn-next-3').addEventListener('click', () => goToStep(4));
  $('btn-back-4').addEventListener('click', () => goToStep(3));
});
