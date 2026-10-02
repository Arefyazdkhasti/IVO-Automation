// DOM Elements - Navigation Tabs
const tabPermitBtn = document.getElementById('tabPermitBtn');
const tabDischargeBtn = document.getElementById('tabDischargeBtn');
const permitPane = document.getElementById('permitPane');
const dischargePane = document.getElementById('dischargePane');

// DOM Elements - Permit Workflow
const userSelect = document.getElementById('userSelect');
const previewName = document.getElementById('previewName');
const previewUsername = document.getElementById('previewUsername');
const userAvatar = document.getElementById('userAvatar');
const breedSelect = document.getElementById('breedSelect');
const epidemInput = document.getElementById('epidemInput');
const hatchInput = document.getElementById('hatchInput');
const slaughterSelect = document.getElementById('slaughterSelect');
const quantityInput = document.getElementById('quantityInput');
const showBrowserCheck = document.getElementById('showBrowserCheck');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

const systemDot = document.getElementById('systemDot');
const systemStatusText = document.getElementById('systemStatusText');

const totalCodesBadge = document.getElementById('totalCodesBadge');
const successCodesBadge = document.getElementById('successCodesBadge');
const failedCodesBadge = document.getElementById('failedCodesBadge');
const codesList = document.getElementById('codesList');
const editCodesBtn = document.getElementById('editCodesBtn');

// DOM Elements - Discharge Clearance Workflow (login.js)
const dischargeUserSelect = document.getElementById('dischargeUserSelect');
const dischargeHeadlessCheck = document.getElementById('dischargeHeadlessCheck');
const startDischargeBtn = document.getElementById('startDischargeBtn');
const stopDischargeBtn = document.getElementById('stopDischargeBtn');
const statCheckedCount = document.getElementById('statCheckedCount');
const statDischargedCount = document.getElementById('statDischargedCount');
const statNoArrivalCount = document.getElementById('statNoArrivalCount');
const pastReportsSelect = document.getElementById('pastReportsSelect');
const dischargeTableBody = document.getElementById('dischargeTableBody');

// Console Logs
const terminalWindow = document.getElementById('terminalWindow');
const clearLogsBtn = document.getElementById('clearLogsBtn');

// Modals
const captchaModal = document.getElementById('captchaModal');
const captchaImage = document.getElementById('captchaImage');
const captchaInput = document.getElementById('captchaInput');
const submitCaptchaBtn = document.getElementById('submitCaptchaBtn');
const captchaErrorText = document.getElementById('captchaErrorText');

const editCodesModal = document.getElementById('editCodesModal');
const codesTextarea = document.getElementById('codesTextarea');
const saveCodesBtn = document.getElementById('saveCodesBtn');
const cancelCodesBtn = document.getElementById('cancelCodesBtn');

// State
let usersList = [];
let slaughterhousesList = [];
let trackingCodes = [];
let codeStatusMap = {}; // code -> { status, message }
let currentWorkflow = 'permit'; // 'permit' | 'discharge'
let dischargeRecords = []; // array of records being tracked

// Initialize
async function init() {
  await loadUsers();
  await loadSlaughterhouses();
  await loadCodes();
  await loadPastReports();
  setupEventSource();
  setupListeners();
}

// Load Users
async function loadUsers() {
  try {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (data.success && data.users) {
      usersList = data.users;
      
      // Populate permit user select
      userSelect.innerHTML = '<option value="" disabled selected>-- یک دامدار را انتخاب کنید --</option>';
      // Populate discharge user select with 'ALL' as first and default
      dischargeUserSelect.innerHTML = '<option value="ALL" selected>⚡ همه کاربران (بررسی دسته‌ای تمام مرغداران)</option>';
      
      usersList.forEach((user) => {
        const opt1 = document.createElement('option');
        opt1.value = user.username;
        opt1.textContent = `${user.name} (${user.username})`;
        userSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = user.username;
        opt2.textContent = `${user.name} (${user.username})`;
        dischargeUserSelect.appendChild(opt2);
      });

      // Default select first user for permit
      if (usersList.length > 0) {
        userSelect.selectedIndex = 1;
        updateUserPreview(usersList[0]);
      }
      dischargeUserSelect.value = 'ALL';
    }
  } catch (e) {
    console.error('Error fetching users:', e);
  }
}

// Load Slaughterhouses
async function loadSlaughterhouses() {
  try {
    const res = await fetch('/api/slaughterhouses');
    const data = await res.json();
    if (data.success && data.slaughterhouses) {
      slaughterhousesList = data.slaughterhouses;
      slaughterSelect.innerHTML = '<option value="" disabled>-- کشتارگاه مقصد را انتخاب کنید --</option>';
      slaughterhousesList.forEach((sh, idx) => {
        const opt = document.createElement('option');
        opt.value = sh.code;
        opt.dataset.name = sh.name;
        opt.textContent = `${sh.name} (شناسه جهاد: ${sh.code})`;
        if (sh.name.includes('ساینا') || idx === 0) {
          opt.selected = true;
        }
        slaughterSelect.appendChild(opt);
      });
    }
  } catch (e) {
    console.error('Error fetching slaughterhouses:', e);
  }
}

// Load Tracking Codes
async function loadCodes() {
  try {
    const res = await fetch('/api/codes');
    const data = await res.json();
    if (data.success && data.codes) {
      trackingCodes = data.codes;
      renderCodesList();
    }
  } catch (e) {
    console.error('Error fetching codes:', e);
  }
}

// Load Past Reports from results/
async function loadPastReports() {
  try {
    const res = await fetch('/api/reports');
    const data = await res.json();
    if (data.success && data.reports && data.reports.length > 0) {
      pastReportsSelect.innerHTML = '<option value="">-- مشاهده یکی از گزارش‌های پیشین --</option>';
      data.reports.forEach((rep) => {
        const opt = document.createElement('option');
        opt.value = rep.filename;
        const dateStr = rep.executionTimestamp ? new Date(rep.executionTimestamp).toLocaleDateString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '';
        
        if (rep.isSummary) {
          opt.textContent = `📊 گزارش تجمیعی کل (${rep.summaryList?.length || 0} مرغدار) - ${dateStr} [${rep.stats?.totalDischarged || 0} تخلیه]`;
          opt.dataset.report = JSON.stringify(rep);
          pastReportsSelect.appendChild(opt);
        } else if (rep.user && rep.username) {
          opt.textContent = `👤 ${rep.user} (${rep.username}) - ${dateStr} [${rep.stats?.totalDischarged || 0} تخلیه]`;
          opt.dataset.report = JSON.stringify(rep);
          pastReportsSelect.appendChild(opt);
        }
      });
    }
  } catch (e) {
    console.error('Error fetching reports:', e);
  }
}

function updateUserPreview(user) {
  if (!user) return;
  previewName.textContent = user.name;
  previewUsername.textContent = `نام کاربری: ${user.username}`;
  userAvatar.textContent = user.name.trim().charAt(0) || 'ک';

  if (user.breed) {
    breedSelect.value = user.breed;
  } else {
    breedSelect.value = 'راس';
  }

  epidemInput.value = user.epidemiologicCode || 'ندارد';
  hatchInput.value = user.hatchingPermitCode || '';
}

function renderCodesList() {
  totalCodesBadge.textContent = `تعداد کل: ${trackingCodes.length}`;
  let successCount = 0;
  let failedCount = 0;

  codesList.innerHTML = '';
  trackingCodes.forEach((code, idx) => {
    const statusObj = codeStatusMap[code] || { status: 'pending' };
    const row = document.createElement('div');
    row.className = `code-row ${statusObj.status}`;
    row.id = `code-row-${code}`;

    let badgeHtml = '<span class="badge badge-gray">در انتظار</span>';
    if (statusObj.status === 'checking') {
      badgeHtml = '<span class="badge badge-cyan">در حال بررسی...</span>';
    } else if (statusObj.status === 'matched' || statusObj.status === 'completed') {
      badgeHtml = '<span class="badge badge-emerald">حمل به کشتارگاه ✓</span>';
      successCount++;
    } else if (statusObj.status === 'rejected' || statusObj.status === 'error') {
      badgeHtml = `<span class="badge badge-rose">ناموفق</span>`;
      failedCount++;
    }

    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <span style="color:#64748b; font-size:0.8rem;">${idx + 1}.</span>
        <strong style="font-family:monospace; font-size:1rem; letter-spacing:1px;">${code}</strong>
      </div>
      <div>${badgeHtml}</div>
    `;
    codesList.appendChild(row);
  });

  successCodesBadge.textContent = `موفق: ${successCount}`;
  failedCodesBadge.textContent = `ناموفق: ${failedCount}`;
}

// Stepper Updater for Permit Flow
function updateStepper(stepIndex) {
  for (let i = 1; i <= 5; i++) {
    const stepEl = document.getElementById(`step${i}`);
    if (!stepEl) continue;
    stepEl.classList.remove('active', 'completed');
    if (i < stepIndex) {
      stepEl.classList.add('completed');
    } else if (i === stepIndex) {
      stepEl.classList.add('active');
    }
  }
}

// Add Log Line
function addLog(time, message, type = 'info') {
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="log-${type}">${escapeHtml(message)}</span>
  `;
  terminalWindow.appendChild(line);
  terminalWindow.scrollTop = terminalWindow.scrollHeight;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

// Render Discharge Records Table
function renderDischargeTable(records) {
  dischargeTableBody.innerHTML = '';
  if (!records || records.length === 0) {
    dischargeTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--color-ink-dim); padding: 2rem;">
          موردی برای نمایش وجود ندارد.
        </td>
      </tr>
    `;
    return;
  }

  records.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.id = `discharge-row-${r.trackingCode}`;

    let statusBadge = '<span class="badge badge-gray">در انتظار</span>';
    if (r.status === 'processing') {
      statusBadge = '<span class="badge badge-cyan">در حال ثبت...</span>';
    } else if (r.status?.includes('ثبت شد') || r.status === 'success') {
      statusBadge = '<span class="badge badge-emerald">تایید تخلیه ثبت شد ✓</span>';
    } else if (r.status?.includes('عدم وصول')) {
      statusBadge = '<span class="badge badge-rose">عدم وصول</span>';
    } else if (r.status?.includes('تخلیه نشده')) {
      statusBadge = '<span class="badge badge-cyan">تخلیه نشده</span>';
    }

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><span style="font-weight: 600; color: var(--color-ink-white);">${escapeHtml(r.user || r.username || '-')}</span></td>
      <td><strong style="font-family: monospace; letter-spacing: 0.5px;">${r.trackingCode}</strong></td>
      <td>${r.creationDate || r.fullDateText || '-'}</td>
      <td><span style="font-size: 0.8rem; color: var(--color-ink-white-muted);">${r.reportName || r.reportType || '-'}</span></td>
      <td>${r.dischargeDateSet || r.dischargeDate || '-'}</td>
      <td>${statusBadge}</td>
    `;
    dischargeTableBody.appendChild(tr);
  });
}

// Setup Server-Sent Events (SSE)
function setupEventSource() {
  const evtSource = new EventSource('/api/events');

  evtSource.addEventListener('status', (e) => {
    const data = JSON.parse(e.data);
    handleStatusChange(data);
  });

  evtSource.addEventListener('log', (e) => {
    const data = JSON.parse(e.data);
    addLog(data.time, data.message, data.type);
  });

  evtSource.addEventListener('captcha_error', (e) => {
    const data = JSON.parse(e.data);
    captchaErrorText.textContent = data.message || 'کپچا اشتباه بود، لطفاً مجدداً تلاش کنید.';
    captchaErrorText.style.display = 'block';
  });

  evtSource.addEventListener('code_progress', (e) => {
    const data = JSON.parse(e.data);
    codeStatusMap[data.code] = { status: data.status, message: data.message };
    renderCodesList();

    const row = document.getElementById(`code-row-${data.code}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  // Discharge Specific SSE Events
  evtSource.addEventListener('discharge_records_found', (e) => {
    const data = JSON.parse(e.data);
    const newPending = (data.pendingRecords || []).map((r) => ({ ...r, user: data.user, username: data.username, status: 'تخلیه نشده' }));
    const newNoArrival = (data.excludedRecords || []).map((r) => ({ ...r, user: data.user, username: data.username, status: 'عدم وصول' }));
    dischargeRecords.push(...newPending, ...newNoArrival);

    const totalPending = dischargeRecords.filter((r) => !r.status?.includes('عدم وصول')).length;
    const totalNoArrival = dischargeRecords.filter((r) => r.status?.includes('عدم وصول')).length;
    statCheckedCount.textContent = totalPending;
    statNoArrivalCount.textContent = totalNoArrival;

    renderDischargeTable(dischargeRecords);
  });

  evtSource.addEventListener('discharge_item_progress', (e) => {
    const data = JSON.parse(e.data);
    const existing = dischargeRecords.find((r) => r.trackingCode === data.trackingCode);
    if (existing) {
      existing.status = data.status === 'success' ? 'تایید تخلیه با موفقیت ثبت شد' : data.status;
    }
    renderDischargeTable(dischargeRecords);

    // Update count of discharged
    const completedCount = dischargeRecords.filter((r) => r.status === 'success' || r.status?.includes('ثبت شد')).length;
    statDischargedCount.textContent = completedCount;
  });

  evtSource.onerror = (err) => {
    console.warn('SSE connection issue, reconnecting...', err);
  };
}

function handleStatusChange(data) {
  const status = data.status;
  const service = data.service || 'permit';

  if (status === 'starting') {
    updateUIState(true, service);
    if (service === 'permit') updateStepper(1);
    systemDot.className = 'status-dot busy';
    systemStatusText.textContent = 'در حال راه‌اندازی مرورگر...';
  } else if (status === 'logging_in') {
    if (service === 'permit') updateStepper(2);
    systemDot.className = 'status-dot busy';
    systemStatusText.textContent = 'در حال ورود به سامانه...';
  } else if (status === 'waiting_captcha') {
    if (service === 'permit') updateStepper(2);
    systemDot.className = 'status-dot busy';
    systemStatusText.textContent = 'در انتظار وارد کردن کد امنیتی (کپچا)...';
    openCaptchaModal(data.captchaImage);
  } else if (status === 'navigating') {
    closeCaptchaModal();
    if (service === 'permit') updateStepper(3);
    systemDot.className = 'status-dot busy';
    systemStatusText.textContent = 'در حال هدایت به منو و فرم‌ها...';
  } else if (status === 'checking_codes') {
    closeCaptchaModal();
    updateStepper(3);
    systemDot.className = 'status-dot busy';
    systemStatusText.textContent = 'در حال بررسی کدهای رهگیری و حمل به کشتارگاه...';
  } else if (status === 'filling_details') {
    closeCaptchaModal();
    updateStepper(4);
    systemDot.className = 'status-dot busy';
    systemStatusText.textContent = 'در حال تکمیل مشخصات نژاد، کالا و فراخوانی کشتارگاه مقصد...';
  } else if (status === 'discharging') {
    closeCaptchaModal();
    systemDot.className = 'status-dot busy';
    systemStatusText.textContent = `در حال ثبت تایید تخلیه (${data.total || ''} مورد)...`;
  } else if (status === 'success') {
    closeCaptchaModal();
    if (service === 'permit') updateStepper(5);
    updateUIState(false, service);
    systemDot.className = 'status-dot active';
    systemStatusText.textContent = 'عملیات با موفقیت کامل انجام شد ✓';
    loadPastReports(); // refresh reports list
    alert(`🎉 ${data.message || 'عملیات با موفقیت کامل انجام شد!'}`);
  } else if (status === 'failed') {
    closeCaptchaModal();
    updateUIState(false, service);
    systemDot.className = 'status-dot';
    systemStatusText.textContent = 'متوقف شده / خطا';
  } else if (status === 'idle') {
    closeCaptchaModal();
    updateUIState(false, service);
    systemDot.className = 'status-dot';
    systemStatusText.textContent = 'آماده به کار';
  }
}

function updateUIState(running, service) {
  if (service === 'discharge') {
    startDischargeBtn.disabled = running;
    stopDischargeBtn.disabled = !running;
    dischargeUserSelect.disabled = running;
  } else {
    startBtn.disabled = running;
    stopBtn.disabled = !running;
    userSelect.disabled = running;
    slaughterSelect.disabled = running;
    quantityInput.disabled = running;
    breedSelect.disabled = running;
    hatchInput.disabled = running;
  }
}

// Captcha Modal Handlers
function openCaptchaModal(base64Image) {
  captchaImage.src = base64Image;
  captchaInput.value = '';
  captchaErrorText.style.display = 'none';
  captchaModal.classList.add('active');
  setTimeout(() => captchaInput.focus(), 150);
}

function closeCaptchaModal() {
  captchaModal.classList.remove('active');
}

async function submitCaptcha() {
  const code = captchaInput.value.trim();
  if (!code) {
    captchaErrorText.textContent = 'لطفاً کد کپچا را وارد کنید.';
    captchaErrorText.style.display = 'block';
    return;
  }

  submitCaptchaBtn.disabled = true;
  submitCaptchaBtn.textContent = 'در حال ارسال...';

  try {
    const res = await fetch('/api/submit-captcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captchaCode: code }),
    });
    const data = await res.json();
    if (!data.success) {
      captchaErrorText.textContent = data.error || 'خطا در ثبت کپچا';
      captchaErrorText.style.display = 'block';
    }
  } catch (err) {
    captchaErrorText.textContent = 'خطا در ارتباط با سرور: ' + err.message;
    captchaErrorText.style.display = 'block';
  } finally {
    submitCaptchaBtn.disabled = false;
    submitCaptchaBtn.textContent = 'تایید و ورود ↵';
  }
}

// Setup Event Listeners
function setupListeners() {
  // Navigation Tabs Switching
  tabPermitBtn.addEventListener('click', () => {
    tabPermitBtn.classList.add('active');
    tabDischargeBtn.classList.remove('active');
    permitPane.classList.add('active');
    dischargePane.classList.remove('active');
    currentWorkflow = 'permit';
  });

  tabDischargeBtn.addEventListener('click', () => {
    tabDischargeBtn.classList.add('active');
    tabPermitBtn.classList.remove('active');
    dischargePane.classList.add('active');
    permitPane.classList.remove('active');
    currentWorkflow = 'discharge';
  });

  // User Selection change
  userSelect.addEventListener('change', () => {
    const user = usersList.find((u) => u.username === userSelect.value);
    updateUserPreview(user);
  });

  // Permit Start Button
  startBtn.addEventListener('click', async () => {
    const selectedUsername = userSelect.value;
    if (!selectedUsername) {
      alert('لطفاً یک دامدار را انتخاب کنید.');
      return;
    }

    const selectedSlaughterCode = slaughterSelect.value;
    const selectedSlaughterName = slaughterSelect.options[slaughterSelect.selectedIndex]?.dataset.name || '';
    if (!selectedSlaughterCode) {
      alert('لطفاً کشتارگاه مقصد را انتخاب کنید.');
      return;
    }

    const quantity = quantityInput.value.trim() || '2000';
    const breed = breedSelect.value;
    const hatchingPermitCode = hatchInput.value.trim();

    codeStatusMap = {};
    renderCodesList();

    const headless = !showBrowserCheck.checked;

    try {
      startBtn.disabled = true;
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUsername,
          headless: headless,
          slaughterhouseCode: selectedSlaughterCode,
          slaughterhouseName: selectedSlaughterName,
          quantity: quantity,
          breed: breed,
          hatchingPermitCode: hatchingPermitCode,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert('خطا در شروع: ' + data.error);
        startBtn.disabled = false;
      }
    } catch (e) {
      alert('خطا در ارتباط با سرور: ' + e.message);
      startBtn.disabled = false;
    }
  });

  // Permit Stop Button
  stopBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/stop', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  });

  // Discharge Start Button (login.js)
  startDischargeBtn.addEventListener('click', async () => {
    const selectedUsername = dischargeUserSelect.value;
    if (!selectedUsername) {
      alert('لطفاً یک کاربر را جهت استعلام تخلیه انتخاب کنید.');
      return;
    }

    const headless = !dischargeHeadlessCheck.checked;

    try {
      startDischargeBtn.disabled = true;
      stopDischargeBtn.disabled = false;

      // Reset UI stats
      statCheckedCount.textContent = '۰';
      statDischargedCount.textContent = '۰';
      statNoArrivalCount.textContent = '۰';
      dischargeRecords = [];
      renderDischargeTable([]);

      const res = await fetch('/api/discharge/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUsername,
          headless: headless,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert('خطا در شروع استعلام تخلیه: ' + data.error);
        startDischargeBtn.disabled = false;
        stopDischargeBtn.disabled = true;
      }
    } catch (e) {
      alert('خطا در ارتباط با سرور: ' + e.message);
      startDischargeBtn.disabled = false;
      stopDischargeBtn.disabled = true;
    }
  });

  // Discharge Stop Button
  stopDischargeBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/stop', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  });

  // Past Reports Selector Change
  pastReportsSelect.addEventListener('change', () => {
    const selectedOpt = pastReportsSelect.options[pastReportsSelect.selectedIndex];
    if (!selectedOpt || !selectedOpt.dataset.report) return;

    try {
      const rep = JSON.parse(selectedOpt.dataset.report);
      statCheckedCount.textContent = rep.stats?.totalChecked || 0;
      statDischargedCount.textContent = rep.stats?.totalDischarged || 0;
      statNoArrivalCount.textContent = rep.stats?.totalNoArrival || 0;

      let records = [];
      if (rep.isSummary && Array.isArray(rep.summaryList)) {
        rep.summaryList.forEach((subRep) => {
          (subRep.dischargedRecords || []).forEach((r) => {
            records.push({
              user: subRep.user || subRep.username,
              trackingCode: r.trackingCode,
              creationDate: r.creationDate,
              dischargeDateSet: r.dischargeDateSet,
              reportName: r.reportType,
              status: r.status,
            });
          });
          (subRep.noArrivalRecords || []).forEach((r) => {
            records.push({
              user: subRep.user || subRep.username,
              trackingCode: r.trackingCode,
              creationDate: r.creationDate,
              dischargeDateSet: '-',
              reportName: r.reportType,
              status: r.status,
            });
          });
        });
      } else {
        records = [
          ...(rep.dischargedRecords || []).map((r) => ({
            user: rep.user || rep.username,
            trackingCode: r.trackingCode,
            creationDate: r.creationDate,
            dischargeDateSet: r.dischargeDateSet,
            reportName: r.reportType,
            status: r.status,
          })),
          ...(rep.noArrivalRecords || []).map((r) => ({
            user: rep.user || rep.username,
            trackingCode: r.trackingCode,
            creationDate: r.creationDate,
            dischargeDateSet: '-',
            reportName: r.reportType,
            status: r.status,
          })),
        ];
      }

      renderDischargeTable(records);
    } catch (e) {
      console.error('Error rendering report:', e);
    }
  });

  submitCaptchaBtn.addEventListener('click', submitCaptcha);
  captchaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      submitCaptcha();
    }
  });

  clearLogsBtn.addEventListener('click', () => {
    terminalWindow.innerHTML = '';
  });

  // Edit Codes Modal
  editCodesBtn.addEventListener('click', () => {
    codesTextarea.value = trackingCodes.join('\n');
    editCodesModal.classList.add('active');
  });

  cancelCodesBtn.addEventListener('click', () => {
    editCodesModal.classList.remove('active');
  });

  saveCodesBtn.addEventListener('click', async () => {
    const lines = codesTextarea.value
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    try {
      const res = await fetch('/api/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: lines }),
      });
      const data = await res.json();
      if (data.success) {
        trackingCodes = lines;
        editCodesModal.classList.remove('active');
        codeStatusMap = {};
        renderCodesList();
      } else {
        alert('خطا در ذخیره کدها: ' + data.error);
      }
    } catch (e) {
      alert('خطا در ذخیره: ' + e.message);
    }
  });
}

// Start
window.addEventListener('DOMContentLoaded', init);
