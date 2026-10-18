// ==========================================================
// IVO AUTOMATION - DEVICE FINGERPRINT & ROUTE-BASED ENGINE
// ==========================================================

let cachedDeviceFingerprint = null;

// Fallback deterministic hardware fingerprint generator
function generateHardwareFallback() {
  const components = [
    navigator.userAgent,
    navigator.language,
    (window.screen ? window.screen.width + 'x' + window.screen.height + 'x' + window.screen.colorDepth : 'screen'),
    navigator.hardwareConcurrency || 4,
    navigator.deviceMemory || 8,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    (() => {
      try {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('IVO-SECURITY-2026', 2, 15);
        return c.toDataURL();
      } catch (e) {
        return 'no-canvas';
      }
    })()
  ].join('###');

  let hash = 0x811c9dc5;
  for (let i = 0; i < components.length; i++) {
    hash ^= components.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return 'fp_' + (hash >>> 0).toString(16);
}

async function getDeviceFingerprint() {
  if (cachedDeviceFingerprint) return cachedDeviceFingerprint;
  try {
    if (window.FingerprintJS && typeof window.FingerprintJS.load === 'function') {
      const fp = await window.FingerprintJS.load();
      const result = await fp.get();
      if (result && result.visitorId) {
        cachedDeviceFingerprint = result.visitorId;
        return cachedDeviceFingerprint;
      }
    }
  } catch (err) {
    console.warn('FingerprintJS load error, using fallback:', err);
  }
  cachedDeviceFingerprint = generateHardwareFallback();
  return cachedDeviceFingerprint;
}

// Global Fetch Interceptor to include Auth Token and Device Fingerprint
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  const urlStr = typeof url === 'string' ? url : (url.url || '');
  if (urlStr.startsWith('/api')) {
    options = options || {};
    options.headers = options.headers || {};
    const token = localStorage.getItem('ivo_auth_token');
    const fp = await getDeviceFingerprint();

    if (options.headers instanceof Headers) {
      if (token) options.headers.set('Authorization', 'Bearer ' + token);
      if (fp) options.headers.set('x-device-fingerprint', fp);
    } else {
      if (token) options.headers['Authorization'] = 'Bearer ' + token;
      if (fp) options.headers['x-device-fingerprint'] = fp;
    }
  }

  const response = await originalFetch(url, options);

  // If unauthorized on protected endpoint
  if ((response.status === 401 || response.status === 403) && urlStr.startsWith('/api') && !urlStr.includes('/api/auth/login')) {
    try {
      const clone = response.clone();
      const errData = await clone.json();
      if (errData.requiresLogin || errData.deviceMismatch) {
        handleAuthRejection(errData.error || 'نشست شما معتبر نیست. لطفاً مجدداً وارد شوید.');
      }
    } catch (e) { }
  }

  return response;
};

function handleAuthRejection(message) {
  localStorage.removeItem('ivo_auth_token');
  localStorage.removeItem('ivo_logged_in_user');
  updateAuthUI();
  router.navigate('/login');
  showToast(message, 'error');
}


// ==========================================================
// Global Tab and View Switching Functions
// ==========================================================
function activateMenu(targetId) {
  const tabPermitBtn = document.getElementById('tabPermitBtn');
  const tabDischargeBtn = document.getElementById('tabDischargeBtn');
  const subtabUsersBtn = document.getElementById('subtabUsersBtn');
  const subtabShBtn = document.getElementById('subtabShBtn');
  const subtabCodesBtn = document.getElementById('subtabCodesBtn');

  const permitPane = document.getElementById('permitPane');
  const dischargePane = document.getElementById('dischargePane');
  const adminPane = document.getElementById('adminPane');

  [tabPermitBtn, tabDischargeBtn, subtabUsersBtn, subtabShBtn, subtabCodesBtn].forEach((btn) => {
    if (btn) btn.classList.toggle('active', btn.id === targetId);
  });

  if (targetId === 'tabPermitBtn') {
    if (permitPane) {
      permitPane.classList.add('active');
      permitPane.style.display = 'block';
    }
    if (dischargePane) {
      dischargePane.classList.remove('active');
      dischargePane.style.display = 'none';
    }
    if (adminPane) {
      adminPane.classList.remove('active');
      adminPane.style.display = 'none';
    }
    if (typeof currentWorkflow !== 'undefined') currentWorkflow = 'permit';
  } else if (targetId === 'tabDischargeBtn') {
    if (dischargePane) {
      dischargePane.classList.add('active');
      dischargePane.style.display = 'block';
    }
    if (permitPane) {
      permitPane.classList.remove('active');
      permitPane.style.display = 'none';
    }
    if (adminPane) {
      adminPane.classList.remove('active');
      adminPane.style.display = 'none';
    }
    if (typeof currentWorkflow !== 'undefined') currentWorkflow = 'discharge';
  } else {
    // Admin Pane
    if (adminPane) {
      adminPane.classList.add('active');
      adminPane.style.display = 'block';
    }
    if (permitPane) {
      permitPane.classList.remove('active');
      permitPane.style.display = 'none';
    }
    if (dischargePane) {
      dischargePane.classList.remove('active');
      dischargePane.style.display = 'none';
    }
    if (typeof currentWorkflow !== 'undefined') currentWorkflow = 'admin';
  }
}

function showAdminSection(sec) {
  const targetMap = {
    users: 'subtabUsersBtn',
    sh: 'subtabShBtn',
    codes: 'subtabCodesBtn'
  };
  activateMenu(targetMap[sec] || 'subtabUsersBtn');

  const adminUsersSection = document.getElementById('adminUsersSection');
  const adminShSection = document.getElementById('adminShSection');
  const adminCodesSection = document.getElementById('adminCodesSection');
  const adminActiveTitle = document.getElementById('adminActiveTitle');
  const adminActiveDesc = document.getElementById('adminActiveDesc');

  if (adminUsersSection) {
    adminUsersSection.classList.toggle('active', sec === 'users');
    adminUsersSection.style.display = sec === 'users' ? 'block' : 'none';
  }
  if (adminShSection) {
    adminShSection.classList.toggle('active', sec === 'sh');
    adminShSection.style.display = sec === 'sh' ? 'block' : 'none';
  }
  if (adminCodesSection) {
    adminCodesSection.classList.toggle('active', sec === 'codes');
    adminCodesSection.style.display = sec === 'codes' ? 'block' : 'none';
  }

  if (adminActiveTitle && adminActiveDesc) {
    if (sec === 'users') {
      adminActiveTitle.textContent = '👥 مدیریت مرغداران و کاربران سامانه';
      adminActiveDesc.textContent = 'مشاهده، جستجو، ثبت و ویرایش مشخصات مرغداران، کلمه عبور و کدهای سامانه';
    } else if (sec === 'sh') {
      adminActiveTitle.textContent = '🏭 مدیریت کشتارگاه‌های مقصد';
      adminActiveDesc.textContent = 'مدیریت و ثبت کشتارگاه‌های مقصد و شناسه‌های ۱۲ رقمی یکتای جهاد کشاورزی';
    } else if (sec === 'codes') {
      adminActiveTitle.textContent = '🚚 مدیریت کدهای رهگیری خودرو';
      adminActiveDesc.textContent = 'مشاهده، افزودن سریع، حذف و ویرایش دسته‌ای کدهای فعال در صدور خودکار';
    }
  }

  const userSearchInput = document.getElementById('userSearchInput');
  const shSearchInput = document.getElementById('shSearchInput');
  const codeSearchInput = document.getElementById('codeSearchInput');

  if (sec === 'users') {
    if (typeof loadUsers === 'function') loadUsers().catch(() => {});
    if (typeof renderAdminUsers === 'function') renderAdminUsers(userSearchInput ? userSearchInput.value.trim() : '');
  }
  if (sec === 'sh' && typeof renderAdminSlaughterhouses === 'function') renderAdminSlaughterhouses(shSearchInput ? shSearchInput.value.trim() : '');
  if (sec === 'codes' && typeof renderAdminCodes === 'function') renderAdminCodes(codeSearchInput ? codeSearchInput.value.trim() : '');
}

// Router Implementation
const router = {
  currentRoute: '/',
  isNavigating: false,

  navigate(path, replace = false) {
    if (replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }
    this.handleRoute(path);
  },

  handleRoute(path) {
    let cleanPath = (path || '/').split('?')[0];
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }

    const token = localStorage.getItem('ivo_auth_token');
    const userStr = localStorage.getItem('ivo_logged_in_user');
    const isAuthenticated = Boolean(token && userStr);

    const loginScreen = document.getElementById('loginScreen');
    const mainAppWrapper = document.getElementById('mainAppWrapper');

    // Requirement 1: Login-based access only
    if (!isAuthenticated) {
      if (mainAppWrapper) mainAppWrapper.style.display = 'none';
      if (loginScreen) loginScreen.style.display = 'flex';

      if (cleanPath !== '/login') {
        const redirectParam = encodeURIComponent(path);
        window.history.replaceState(null, '', '/login?redirect=' + redirectParam);
      }
      return;
    }

    // Authenticated user
    if (loginScreen) loginScreen.style.display = 'none';
    if (mainAppWrapper) mainAppWrapper.style.display = 'block';
    updateAuthUI();

    // If requesting /login or /, redirect to intended route or /permits
    if (cleanPath === '/login' || cleanPath === '/') {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      const target = (redirect && redirect !== '/login') ? redirect : '/permits';
      this.navigate(target, true);
      return;
    }

    // Ensure data is loaded
    if (typeof loadInitialAppData === 'function') {
      loadInitialAppData();
    }

    // Requirement 2: Route-based section activation
    if (cleanPath === '/permits') {
      activateMenu('tabPermitBtn');
    } else if (cleanPath === '/discharge') {
      activateMenu('tabDischargeBtn');
    } else if (cleanPath === '/admin' || cleanPath === '/admin/users') {
      showAdminSection('users');
    } else if (cleanPath === '/admin/slaughterhouses') {
      showAdminSection('sh');
    } else if (cleanPath === '/admin/codes') {
      showAdminSection('codes');
    } else {
      this.navigate('/permits', true);
    }

    this.currentRoute = cleanPath;
  }
};

window.addEventListener('popstate', () => {
  router.handleRoute(window.location.pathname);
});

function updateAuthUI() {
  const userProfileBadge = document.getElementById('userProfileBadge');
  const loggedInFarmerName = document.getElementById('loggedInFarmerName');
  const loggedInRoleBadge = document.getElementById('loggedInRoleBadge');
  const savedUserStr = localStorage.getItem('ivo_logged_in_user');

  if (savedUserStr) {
    try {
      const user = JSON.parse(savedUserStr);
      if (userProfileBadge) userProfileBadge.style.display = 'flex';
      if (loggedInFarmerName) loggedInFarmerName.textContent = user.name || user.username || user.email;
      if (loggedInRoleBadge) {
        if (user.role === 'admin') {
          loggedInRoleBadge.textContent = 'مدیر سیستم';
          loggedInRoleBadge.className = 'role-badge admin';
        } else {
          loggedInRoleBadge.textContent = 'کاربر';
          loggedInRoleBadge.className = 'role-badge';
        }
      }
      // Auto-select user in permit workflow dropdown (only for farmers, not admin)
      if (user.username && user.role !== 'admin' && user.username.toLowerCase() !== 'admin' && typeof userSelect !== 'undefined' && userSelect) {
        userSelect.value = user.username;
        if (typeof usersList !== 'undefined') {
          const u = usersList.find(x => x.username === user.username);
          if (u && typeof updateUserPreview === 'function') updateUserPreview(u);
        }
      }
    } catch (e) {
      localStorage.removeItem('ivo_logged_in_user');
    }
  } else {
    if (userProfileBadge) userProfileBadge.style.display = 'none';
  }
}

// DOM Elements - Navigation Rail
const tabPermitBtn = document.getElementById('tabPermitBtn');
const tabDischargeBtn = document.getElementById('tabDischargeBtn');
const subtabUsersBtn = document.getElementById('subtabUsersBtn');
const subtabShBtn = document.getElementById('subtabShBtn');
const subtabCodesBtn = document.getElementById('subtabCodesBtn');
const permitPane = document.getElementById('permitPane');
const dischargePane = document.getElementById('dischargePane');
const adminPane = document.getElementById('adminPane');

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
const permitScopeSelect = document.getElementById('permitScopeSelect');
const showBrowserCheck = document.getElementById('showBrowserCheck');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const candidateCodesInput = document.getElementById('candidateCodesInput');
const checkPaymentLinksStandaloneBtn = document.getElementById('checkPaymentLinksStandaloneBtn');

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
const skipCaptchaBtn = document.getElementById('skipCaptchaBtn');
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
let sessionPermitsList = []; // array of permits issued in session
let currentDischargeExportData = null; // currently active discharge data
let lastSuccessfulCodeData = null; // last successful code data
let permitsQueue = []; // array of queued permits for batch execution
let paymentLinksList = []; // array of scraped payment links

// App data loading guard
let isInitialDataLoaded = false;
async function loadInitialAppData(force = false) {
  if (isInitialDataLoaded && !force) return;
  isInitialDataLoaded = true;
  await loadUsers();
  await loadSlaughterhouses();
  await loadCodes();
  await loadPastReports();
  await loadSessionPermits();
  await loadPaymentLinks();
  renderPermitsQueue();
  setupEventSource();
}

// Initialize Application
async function applyPlaywrightUiConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (!data.success || !data.playwright?.headlessOnly) return;

    if (showBrowserCheck) {
      showBrowserCheck.checked = false;
      showBrowserCheck.disabled = true;
    }
    if (dischargeHeadlessCheck) {
      dischargeHeadlessCheck.checked = false;
      dischargeHeadlessCheck.disabled = true;
    }
  } catch (err) {
    console.warn('Could not load runtime config:', err);
  }
}

async function init() {
  await applyPlaywrightUiConfig();

  // 1. Calculate device fingerprint and update UI badge
  const fp = await getDeviceFingerprint();
  const badge = document.getElementById('loginFpBadge');
  if (badge) {
    badge.textContent = fp.slice(0, 14) + '...';
    badge.title = 'شناسه اثر انگشت: ' + fp;
  }

  // 2. Setup listeners for navigation rail, login form, and admin tools
  setupListeners();

  // 3. Verify session if token exists
  const token = localStorage.getItem('ivo_auth_token');
  const user = localStorage.getItem('ivo_logged_in_user');

  if (token && user) {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        localStorage.setItem('ivo_logged_in_user', JSON.stringify(data.user));
        await loadInitialAppData(true);
        router.handleRoute(window.location.pathname);
        return;
      }
    } catch (err) {
      console.warn('Session verification failed:', err);
    }
    // Expired or invalid session
    localStorage.removeItem('ivo_auth_token');
    localStorage.removeItem('ivo_logged_in_user');
  }

  // Route to /login if unauthenticated
  router.handleRoute(window.location.pathname);
}

// Load Users
async function loadUsers() {
  try {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (data.success && data.users) {
      usersList = data.users;

      // Filter out admin (مدیر کل سامانه دامپزشکی) from farmer select lists
      const farmerUsers = usersList.filter((u) => {
        const uname = (u.username || '').toLowerCase();
        const role = (u.role || '').toLowerCase();
        return uname !== 'admin' && role !== 'admin';
      });

      const prevSelected = userSelect.value;
      // Populate permit user select
      userSelect.innerHTML = '<option value="" disabled selected>-- یک دامدار را انتخاب کنید --</option>';
      // Populate discharge user select with 'ALL' as first and default
      dischargeUserSelect.innerHTML = '<option value="ALL" selected>⚡ همه کاربران (بررسی دسته‌ای تمام مرغداران)</option>';

      farmerUsers.forEach((user) => {
        const opt1 = document.createElement('option');
        opt1.value = user.username;
        opt1.textContent = `${user.name} (${user.username})`;
        userSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = user.username;
        opt2.textContent = `${user.name} (${user.username})`;
        dischargeUserSelect.appendChild(opt2);
      });

      // Restore selection or default to first farmer
      if (prevSelected && prevSelected.toLowerCase() !== 'admin' && farmerUsers.some((u) => u.username === prevSelected)) {
        userSelect.value = prevSelected;
        updateUserPreview(farmerUsers.find((u) => u.username === prevSelected));
      } else if (farmerUsers.length > 0) {
        userSelect.selectedIndex = 1;
        updateUserPreview(farmerUsers[0]);
      } else {
        userSelect.value = '';
        updateUserPreview(null);
      }
      dischargeUserSelect.value = 'ALL';
      renderAdminUsers();
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
      const prevSelectedSh = slaughterSelect.value;

      slaughterSelect.innerHTML = '<option value="" disabled>-- کشتارگاه مقصد را انتخاب کنید --</option>';
      slaughterhousesList.forEach((sh, idx) => {
        const opt = document.createElement('option');
        opt.value = sh.code;
        opt.dataset.name = sh.name;
        opt.textContent = `${sh.name} (شناسه جهاد: ${sh.code})`;
        if (!prevSelectedSh && (sh.name.includes('ساینا') || idx === 0)) {
          opt.selected = true;
        }
        slaughterSelect.appendChild(opt);
      });

      if (prevSelectedSh && slaughterhousesList.some((s) => s.code === prevSelectedSh)) {
        slaughterSelect.value = prevSelectedSh;
      }
      renderAdminSlaughterhouses();
    }
  } catch (e) {
    console.error('Error fetching slaughterhouses:', e);
  }
}

// Load Last Successful Code
async function loadLastSuccessfulCode() {
  try {
    const res = await fetch('/api/last-successful-code');
    const data = await res.json();
    if (data.success && data.data) {
      lastSuccessfulCodeData = data.data;
    }
  } catch (e) {
    console.warn('No last successful code recorded yet.');
  }
}

// Load Tracking Codes
async function loadCodes() {
  try {
    await loadLastSuccessfulCode();
    const res = await fetch('/api/codes');
    const data = await res.json();
    if (data.success && data.codes) {
      trackingCodes = data.codes;
      renderCodesList();
      renderAdminCodes();
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

  evtSource.addEventListener('permit_issued', (e) => {
    try {
      const record = JSON.parse(e.data);
      sessionPermitsList.unshift(record);
      renderSessionPermitsTable();
      showToast(`پروانه جدید برای ${record.farmerName} ثبت شد.`, 'success');
    } catch (err) {
      console.error(err);
    }
  });

  evtSource.addEventListener('permit_cooldown_tick', (e) => {
    try {
      const data = JSON.parse(e.data);
      handleCooldownTick(data);
    } catch (err) {
      console.error(err);
    }
  });

  evtSource.addEventListener('payment_links_ready', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (Array.isArray(data.paymentLinks)) {
        paymentLinksList = data.paymentLinks;
        renderPaymentLinksTable();
        showToast(`تعداد ${paymentLinksList.length} لینک پرداخت دریافت شد 💳`, 'success');
      }
    } catch (err) {
      console.error(err);
    }
  });

  evtSource.addEventListener('closure_confirmation_required', (e) => {
    try {
      const data = JSON.parse(e.data);
      openClosureModal(data.validCode);
    } catch (err) {
      console.error(err);
    }
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
  } else if (status === 'cooldown') {
    closeCaptchaModal();
    systemDot.className = 'status-dot busy';
    systemStatusText.textContent = `در حال انتظار ۲ دقیقه‌ای بین ثبت مجوزها (${data.remainingSeconds || 0} ثانیه)...`;
  } else if (status === 'filling_details') {
    closeCaptchaModal();
    const cooldownBanner = document.getElementById('cooldownBanner');
    if (cooldownBanner) cooldownBanner.style.display = 'none';
    updateStepper(4);
    systemDot.className = 'status-dot busy';
    const pInfo = data.permitIndex ? ` (${data.permitIndex} از ${data.totalPermits})` : '';
    systemStatusText.textContent = `در حال تکمیل مشخصات نژاد، کالا و فراخوانی کشتارگاه مقصد${pInfo}...`;
  } else if (status === 'fetching_payment_links') {
    closeCaptchaModal();
    const cooldownBanner = document.getElementById('cooldownBanner');
    if (cooldownBanner) cooldownBanner.style.display = 'none';
    systemDot.className = 'status-dot busy';
    systemStatusText.textContent = 'در حال استخراج لینک‌های پرداخت از گزارش آمار...';
  } else if (status === 'navigating_closure') {
    closeCaptchaModal();
    const cooldownBanner = document.getElementById('cooldownBanner');
    if (cooldownBanner) cooldownBanner.style.display = 'none';
    systemDot.className = 'status-dot busy';
    systemStatusText.textContent = 'در حال انتقال به صفحه اعلام خاتمه بارگیری...';
  } else if (status === 'waiting_closure_confirmation') {
    closeCaptchaModal();
    const cooldownBanner = document.getElementById('cooldownBanner');
    if (cooldownBanner) cooldownBanner.style.display = 'none';
    systemDot.className = 'status-dot busy';
    systemStatusText.textContent = 'در انتظار تأیید اعلام خاتمه صدور گواهی و بارگیری...';
    openClosureModal(data.validCode);
  } else if (status === 'discharging') {
    closeCaptchaModal();
    systemDot.className = 'status-dot busy';
    systemStatusText.textContent = `در حال ثبت تایید تخلیه (${data.total || ''} مورد)...`;
  } else if (status === 'success') {
    closeCaptchaModal();
    closeClosureModal();
    const cooldownBanner = document.getElementById('cooldownBanner');
    if (cooldownBanner) cooldownBanner.style.display = 'none';
    if (service === 'permit') updateStepper(5);
    updateUIState(false, service);
    systemDot.className = 'status-dot active';
    systemStatusText.textContent = 'عملیات با موفقیت کامل انجام شد ✓';
    loadPastReports(); // refresh reports list
    if (Array.isArray(data.paymentLinks)) {
      paymentLinksList = data.paymentLinks;
      renderPaymentLinksTable();
    }
    alert(`🎉 ${data.message || 'عملیات با موفقیت کامل انجام شد!'}`);
  } else if (status === 'failed') {
    closeCaptchaModal();
    closeClosureModal();
    const cooldownBanner = document.getElementById('cooldownBanner');
    if (cooldownBanner) cooldownBanner.style.display = 'none';
    updateUIState(false, service);
    systemDot.className = 'status-dot';
    systemStatusText.textContent = 'متوقف شده / خطا';
  } else if (status === 'idle') {
    closeCaptchaModal();
    closeClosureModal();
    const cooldownBanner = document.getElementById('cooldownBanner');
    if (cooldownBanner) cooldownBanner.style.display = 'none';
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
    if (permitScopeSelect) permitScopeSelect.disabled = running;
    breedSelect.disabled = running;
    hatchInput.disabled = running;
    if (candidateCodesInput) candidateCodesInput.disabled = running;
    if (checkPaymentLinksStandaloneBtn) checkPaymentLinksStandaloneBtn.disabled = running;
    const addQueueBtn = document.getElementById('addPermitToQueueBtn');
    const clearQBtn = document.getElementById('clearQueueBtn');
    if (addQueueBtn) addQueueBtn.disabled = running;
    if (clearQBtn) clearQBtn.disabled = running;
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

async function skipCaptcha() {
  if (skipCaptchaBtn) {
    skipCaptchaBtn.disabled = true;
    skipCaptchaBtn.textContent = 'در حال رد کردن...';
  }

  try {
    const res = await fetch('/api/skip-captcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (data.success) {
      closeCaptchaModal();
      showToast('کپچا با موفقیت رد شد.', 'info');
    } else {
      captchaErrorText.textContent = data.error || 'خطا در رد کردن کپچا';
      captchaErrorText.style.display = 'block';
    }
  } catch (err) {
    captchaErrorText.textContent = 'خطا در ارتباط با سرور: ' + err.message;
    captchaErrorText.style.display = 'block';
  } finally {
    if (skipCaptchaBtn) {
      skipCaptchaBtn.disabled = false;
      skipCaptchaBtn.textContent = 'رد کردن (اسکیپ) ⏭️';
    }
  }
}

// Setup Event Listeners
function setupListeners() {


  // Navigation Rail Items Switching (Route-Based)
  tabPermitBtn.addEventListener('click', () => {
    router.navigate('/permits');
  });

  tabDischargeBtn.addEventListener('click', () => {
    router.navigate('/discharge');
  });

  // User Selection change
  userSelect.addEventListener('change', () => {
    const user = usersList.find((u) => u.username === userSelect.value);
    updateUserPreview(user);
  });

  // Permit Queue Listeners
  const addPermitToQueueBtn = document.getElementById('addPermitToQueueBtn');
  if (addPermitToQueueBtn) {
    addPermitToQueueBtn.addEventListener('click', () => {
      const selectedSlaughterCode = slaughterSelect.value;
      const selectedSlaughterName = slaughterSelect.options[slaughterSelect.selectedIndex]?.dataset.name || slaughterSelect.options[slaughterSelect.selectedIndex]?.text || '';
      if (!selectedSlaughterCode) {
        alert('لطفاً ابتدا کشتارگاه مقصد را از کادر بالا انتخاب کنید.');
        return;
      }
      const quantity = quantityInput.value.trim() || '2000';
      const breed = breedSelect.value || 'راس';
      const permitScope = permitScopeSelect ? permitScopeSelect.value : 'inside';
      const scopeLabel = permitScope === 'outside' ? 'خارج استانی' : 'داخل استانی';

      permitsQueue.push({
        slaughterhouseCode: selectedSlaughterCode,
        slaughterhouseName: selectedSlaughterName,
        quantity: quantity,
        breed: breed,
        permitScope: permitScope,
      });

      renderPermitsQueue();
      showToast(`کشتارگاه ${selectedSlaughterName} (${quantity} قطعه - ${scopeLabel}) به لیست افزوده شد.`, 'info');
    });
  }

  const clearQueueBtn = document.getElementById('clearQueueBtn');
  if (clearQueueBtn) {
    clearQueueBtn.addEventListener('click', () => {
      permitsQueue = [];
      renderPermitsQueue();
      showToast('لیست مجوزها پاک شد.', 'info');
    });
  }

  // Cooldown Skip Button
  const skipCooldownBtn = document.getElementById('skipCooldownBtn');
  if (skipCooldownBtn) {
    skipCooldownBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/permits/skip-cooldown', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('تایمر با موفقیت رد شد.', 'success');
        } else {
          showToast(data.error || 'خطا در رد کردن تایمر', 'warning');
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Closure Confirmation Modal Buttons
  const confirmClosureBtn = document.getElementById('confirmClosureBtn');
  if (confirmClosureBtn) {
    confirmClosureBtn.addEventListener('click', () => {
      respondClosureConfirmation(true);
    });
  }

  const cancelClosureBtn = document.getElementById('cancelClosureBtn');
  if (cancelClosureBtn) {
    cancelClosureBtn.addEventListener('click', () => {
      respondClosureConfirmation(false);
    });
  }

  // Payment Links Actions
  const copyAllPaymentLinksBtn = document.getElementById('copyAllPaymentLinksBtn');
  if (copyAllPaymentLinksBtn) {
    copyAllPaymentLinksBtn.addEventListener('click', () => {
      copyAllPaymentLinks();
    });
  }

  const clearPaymentLinksBtn = document.getElementById('clearPaymentLinksBtn');
  if (clearPaymentLinksBtn) {
    clearPaymentLinksBtn.addEventListener('click', async () => {
      if (!confirm('آیا از پاک‌سازی لیست لینک‌های پرداخت اطمینان دارید؟')) return;
      try {
        const res = await fetch('/api/permits/payment-links', { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          paymentLinksList = [];
          renderPaymentLinksTable();
          showToast('لیست لینک‌های پرداخت پاک شد.', 'info');
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Standalone Check Payment Links Button (Without issuing new permits)
  if (checkPaymentLinksStandaloneBtn) {
    checkPaymentLinksStandaloneBtn.addEventListener('click', async () => {
      const selectedUsername = userSelect.value;
      if (!selectedUsername) {
        alert('لطفاً ابتدا مرغدار مورد نظر را از کادر بالا انتخاب فرمایید.');
        return;
      }

      const headless = !showBrowserCheck.checked;

      try {
        checkPaymentLinksStandaloneBtn.disabled = true;
        showToast('در حال استعلام مستقیم لینک‌های پرداخت امروز از سامانه دامپزشکی...', 'info');

        const res = await fetch('/api/permits/check-payment-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: selectedUsername,
            headless: headless,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          alert('خطا در استعلام لینک‌های پرداخت: ' + data.error);
          checkPaymentLinksStandaloneBtn.disabled = false;
        }
      } catch (err) {
        alert('خطا در ارتباط با سرور: ' + err.message);
        checkPaymentLinksStandaloneBtn.disabled = false;
      }
    });
  }

  // Permit Start Button (Single or Multi-Permit Queue)
  startBtn.addEventListener('click', async () => {
    const selectedUsername = userSelect.value;
    if (!selectedUsername) {
      alert('لطفاً یک دامدار را انتخاب کنید.');
      return;
    }

    let permitsToSend = [];
    if (permitsQueue.length > 0) {
      permitsToSend = [...permitsQueue];
    } else {
      const selectedSlaughterCode = slaughterSelect.value;
      const selectedSlaughterName = slaughterSelect.options[slaughterSelect.selectedIndex]?.dataset.name || slaughterSelect.options[slaughterSelect.selectedIndex]?.text || '';
      if (!selectedSlaughterCode) {
        alert('لطفاً کشتارگاه مقصد را انتخاب کنید یا از لیست مجوزها استفاده نمایید.');
        return;
      }
      const quantity = quantityInput.value.trim() || '2000';
      const breed = breedSelect.value || 'راس';
      const permitScope = permitScopeSelect ? permitScopeSelect.value : 'inside';
      permitsToSend = [{
        slaughterhouseCode: selectedSlaughterCode,
        slaughterhouseName: selectedSlaughterName,
        quantity: quantity,
        breed: breed,
        permitScope: permitScope,
      }];
    }

    const breed = breedSelect.value;
    const hatchingPermitCode = hatchInput.value.trim();

    // Parse Candidate Tracking Codes (Priority Codes)
    const candidateCodesRaw = candidateCodesInput ? candidateCodesInput.value.trim() : '';
    const candidateCodes = candidateCodesRaw
      ? candidateCodesRaw.split(/[\s,،]+/).map((c) => c.trim()).filter(Boolean)
      : [];

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
          permits: permitsToSend,
          permitScope: permitScopeSelect ? permitScopeSelect.value : 'inside',
          candidateCodes: candidateCodes,
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
      currentDischargeExportData = rep.isSummary ? rep.summaryList : rep;
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
  if (skipCaptchaBtn) {
    skipCaptchaBtn.addEventListener('click', skipCaptcha);
  }
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
        renderAdminCodes();
        showToast('کدهای رهگیری با موفقیت به‌روزرسانی شدند.', 'success');
      } else {
        alert('خطا در ذخیره کدها: ' + data.error);
      }
    } catch (e) {
      alert('خطا در ذخیره: ' + e.message);
    }
  });

  // ==========================================================
  // Admin Panel Setup & Event Handlers
  // ==========================================================

  // Admin Subtabs Switching in Navigation Rail


  if (subtabUsersBtn) subtabUsersBtn.addEventListener('click', () => {
    router.navigate('/admin/users');
    checkDatabaseStatus();
  });
  if (subtabShBtn) subtabShBtn.addEventListener('click', () => {
    router.navigate('/admin/slaughterhouses');
    checkDatabaseStatus();
  });
  if (subtabCodesBtn) subtabCodesBtn.addEventListener('click', () => {
    router.navigate('/admin/codes');
    checkDatabaseStatus();
  });

  // Database / Supabase Status Handler
  async function checkDatabaseStatus() {
    const dot = document.getElementById('dbStatusDot');
    const text = document.getElementById('dbStatusText');
    const syncBtn = document.getElementById('syncSupabaseBtn');
    if (!dot || !text) return;

    try {
      const res = await fetch('/api/database/status');
      const data = await res.json();
      if (data.success) {
        if (data.tableReady) {
          dot.style.background = '#22c55e';
          dot.style.boxShadow = '0 0 6px #22c55e';
          text.textContent = 'متصل به Supabase (آنلاین)';
          text.title = data.message;
          if (syncBtn) syncBtn.style.display = 'inline-block';
        } else if (data.connected) {
          dot.style.background = '#eab308';
          dot.style.boxShadow = '0 0 6px #eab308';
          text.textContent = 'سوپابیس متصل (منتظر ساخت جدول users)';
          text.title = data.message;
          if (syncBtn) syncBtn.style.display = 'none';
        } else {
          dot.style.background = '#64748b';
          dot.style.boxShadow = 'none';
          text.textContent = 'دیتابیس محلی (data/users.json)';
          text.title = data.message;
          if (syncBtn) syncBtn.style.display = 'none';
        }
      }
    } catch (e) {
      dot.style.background = '#64748b';
      text.textContent = 'دیتابیس محلی';
    }
  }

  const syncSupabaseBtn = document.getElementById('syncSupabaseBtn');
  if (syncSupabaseBtn) {
    syncSupabaseBtn.addEventListener('click', async () => {
      syncSupabaseBtn.disabled = true;
      syncSupabaseBtn.textContent = '⏳ در حال ارسال...';
      try {
        const res = await fetch('/api/database/sync', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || 'کاربران با موفقیت در سوپابیس ذخیره شدند.', 'success');
          await loadUsers();
        } else {
          showToast(data.error || 'خطا در همگام‌سازی', 'error');
        }
      } catch (err) {
        showToast('خطا در ارتباط با سرور: ' + err.message, 'error');
      } finally {
        syncSupabaseBtn.disabled = false;
        syncSupabaseBtn.textContent = '🔄 همگام‌سازی با Supabase';
      }
    });
  }

  // Initial check on load
  checkDatabaseStatus();

  // Admin Search Filters
  const userSearchInput = document.getElementById('userSearchInput');
  if (userSearchInput) {
    userSearchInput.addEventListener('input', (e) => {
      renderAdminUsers(e.target.value.trim());
    });
  }

  const shSearchInput = document.getElementById('shSearchInput');
  if (shSearchInput) {
    shSearchInput.addEventListener('input', (e) => {
      renderAdminSlaughterhouses(e.target.value.trim());
    });
  }

  const codeSearchInput = document.getElementById('codeSearchInput');
  if (codeSearchInput) {
    codeSearchInput.addEventListener('input', (e) => {
      renderAdminCodes(e.target.value.trim());
    });
  }

  // --- Users Modal Handlers ---
  const userModal = document.getElementById('userModal');
  const openAddUserModalBtn = document.getElementById('openAddUserModalBtn');
  const saveUserModalBtn = document.getElementById('saveUserModalBtn');
  const cancelUserModalBtn = document.getElementById('cancelUserModalBtn');
  const togglePasswordVisibilityBtn = document.getElementById('togglePasswordVisibilityBtn');

  if (openAddUserModalBtn) {
    openAddUserModalBtn.addEventListener('click', () => {
      const loggedInUserStr = localStorage.getItem('ivo_logged_in_user');
      let isAdmin = false;
      if (loggedInUserStr) {
        try {
          const u = JSON.parse(loggedInUserStr);
          isAdmin = (u.role === 'admin' || u.username === 'admin' || u.email === 'admin@ivo.ir');
        } catch (e) {}
      }
      const emailGroup = document.getElementById('userModalEmailGroup');
      if (emailGroup) emailGroup.style.display = isAdmin ? '' : 'none';

      document.getElementById('userModalTitle').textContent = 'افزودن مرغدار جدید';
      document.getElementById('userModalMode').value = 'add';
      document.getElementById('userModalOriginalUsername').value = '';
      document.getElementById('userModalName').value = '';
      document.getElementById('userModalUsername').value = '';
      document.getElementById('userModalPassword').value = '';
      document.getElementById('userModalPassword').type = 'password';
      const emailEl = document.getElementById('userModalEmail');
      if (emailEl) emailEl.value = '';
      document.getElementById('userModalBreed').value = 'راس';
      document.getElementById('userModalEpidemiologic').value = '';
      document.getElementById('userModalHatching').value = '';
      document.getElementById('userModalError').style.display = 'none';
      userModal.classList.add('active');
    });
  }

  if (cancelUserModalBtn) {
    cancelUserModalBtn.addEventListener('click', () => {
      userModal.classList.remove('active');
    });
  }

  if (togglePasswordVisibilityBtn) {
    togglePasswordVisibilityBtn.addEventListener('click', () => {
      const passInput = document.getElementById('userModalPassword');
      if (passInput.type === 'password') {
        passInput.type = 'text';
        togglePasswordVisibilityBtn.textContent = '🔒';
      } else {
        passInput.type = 'password';
        togglePasswordVisibilityBtn.textContent = '👁️';
      }
    });
  }

  if (saveUserModalBtn) {
    saveUserModalBtn.addEventListener('click', async () => {
      const mode = document.getElementById('userModalMode').value;
      const originalUsername = document.getElementById('userModalOriginalUsername').value;
      const name = document.getElementById('userModalName').value.trim();
      const username = document.getElementById('userModalUsername').value.trim();
      const password = document.getElementById('userModalPassword').value.trim();
      const emailEl = document.getElementById('userModalEmail');
      const email = emailEl ? emailEl.value.trim() : '';
      const breed = document.getElementById('userModalBreed').value;
      const epidemiologicCode = document.getElementById('userModalEpidemiologic').value.trim();
      const hatchingPermitCode = document.getElementById('userModalHatching').value.trim();
      const errorBox = document.getElementById('userModalError');

      if (!name || !username || !password) {
        errorBox.textContent = 'لطفاً نام، نام کاربری و رمز عبور را وارد کنید.';
        errorBox.style.display = 'block';
        return;
      }

      saveUserModalBtn.disabled = true;
      saveUserModalBtn.textContent = 'در حال ذخیره...';

      try {
        const url = mode === 'add' ? '/api/users' : `/api/users/${encodeURIComponent(originalUsername)}`;
        const method = mode === 'add' ? 'POST' : 'PUT';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, password, email, breed, epidemiologicCode, hatchingPermitCode }),
        });
        const data = await res.json();

        if (data.success) {
          userModal.classList.remove('active');
          await loadUsers();

          // If email was provided, also ensure registered in Supabase Auth
          if (email) {
            try {
              const authRes = await fetch('/api/auth/register-farmer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
              });
              const authData = await authRes.json();
              if (authData.success) {
                openAuthCredentialsModal({ name, username, email, password });
              }
            } catch (err) {
              console.warn('Auth auto-register notice:', err);
            }
          }

          showToast(mode === 'add' ? 'مرغدار جدید با موفقیت اضافه شد.' : 'اطلاعات مرغدار ویرایش شد.', 'success');
        } else {
          errorBox.textContent = data.error || 'خطا در ثبت اطلاعات کاربر';
          errorBox.style.display = 'block';
        }
      } catch (err) {
        errorBox.textContent = 'خطا در برقراری ارتباط با سرور: ' + err.message;
        errorBox.style.display = 'block';
      } finally {
        saveUserModalBtn.disabled = false;
        saveUserModalBtn.textContent = 'ذخیره اطلاعات';
      }
    });
  }

  // --- Slaughterhouse Modal Handlers ---
  const shModal = document.getElementById('shModal');
  const openAddShModalBtn = document.getElementById('openAddShModalBtn');
  const saveShModalBtn = document.getElementById('saveShModalBtn');
  const cancelShModalBtn = document.getElementById('cancelShModalBtn');

  if (openAddShModalBtn) {
    openAddShModalBtn.addEventListener('click', () => {
      document.getElementById('shModalTitle').textContent = 'افزودن کشتارگاه جدید';
      document.getElementById('shModalMode').value = 'add';
      document.getElementById('shModalOriginalCode').value = '';
      document.getElementById('shModalName').value = '';
      document.getElementById('shModalCode').value = '';
      document.getElementById('shModalError').style.display = 'none';
      shModal.classList.add('active');
    });
  }

  if (cancelShModalBtn) {
    cancelShModalBtn.addEventListener('click', () => {
      shModal.classList.remove('active');
    });
  }

  if (saveShModalBtn) {
    saveShModalBtn.addEventListener('click', async () => {
      const mode = document.getElementById('shModalMode').value;
      const originalCode = document.getElementById('shModalOriginalCode').value;
      const name = document.getElementById('shModalName').value.trim();
      const code = document.getElementById('shModalCode').value.trim();
      const errorBox = document.getElementById('shModalError');

      if (!name || !code) {
        errorBox.textContent = 'لطفاً نام کشتارگاه و شناسه یکتای جهاد کشاورزی را وارد کنید.';
        errorBox.style.display = 'block';
        return;
      }

      saveShModalBtn.disabled = true;
      saveShModalBtn.textContent = 'در حال ذخیره...';

      try {
        const url = mode === 'add' ? '/api/slaughterhouses' : `/api/slaughterhouses/${encodeURIComponent(originalCode)}`;
        const method = mode === 'add' ? 'POST' : 'PUT';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, code }),
        });
        const data = await res.json();

        if (data.success) {
          shModal.classList.remove('active');
          await loadSlaughterhouses();
          showToast(mode === 'add' ? 'کشتارگاه جدید با موفقیت اضافه شد.' : 'اطلاعات کشتارگاه ویرایش شد.', 'success');
        } else {
          errorBox.textContent = data.error || 'خطا در ثبت اطلاعات کشتارگاه';
          errorBox.style.display = 'block';
        }
      } catch (err) {
        errorBox.textContent = 'خطا در برقراری ارتباط با سرور: ' + err.message;
        errorBox.style.display = 'block';
      } finally {
        saveShModalBtn.disabled = false;
        saveShModalBtn.textContent = 'ذخیره اطلاعات';
      }
    });
  }

  // --- Tracking Codes Quick Add & Clear All Handlers ---
  const quickAddCodeInput = document.getElementById('quickAddCodeInput');
  const quickAddCodeBtn = document.getElementById('quickAddCodeBtn');
  const adminBulkEditCodesBtn = document.getElementById('adminBulkEditCodesBtn');
  const adminClearAllCodesBtn = document.getElementById('adminClearAllCodesBtn');

  if (quickAddCodeBtn && quickAddCodeInput) {
    const handleQuickAdd = async () => {
      const code = quickAddCodeInput.value.trim();
      if (!code) {
        showToast('لطفاً کد رهگیری را وارد کنید.', 'error');
        return;
      }

      try {
        const res = await fetch('/api/codes/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        if (data.success) {
          trackingCodes = data.codes;
          quickAddCodeInput.value = '';
          renderCodesList();
          renderAdminCodes();
          showToast(`کد رهگیری ${code} با موفقیت اضافه شد.`, 'success');
        } else {
          showToast(data.error, 'error');
        }
      } catch (err) {
        showToast('خطا در ارتباط با سرور: ' + err.message, 'error');
      }
    };

    quickAddCodeBtn.addEventListener('click', handleQuickAdd);
    quickAddCodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleQuickAdd();
      }
    });
  }

  if (adminBulkEditCodesBtn) {
    adminBulkEditCodesBtn.addEventListener('click', () => {
      codesTextarea.value = trackingCodes.join('\n');
      editCodesModal.classList.add('active');
    });
  }

  if (adminClearAllCodesBtn) {
    adminClearAllCodesBtn.addEventListener('click', () => {
      openConfirmDelete('آیا از حذف تمام کدهای رهگیری فعال اطمینان دارید؟', async () => {
        try {
          const res = await fetch('/api/codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codes: [] }),
          });
          const data = await res.json();
          if (data.success) {
            trackingCodes = [];
            renderCodesList();
            renderAdminCodes();
            showToast('تمام کدهای رهگیری با موفقیت پاک شدند.', 'success');
          }
        } catch (err) {
          showToast('خطا در پاک‌سازی کدها: ' + err.message, 'error');
        }
      });
    });
  }

  // --- Confirm Delete Modal Handlers ---
  const confirmDeleteModal = document.getElementById('confirmDeleteModal');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (typeof pendingDeleteAction === 'function') {
        await pendingDeleteAction();
        pendingDeleteAction = null;
      }
      confirmDeleteModal.classList.remove('active');
    });
  }

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      pendingDeleteAction = null;
      confirmDeleteModal.classList.remove('active');
    });
  }

  // Close modals on clicking overlay backdrop
  [userModal, shModal, confirmDeleteModal, editCodesModal, captchaModal].forEach((m) => {
    if (m) {
      m.addEventListener('click', (e) => {
        if (e.target === m) {
          m.classList.remove('active');
          if (m === confirmDeleteModal) pendingDeleteAction = null;
        }
      });
    }
  });

  // --- Export Permits Handlers ---
  const exportPermitsExcelBtn = document.getElementById('exportPermitsExcelBtn');
  const exportPermitsPdfBtn = document.getElementById('exportPermitsPdfBtn');
  const clearSessionPermitsBtn = document.getElementById('clearSessionPermitsBtn');

  if (exportPermitsExcelBtn) {
    exportPermitsExcelBtn.addEventListener('click', async () => {
      if (sessionPermitsList.length === 0) {
        showToast('هنوز مجوزی در این نشست صادر نشده است.', 'error');
        return;
      }
      exportPermitsExcelBtn.disabled = true;
      exportPermitsExcelBtn.textContent = 'در حال تولید...';
      try {
        const res = await fetch('/api/permits/export/excel', { method: 'POST' });
        if (!res.ok) throw new Error('خطا در تولید فایل اکسل');
        const blob = await res.blob();
        downloadBlob(blob, `permits_session_${Date.now()}.xlsx`);
        showToast('فایل اکسل مجوزها با موفقیت دانلود شد.', 'success');
      } catch (err) {
        showToast('خطا در دریافت اکسل: ' + err.message, 'error');
      } finally {
        exportPermitsExcelBtn.disabled = false;
        exportPermitsExcelBtn.textContent = '📥 دانلود اکسل (.xlsx)';
      }
    });
  }

  if (exportPermitsPdfBtn) {
    exportPermitsPdfBtn.addEventListener('click', async () => {
      if (sessionPermitsList.length === 0) {
        showToast('هنوز مجوزی در این نشست صادر نشده است.', 'error');
        return;
      }
      exportPermitsPdfBtn.disabled = true;
      exportPermitsPdfBtn.textContent = 'در حال تولید...';
      try {
        const res = await fetch('/api/permits/export/pdf', { method: 'POST' });
        if (!res.ok) throw new Error('خطا در تولید فایل پی‌دی‌اف');
        const blob = await res.blob();
        downloadBlob(blob, `permits_session_${Date.now()}.pdf`);
        showToast('فایل پی‌دی‌اف مجوزها با موفقیت دانلود شد.', 'success');
      } catch (err) {
        showToast('خطا در دریافت پی‌دی‌اف: ' + err.message, 'error');
      } finally {
        exportPermitsPdfBtn.disabled = false;
        exportPermitsPdfBtn.textContent = '📄 دانلود پی‌دی‌اف (.pdf)';
      }
    });
  }

  if (clearSessionPermitsBtn) {
    clearSessionPermitsBtn.addEventListener('click', () => {
      openConfirmDelete('آیا از پاک‌سازی تاریخچه مجوزهای صادر شده در این نشست اطمینان دارید؟', async () => {
        try {
          const res = await fetch('/api/permits/session', { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            sessionPermitsList = [];
            renderSessionPermitsTable();
            showToast('تاریخچه مجوزهای این نشست پاک شد.', 'success');
          }
        } catch (err) {
          showToast('خطا در پاک‌سازی: ' + err.message, 'error');
        }
      });
    });
  }

  // --- Export Discharge Handlers ---
  const exportDischargeExcelBtn = document.getElementById('exportDischargeExcelBtn');
  const exportDischargePdfBtn = document.getElementById('exportDischargePdfBtn');
  const includeNoArrivalCheck = document.getElementById('includeNoArrivalCheck');

  if (exportDischargeExcelBtn) {
    exportDischargeExcelBtn.addEventListener('click', async () => {
      exportDischargeExcelBtn.disabled = true;
      exportDischargeExcelBtn.textContent = 'در حال ساخت...';
      const includeNoArrival = includeNoArrivalCheck ? includeNoArrivalCheck.checked : true;

      try {
        const bodyPayload = {
          includeNoArrival,
          filename: pastReportsSelect ? pastReportsSelect.value : null,
          reportData: currentDischargeExportData
        };

        const res = await fetch('/api/discharge/export/excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });
        if (!res.ok) throw new Error('خطا در تولید فایل اکسل');
        const blob = await res.blob();
        downloadBlob(blob, `discharge_report_${Date.now()}.xlsx`);
        showToast('فایل اکسل استعلام و تایید تخلیه دانلود شد.', 'success');
      } catch (err) {
        showToast('خطا در دانلود اکسل: ' + err.message, 'error');
      } finally {
        exportDischargeExcelBtn.disabled = false;
        exportDischargeExcelBtn.textContent = '📥 اکسل (.xlsx)';
      }
    });
  }

  if (exportDischargePdfBtn) {
    exportDischargePdfBtn.addEventListener('click', async () => {
      exportDischargePdfBtn.disabled = true;
      exportDischargePdfBtn.textContent = 'در حال ساخت...';
      const includeNoArrival = includeNoArrivalCheck ? includeNoArrivalCheck.checked : true;

      try {
        const bodyPayload = {
          includeNoArrival,
          filename: pastReportsSelect ? pastReportsSelect.value : null,
          reportData: currentDischargeExportData
        };

        const res = await fetch('/api/discharge/export/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });
        if (!res.ok) throw new Error('خطا در تولید فایل پی‌دی‌اف');
        const blob = await res.blob();
        downloadBlob(blob, `discharge_report_${Date.now()}.pdf`);
        showToast('فایل پی‌دی‌اف استعلام و تایید تخلیه دانلود شد.', 'success');
      } catch (err) {
        showToast('خطا در دانلود پی‌دی‌اف: ' + err.message, 'error');
      } finally {
        exportDischargePdfBtn.disabled = false;
        exportDischargePdfBtn.textContent = '📄 پی‌دی‌اف (.pdf)';
      }
    });
  }

  // --- Supabase Auth Credentials Modal Handlers ---
  const copyCredBtn = document.getElementById('copyCredMessageBtn');
  const closeCredBtn = document.getElementById('closeCredModalBtn');
  const credModal = document.getElementById('authCredentialsModal');

  if (closeCredBtn && credModal) {
    closeCredBtn.addEventListener('click', () => credModal.classList.remove('active'));
  }

  if (copyCredBtn && credModal) {
    copyCredBtn.addEventListener('click', () => {
      const name = credModal.dataset.farmerName || '';
      const email = credModal.dataset.email || '';
      const password = credModal.dataset.password || '';
      const portalUrl = window.location.origin;

      const messageText = `سلام ${name} عزیز،\nمشخصات ورود شما به سامانه جامع اتوماسیون دامپزشکی:\n\n🌐 آدرس ورود به سامانه: ${portalUrl}\n📧 ایمیل ورود: ${email}\n🔑 رمز عبور ورود: ${password}\n\nجهت ورود به حساب، روی دکمه «ورود مرغدار» در بالای صفحه کلیک نمایید.`;

      navigator.clipboard.writeText(messageText);
      showToast('متن مشخصات ورود کپی شد! می‌توانید آن را برای مرغدار ارسال کنید.', 'success');
      copyCredBtn.textContent = 'کپی شد ✓';
      setTimeout(() => {
        copyCredBtn.textContent = '📋 کپی متن پیام برای ارسال به مرغدار';
      }, 2500);
    });
  }


  // ==========================================
  // Full-Screen Login & Device Locking Handlers
  // ==========================================
  const submitLoginActionBtn = document.getElementById('submitLoginActionBtn');
  const loginIdentifierInput = document.getElementById('loginIdentifierInput');
  const loginPasswordInput = document.getElementById('loginPasswordInput');
  const toggleLoginPasswordBtn = document.getElementById('toggleLoginPasswordBtn');
  const toggleLoginHelpBtn = document.getElementById('toggleLoginHelpBtn');
  const loginHelpBox = document.getElementById('loginHelpBox');
  const loginAlertBox = document.getElementById('loginAlertBox');
  const logoutBtn = document.getElementById('logoutBtn');

  if (toggleLoginPasswordBtn && loginPasswordInput) {
    toggleLoginPasswordBtn.addEventListener('click', () => {
      if (loginPasswordInput.type === 'password') {
        loginPasswordInput.type = 'text';
        toggleLoginPasswordBtn.textContent = '🔒';
      } else {
        loginPasswordInput.type = 'password';
        toggleLoginPasswordBtn.textContent = '👁️';
      }
    });
  }

  if (toggleLoginHelpBtn && loginHelpBox) {
    toggleLoginHelpBtn.addEventListener('click', () => {
      const isVisible = loginHelpBox.style.display === 'block';
      loginHelpBox.style.display = isVisible ? 'none' : 'block';
      toggleLoginHelpBtn.textContent = isVisible ? 'راهنمای حساب‌های کاربری ▾' : 'بستن راهنما ▴';
    });
  }

  async function handleLogin() {
    const identifier = loginIdentifierInput ? loginIdentifierInput.value.trim() : '';
    const password = loginPasswordInput ? loginPasswordInput.value.trim() : '';

    if (!identifier || !password) {
      if (loginAlertBox) {
        loginAlertBox.textContent = 'لطفاً نام کاربری (یا ایمیل) و رمز عبور را وارد فرمایید.';
        loginAlertBox.className = 'login-alert active';
      }
      return;
    }

    if (loginAlertBox) loginAlertBox.className = 'login-alert';
    if (submitLoginActionBtn) {
      submitLoginActionBtn.disabled = true;
      submitLoginActionBtn.innerHTML = '<span>در حال بررسی اثر انگشت و ورود...</span>';
    }

    try {
      const deviceFingerprint = await getDeviceFingerprint();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, deviceFingerprint })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('ivo_auth_token', data.token);
        localStorage.setItem('ivo_logged_in_user', JSON.stringify(data.user));

        showToast(data.message || 'با موفقیت وارد شدید.', 'success');

        isInitialDataLoaded = false;
        usersList = [];
        await loadInitialAppData(true);
        updateAuthUI();

        // Redirect to intended route or /permits
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        const target = (redirect && redirect !== '/login') ? redirect : '/permits';
        router.navigate(target, true);
      } else {
        if (loginAlertBox) {
          loginAlertBox.textContent = data.error || 'خطا در ورود به حساب';
          if (data.deviceMismatch) {
            loginAlertBox.className = 'login-alert active login-alert-mismatch';
          } else {
            loginAlertBox.className = 'login-alert active';
          }
        }
      }
    } catch (err) {
      if (loginAlertBox) {
        loginAlertBox.textContent = 'خطا در برقراری ارتباط با سرور: ' + err.message;
        loginAlertBox.className = 'login-alert active';
      }
    } finally {
      if (submitLoginActionBtn) {
        submitLoginActionBtn.disabled = false;
        submitLoginActionBtn.innerHTML = '<span>ورود به سامانه</span><span>↵</span>';
      }
    }
  }

  if (submitLoginActionBtn) {
    submitLoginActionBtn.addEventListener('click', handleLogin);
  }

  if (loginPasswordInput) {
    loginPasswordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  if (loginIdentifierInput) {
    loginIdentifierInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) { }
      localStorage.removeItem('ivo_auth_token');
      localStorage.removeItem('ivo_logged_in_user');
      isInitialDataLoaded = false;
      usersList = [];
      updateAuthUI();
      showToast('از حساب کاربری خارج شدید.', 'info');
      router.navigate('/login');
    });
  }

}

// Global Auth Credentials Modal Helper
function openAuthCredentialsModal(user) {
  const modal = document.getElementById('authCredentialsModal');
  const nameEl = document.getElementById('credFarmerName');
  const emailEl = document.getElementById('credEmail');
  const passEl = document.getElementById('credPassword');
  if (!modal) return;

  const farmerName = user.name || user.username || '';
  const farmerEmail = user.email || `${(user.username || 'farmer').toLowerCase()}@gmail.com`;
  const farmerPassword = user.password || '••••••••';

  if (nameEl) nameEl.textContent = `${farmerName} (${user.username || ''})`;
  if (emailEl) emailEl.textContent = farmerEmail;
  if (passEl) passEl.textContent = farmerPassword;

  modal.dataset.farmerName = farmerName;
  modal.dataset.email = farmerEmail;
  modal.dataset.password = farmerPassword;

  modal.classList.add('active');
}

// Global Download Helper
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

// Load and Render Session Permits
async function loadSessionPermits() {
  try {
    const res = await fetch('/api/permits/session');
    const data = await res.json();
    if (data.success && data.permits) {
      sessionPermitsList = data.permits;
      renderSessionPermitsTable();
    }
  } catch (err) {
    console.error('Error loading session permits:', err);
  }
}

function renderSessionPermitsTable() {
  const tbody = document.getElementById('sessionPermitsTableBody');
  const badge = document.getElementById('sessionPermitsBadge');
  if (!tbody) return;

  if (badge) {
    badge.textContent = `${sessionPermitsList.length} پروانه`;
  }
  const railPermitsBadge = document.getElementById('railPermitsBadge');
  if (railPermitsBadge) {
    railPermitsBadge.textContent = sessionPermitsList.length;
  }

  if (sessionPermitsList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--color-ink-dim); padding: 1.5rem;">
          در این نشست هنوز مجوزی صادر نشده است. پس از کلیک روی «شروع صدور مجوز»، پروانه‌های تایید شده در اینجا جمع‌آوری می‌شوند.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  sessionPermitsList.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-size: 0.8rem; color: var(--color-ink-dim); text-align: center;">${idx + 1}</td>
      <td style="font-weight: 600;">${item.farmerName} <small style="color: var(--color-ink-white-muted);">(${item.farmerUsername})</small></td>
      <td style="font-family: monospace; font-weight: bold; color: var(--color-primary);">${item.trackingCode}</td>
      <td>${item.slaughterhouse}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: center;">${item.breed || 'راس'}</td>
      <td style="font-size: 0.8rem; color: var(--color-ink-white-muted); text-align: center;">${item.dateFa || '-'}</td>
      <td style="text-align: center;"><span class="badge" style="background: #15803d; color: #fff;">صادر شد ✓</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Permits Queue
function renderPermitsQueue() {
  const container = document.getElementById('queueItemsList');
  const emptyState = document.getElementById('queueEmptyState');
  const badge = document.getElementById('queueSummaryBadge');
  const clearBtn = document.getElementById('clearQueueBtn');
  if (!container) return;

  if (permitsQueue.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (clearBtn) clearBtn.style.display = 'none';
    if (badge) badge.textContent = '۰ مجوز (تک‌مجوز)';
    container.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (clearBtn) clearBtn.style.display = 'inline-block';
  const totalPieces = permitsQueue.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
  if (badge) badge.textContent = `${permitsQueue.length} مجوز در صف (${totalPieces.toLocaleString('fa-IR')} قطعه)`;

  container.innerHTML = '';
  permitsQueue.forEach((item, idx) => {
    const isOutside = item.permitScope === 'outside';
    const scopeBadge = isOutside
      ? '<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; font-size: 0.68rem; padding: 0.1rem 0.4rem; border-radius: 3px;">خارج استانی</span>'
      : '<span style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid #3b82f6; font-size: 0.68rem; padding: 0.1rem 0.4rem; border-radius: 3px;">داخل استانی</span>';

    const row = document.createElement('div');
    row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: var(--color-surface-2); padding: 0.4rem 0.65rem; border-radius: 4px; border: 1px solid var(--color-hairline-dark); font-size: 0.8rem;';
    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <span style="font-weight: bold; color: var(--color-primary); font-family: monospace;">#${idx + 1}</span>
        <span style="color: var(--color-ink-white); font-weight: 500;">${item.slaughterhouseName || item.slaughterhouseCode}</span>
        ${scopeBadge}
        <span style="color: #10b981; font-family: monospace;">(${Number(item.quantity).toLocaleString('fa-IR')} قطعه)</span>
        <span style="color: var(--color-ink-dim); font-size: 0.72rem;">[نژاد: ${item.breed || 'راس'}]</span>
      </div>
      <button type="button" class="btn-remove-queue" data-index="${idx}" style="background: none; border: none; color: #ff6666; cursor: pointer; font-size: 0.95rem; padding: 0 0.3rem;" title="حذف از صف">
        ✕
      </button>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('.btn-remove-queue').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      permitsQueue.splice(idx, 1);
      renderPermitsQueue();
    });
  });
}

// Cooldown Tick Handler
function handleCooldownTick(data) {
  const banner = document.getElementById('cooldownBanner');
  const timerBadge = document.getElementById('cooldownTimerBadge');
  const detailsText = document.getElementById('cooldownDetailsText');
  if (!banner || !timerBadge) return;

  banner.style.display = 'block';
  const rem = data.remainingSeconds || 0;
  const m = String(Math.floor(rem / 60)).padStart(2, '0');
  const s = String(rem % 60).padStart(2, '0');
  timerBadge.textContent = `${m}:${s}`;

  const nextItemName = data.nextItem ? (data.nextItem.slaughterhouseName || 'کشتارگاه بعدی') : '';
  const nextItemQty = data.nextItem ? ` (${Number(data.nextItem.quantity).toLocaleString('fa-IR')} قطعه)` : '';
  if (detailsText) {
    detailsText.textContent = `زمان باقی‌مانده: ${rem} ثانیه | مجوز بعدی (${data.nextPermitIndex || 2} از ${data.totalPermits || 2}): ${nextItemName}${nextItemQty}`;
  }
}

// Closure Modal Handlers
function openClosureModal(code) {
  const modal = document.getElementById('closureModal');
  const codeEl = document.getElementById('closureModalCode');
  if (codeEl) codeEl.textContent = code || '-';
  if (modal) modal.classList.add('active');
}

function closeClosureModal() {
  const modal = document.getElementById('closureModal');
  if (modal) modal.classList.remove('active');
}

async function respondClosureConfirmation(confirm) {
  closeClosureModal();
  try {
    const res = await fetch('/api/permits/confirm-closure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(confirm ? 'تأیید اعلام خاتمه بارگیری به سامانه ارسال شد.' : 'انصراف از اعلام خاتمه ثبت شد.', 'info');
    }
  } catch (err) {
    console.error('Error submitting closure confirmation:', err);
  }
}

// Load and Render Payment Links
async function loadPaymentLinks() {
  try {
    const res = await fetch('/api/permits/payment-links');
    const data = await res.json();
    if (data.success && Array.isArray(data.paymentLinks)) {
      paymentLinksList = data.paymentLinks;
      renderPaymentLinksTable();
    }
  } catch (err) {
    console.error('Error loading payment links:', err);
  }
}

function renderPaymentLinksTable() {
  const tbody = document.getElementById('paymentLinksTableBody');
  const badge = document.getElementById('paymentLinksBadge');
  if (!tbody) return;

  if (badge) {
    badge.textContent = `${paymentLinksList.length} لینک`;
  }

  if (paymentLinksList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--color-ink-dim); padding: 1.5rem;">
          پس از ثبت گواهی‌ها، لینک‌های پرداخت معتبر امروز به صورت خودکار از بخش مشاهده آمار استخراج شده و اینجا نمایش داده می‌شوند.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  paymentLinksList.forEach((item, idx) => {
    const tr = document.createElement('tr');
    const targetUrl = item.gatewayUrl || item.paymentUrl;
    tr.innerHTML = `
      <td style="font-size: 0.8rem; color: var(--color-ink-dim); text-align: center;">${idx + 1}</td>
      <td style="font-weight: 600;">${item.slaughterhouse || '-'}</td>
      <td style="text-align: center;">${item.quantity ? Number(item.quantity).toLocaleString('fa-IR') : '-'}</td>
      <td style="font-family: monospace; color: #10b981; font-weight: bold; text-align: center;">${item.amount ? Number(item.amount).toLocaleString('fa-IR') : '-'}</td>
      <td style="font-family: monospace; text-align: center;">${item.carTrackingCode || '-'}</td>
      <td style="font-family: monospace; font-weight: bold; color: var(--color-primary); text-align: center;">${item.trackingCode || '-'}</td>
      <td style="font-size: 0.8rem; color: var(--color-ink-white-muted); text-align: center;">${item.date || '-'}</td>
      <td style="text-align: center; white-space: nowrap;">
        <div style="display: flex; gap: 0.4rem; justify-content: center; align-items: center;">
          <button type="button" class="btn btn-sm btn-copy-pay" data-url="${targetUrl}" style="background: var(--color-surface-2); border: 1px solid var(--color-hairline-dark); color: var(--color-ink-white); padding: 0.25rem 0.5rem; font-size: 0.75rem; cursor: pointer;" title="کپی لینک پرداخت">
            📋 کپی
          </button>
          <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="background: #16a34a; color: #fff; padding: 0.25rem 0.6rem; font-size: 0.75rem; text-decoration: none; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.25rem;" title="انتقال مستقیم به درگاه پرداخت">
            💳 پرداخت
          </a>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-copy-pay').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      if (url) {
        navigator.clipboard.writeText(url).then(() => {
          showToast('لینک پرداخت با موفقیت در کلیپ‌بورد کپی شد ✓', 'success');
        }).catch(() => {
          prompt('لینک پرداخت:', url);
        });
      }
    });
  });
}

function copyAllPaymentLinks() {
  if (paymentLinksList.length === 0) {
    showToast('هیچ لینک پرداختی جهت کپی وجود ندارد.', 'warning');
    return;
  }
  const textLines = paymentLinksList.map((item, idx) => {
    const url = item.gatewayUrl || item.paymentUrl;
    return `${idx + 1}. مقصد: ${item.slaughterhouse} | تعداد: ${item.quantity} | مبلغ: ${item.amount || '-'} ریال\nکد رهگیری: ${item.trackingCode} | خودرو: ${item.carTrackingCode}\nلینک پرداخت: ${url}\n`;
  }).join('\n------------------------\n\n');

  navigator.clipboard.writeText(textLines).then(() => {
    showToast(`متن تمام ${paymentLinksList.length} لینک پرداخت کپی شد. می‌توانید آن را برای دیگران ارسال کنید.`, 'success');
  }).catch(() => {
    prompt('متن تمام لینک‌ها:', textLines);
  });
}

// Global variable for confirm delete callback
let pendingDeleteAction = null;

function openConfirmDelete(message, onConfirm) {
  const modal = document.getElementById('confirmDeleteModal');
  const msgEl = document.getElementById('deleteModalMsg');
  if (modal && msgEl) {
    msgEl.textContent = message;
    pendingDeleteAction = onConfirm;
    modal.classList.add('active');
  }
}

// Toast Notification Helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none; border:none; color:var(--color-ink-dim); cursor:pointer; font-size:1.1rem; line-height:1;" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================================
// Admin Panel Renderers
// ==========================================================

// Render Admin Users Table
function renderAdminUsers(filterText = '') {
  const tbody = document.getElementById('adminUsersTableBody');
  const countBadge = document.getElementById('adminUsersCountBadge');
  if (!tbody) return;

  if (countBadge) {
    countBadge.textContent = usersList.length;
  }

  // بررسی نقش کاربر فعلی: آیا مدیر سیستم است؟
  const loggedInUserStr = localStorage.getItem('ivo_logged_in_user');
  let isAdmin = false;
  if (loggedInUserStr) {
    try {
      const u = JSON.parse(loggedInUserStr);
      isAdmin = (u.role === 'admin' || u.username === 'admin' || u.email === 'admin@ivo.ir');
    } catch (e) {}
  }

  // کنترل نمایش ستون‌های اختصاصی مدیر (اکانت ورود، قفل مرورگر، ثبت‌کننده)
  document.querySelectorAll('.admin-only-col').forEach((th) => {
    th.style.display = isAdmin ? '' : 'none';
  });

  const emailGroup = document.getElementById('userModalEmailGroup');
  if (emailGroup) {
    emailGroup.style.display = isAdmin ? '' : 'none';
  }

  const query = (filterText || '').toLowerCase();
  const filtered = usersList.filter((u) => {
    if (!query) return true;
    return (
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.username && u.username.toLowerCase().includes(query)) ||
      (u.breed && u.breed.toLowerCase().includes(query)) ||
      (u.epidemiologicCode && u.epidemiologicCode.includes(query)) ||
      (u.hatchingPermitCode && u.hatchingPermitCode.includes(query)) ||
      (u.createdBy && u.createdBy.toLowerCase().includes(query))
    );
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${isAdmin ? 10 : 7}" style="text-align: center; color: var(--color-ink-dim); padding: 2rem;">
          ${filterText ? 'مرغداری با این مشخصات یافت نشد.' : 'هنوز مرغداری تعریف نشده است.'}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach((user) => {
    const tr = document.createElement('tr');

    const adminColsHtml = isAdmin ? `
      <td>
        ${user.email ? `
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="color: #60a5fa; font-family: monospace; font-size: 0.8rem; direction: ltr;">${user.email}</span>
            <button type="button" class="btn-action btn-copy show-farmer-auth-cred-btn" data-username="${user.username}" title="مشاهده مشخصات ورود مرغدار">🔑</button>
          </div>
        ` : `
          <button type="button" class="btn-action create-farmer-auth-btn" data-username="${user.username}" data-name="${user.name}" style="color: #eab308; border-color: rgba(234, 179, 8, 0.4); font-size: 0.72rem; padding: 2px 6px;" title="ایجاد اکانت ورود در Supabase Auth">+ ساخت اکانت</button>
        `}
      </td>
      <td>
        ${user.deviceFingerprint ? `
          <div style="display: flex; align-items: center; gap: 4px;">
            <span class="badge" style="background: rgba(34, 197, 94, 0.12); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); font-size: 0.72rem; font-family: monospace;" title="شناسه اثر انگشت: ${user.deviceFingerprint}">
              🔒 ${user.deviceFingerprint.slice(0, 8)}...
            </span>
            <button type="button" class="btn-action reset-device-lock-btn" data-username="${user.username}" title="بازنشانی قفل سخت‌افزاری مرورگر" style="color: #f59e0b; border-color: rgba(245, 158, 11, 0.4); font-size: 0.7rem; padding: 2px 6px;">
              🔓 ریست
            </button>
          </div>
        ` : `
          <span style="color: var(--color-ink-dim); font-size: 0.75rem;">⏳ آزاد (قفل نشده)</span>
        `}
      </td>
      <td>
        <span class="badge" style="background: rgba(168, 85, 247, 0.12); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); font-size: 0.75rem; font-family: monospace;">
          ${user.createdBy || 'admin'}
        </span>
      </td>
    ` : '';

    tr.innerHTML = `
      <td style="font-weight: 600;">${user.name}</td>
      <td><span class="badge" style="font-family: monospace; font-size: 0.85rem;">${user.username}</span></td>
      <td>
        <span class="user-pass-display" data-pass="${encodeURIComponent(user.password)}" style="font-family: monospace; letter-spacing: 2px;">••••••••</span>
        <button type="button" class="btn-action btn-copy toggle-user-pass-btn" style="margin-right: 4px; padding: 2px 6px;" title="نمایش رمز">👁️</button>
      </td>
      ${adminColsHtml}
      <td><span style="color: var(--color-ink-white-muted);">${user.breed || 'راس'}</span></td>
      <td style="font-family: monospace; direction: ltr; text-align: right;">${user.epidemiologicCode || '-'}</td>
      <td style="font-family: monospace; direction: ltr; text-align: right;">${user.hatchingPermitCode || '-'}</td>
      <td style="text-align: center;">
        <div class="btn-action-group">
          <button class="btn-action btn-edit edit-user-btn" data-username="${user.username}" title="ویرایش">
            ✏️ ویرایش
          </button>
          <button class="btn-action btn-delete delete-user-btn" data-username="${user.username}" data-name="${user.name}" title="حذف">
            🗑️ حذف
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach table action events
  tbody.querySelectorAll('.toggle-user-pass-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const passSpan = e.target.previousElementSibling;
      const rawPass = decodeURIComponent(passSpan.dataset.pass || '');
      if (passSpan.textContent === '••••••••') {
        passSpan.textContent = rawPass;
        passSpan.style.letterSpacing = '0px';
        btn.textContent = '🔒';
      } else {
        passSpan.textContent = '••••••••';
        passSpan.style.letterSpacing = '2px';
        btn.textContent = '👁️';
      }
    });
  });

  // Reset Device Lock button handler
  tbody.querySelectorAll('.reset-device-lock-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const username = btn.dataset.username;
      if (!confirm('آیا از بازنشانی قفل مرورگر برای کاربر "' + username + '" اطمینان دارید؟ کاربر می‌تواند در ورود بعدی با سیستم یا مرورگر جدید متصل شود.')) {
        return;
      }
      try {
        btn.disabled = true;
        btn.textContent = '...';
        const res = await fetch('/api/users/' + encodeURIComponent(username) + '/reset-device', {
          method: 'POST'
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          await loadUsers();
        } else {
          showToast(data.error || 'خطا در بازنشانی قفل', 'error');
        }
      } catch (err) {
        showToast('خطا در ارتباط با سرور: ' + err.message, 'error');
      }
    });
  });


  // Show Auth Credentials Modal
  tbody.querySelectorAll('.show-farmer-auth-cred-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const username = btn.dataset.username;
      const user = usersList.find((u) => u.username === username);
      if (!user) return;
      openAuthCredentialsModal(user);
    });
  });

  // Quick Create Auth Account
  tbody.querySelectorAll('.create-farmer-auth-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const username = btn.dataset.username;
      const user = usersList.find((u) => u.username === username);
      if (!user) return;

      const defaultEmail = `${user.username.toLowerCase()}@gmail.com`;
      const email = prompt(`ایمیل مرغدار «${user.name}» را جهت ثبت در Supabase Auth وارد کنید:`, defaultEmail);
      if (!email) return;

      btn.disabled = true;
      btn.textContent = '⏳ در حال ساخت...';

      try {
        const res = await fetch('/api/auth/register-farmer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: user.username,
            email: email.trim(),
            password: user.password
          })
        });
        const data = await res.json();
        if (data.success) {
          await loadUsers();
          openAuthCredentialsModal({
            name: user.name,
            username: user.username,
            email: email.trim(),
            password: user.password
          });
          showToast(`اکانت برای مرغدار ${user.name} با موفقیت ساخته شد.`, 'success');
        } else {
          showToast(data.error || 'خطا در ایجاد اکانت', 'error');
        }
      } catch (err) {
        showToast('خطا در ارتباط با سرور: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '+ ساخت اکانت';
      }
    });
  });

  tbody.querySelectorAll('.edit-user-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const username = btn.dataset.username;
      const user = usersList.find((u) => u.username === username);
      if (!user) return;

      const loggedInUserStr = localStorage.getItem('ivo_logged_in_user');
      let isAdmin = false;
      if (loggedInUserStr) {
        try {
          const u = JSON.parse(loggedInUserStr);
          isAdmin = (u.role === 'admin' || u.username === 'admin' || u.email === 'admin@ivo.ir');
        } catch (e) {}
      }
      const emailGroup = document.getElementById('userModalEmailGroup');
      if (emailGroup) emailGroup.style.display = isAdmin ? '' : 'none';

      document.getElementById('userModalTitle').textContent = `ویرایش مرغدار: ${user.name}`;
      document.getElementById('userModalMode').value = 'edit';
      document.getElementById('userModalOriginalUsername').value = user.username;
      document.getElementById('userModalName').value = user.name || '';
      document.getElementById('userModalUsername').value = user.username || '';
      document.getElementById('userModalPassword').value = user.password || '';
      document.getElementById('userModalPassword').type = 'password';
      const emailEl = document.getElementById('userModalEmail');
      if (emailEl) emailEl.value = user.email || '';
      document.getElementById('userModalBreed').value = user.breed || 'راس';
      document.getElementById('userModalEpidemiologic').value = user.epidemiologicCode || '';
      document.getElementById('userModalHatching').value = user.hatchingPermitCode || '';
      document.getElementById('userModalError').style.display = 'none';

      document.getElementById('userModal').classList.add('active');
    });
  });

  tbody.querySelectorAll('.delete-user-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const username = btn.dataset.username;
      const name = btn.dataset.name;

      openConfirmDelete(`آیا از حذف مرغدار «${name} (${username})» اطمینان دارید؟`, async () => {
        try {
          const res = await fetch(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            await loadUsers();
            showToast(`مرغدار ${name} با موفقیت حذف شد.`, 'success');
          } else {
            showToast(data.error, 'error');
          }
        } catch (err) {
          showToast('خطا در حذف کاربر: ' + err.message, 'error');
        }
      });
    });
  });
}

// Render Admin Slaughterhouses Table
function renderAdminSlaughterhouses(filterText = '') {
  const tbody = document.getElementById('adminShTableBody');
  const countBadge = document.getElementById('adminShCountBadge');
  if (!tbody) return;

  if (countBadge) {
    countBadge.textContent = slaughterhousesList.length;
  }

  const query = (filterText || '').toLowerCase();
  const filtered = slaughterhousesList.filter((sh) => {
    if (!query) return true;
    return (
      (sh.name && sh.name.toLowerCase().includes(query)) ||
      (sh.code && sh.code.includes(query))
    );
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--color-ink-dim); padding: 2rem;">
          ${filterText ? 'کشتارگاهی با این مشخصات یافت نشد.' : 'هنوز کشتارگاهی ثبت نشده است.'}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach((sh, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color: var(--color-ink-dim); font-size: 0.8rem;">${idx + 1}</td>
      <td style="font-weight: 600;">${sh.name}</td>
      <td>
        <span style="font-family: monospace; font-size: 0.9rem; direction: ltr; display: inline-block;">${sh.code}</span>
        <button class="btn-action btn-copy copy-sh-code-btn" data-code="${sh.code}" style="margin-right: 6px; padding: 2px 6px;" title="کپی شناسه">📋</button>
      </td>
      <td style="text-align: center;">
        <div class="btn-action-group">
          <button class="btn-action btn-edit edit-sh-btn" data-code="${sh.code}" title="ویرایش">
            ✏️ ویرایش
          </button>
          <button class="btn-action btn-delete delete-sh-btn" data-code="${sh.code}" data-name="${sh.name}" title="حذف">
            🗑️ حذف
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach slaughterhouse events
  tbody.querySelectorAll('.copy-sh-code-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.code);
      showToast(`شناسه ${btn.dataset.code} کپی شد.`, 'success');
    });
  });

  tbody.querySelectorAll('.edit-sh-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.code;
      const sh = slaughterhousesList.find((s) => s.code === code);
      if (!sh) return;

      document.getElementById('shModalTitle').textContent = `ویرایش کشتارگاه: ${sh.name}`;
      document.getElementById('shModalMode').value = 'edit';
      document.getElementById('shModalOriginalCode').value = sh.code;
      document.getElementById('shModalName').value = sh.name || '';
      document.getElementById('shModalCode').value = sh.code || '';
      document.getElementById('shModalError').style.display = 'none';

      document.getElementById('shModal').classList.add('active');
    });
  });

  tbody.querySelectorAll('.delete-sh-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.code;
      const name = btn.dataset.name;

      openConfirmDelete(`آیا از حذف کشتارگاه «${name}» با شناسه ${code} اطمینان دارید؟`, async () => {
        try {
          const res = await fetch(`/api/slaughterhouses/${encodeURIComponent(code)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            await loadSlaughterhouses();
            showToast(`کشتارگاه ${name} با موفقیت حذف شد.`, 'success');
          } else {
            showToast(data.error, 'error');
          }
        } catch (err) {
          showToast('خطا در حذف کشتارگاه: ' + err.message, 'error');
        }
      });
    });
  });
}

// Render Admin Tracking Codes Chips Grid
function renderAdminCodes(filterText = '') {
  const container = document.getElementById('adminCodesChipsGrid');
  const countBadge = document.getElementById('adminCodesCountBadge');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = trackingCodes.length;
  }
  const railCodesCount = document.getElementById('railCodesReadyCount');
  if (railCodesCount) {
    railCodesCount.textContent = `${trackingCodes.length} کد`;
  }

  const query = (filterText || '').toLowerCase();
  const filtered = trackingCodes.filter((c) => {
    if (!query) return true;
    return String(c).toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--color-ink-dim); padding: 2rem;">
        ${filterText ? 'کد رهگیری مطابق با جستجو یافت نشد.' : 'هیچ کد رهگیری در سیستم ثبت نشده است.'}
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filtered.forEach((code) => {
    const isSuccess = lastSuccessfulCodeData && lastSuccessfulCodeData.code === code;
    const chip = document.createElement('div');
    chip.className = `code-chip ${isSuccess ? 'success-chip' : ''}`;
    chip.innerHTML = `
      <span class="code-chip-text">${code}${isSuccess ? ' ⭐' : ''}</span>
      <div class="code-chip-actions">
        <button class="code-chip-btn copy-chip-btn" data-code="${code}" title="کپی کد">📋</button>
        <button class="code-chip-btn delete-btn delete-chip-btn" data-code="${code}" title="حذف کد">✕</button>
      </div>
    `;
    container.appendChild(chip);
  });

  // Attach chip events
  container.querySelectorAll('.copy-chip-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(btn.dataset.code);
      showToast(`کد ${btn.dataset.code} کپی شد.`, 'success');
    });
  });

  container.querySelectorAll('.delete-chip-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const codeToDelete = btn.dataset.code;

      try {
        const res = await fetch(`/api/codes/${encodeURIComponent(codeToDelete)}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          trackingCodes = data.codes;
          renderCodesList();
          renderAdminCodes();
          showToast(`کد ${codeToDelete} با موفقیت حذف شد.`, 'success');
        } else {
          showToast(data.error, 'error');
        }
      } catch (err) {
        showToast('خطا در حذف کد: ' + err.message, 'error');
      }
    });
  });
}

// Start
window.addEventListener('DOMContentLoaded', init);
