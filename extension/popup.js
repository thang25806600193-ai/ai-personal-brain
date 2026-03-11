const DEFAULT_API_BASE_URL = 'https://aiinterviewcoach.id.vn/api';

const authStateEl = document.getElementById('auth-state');
const loginForm = document.getElementById('login-form');
const statusEl = document.getElementById('status');
const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const apiBaseUrlEl = document.getElementById('api-base-url');
const googleLoginBtn = document.getElementById('google-login-btn');
const jobCardEl = document.getElementById('job-card');
const jobMetaEl = document.getElementById('job-meta');
const refreshJobBtn = document.getElementById('refresh-job-btn');
const jobStatusEl = document.getElementById('job-status');

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => resolve(response));
  });
}

function setStatus(message, type = '') {
  statusEl.textContent = message || '';
  statusEl.className = `status ${type}`.trim();
}

function renderLoggedOut() {
  authStateEl.innerHTML = '<div>Chua dang nhap.</div>';
  loginForm.style.display = 'block';
  jobCardEl.style.display = 'none';
}

function renderLoggedIn(user, apiBaseUrl, lastJob) {
  const displayName = user?.name || user?.email || 'User';
  authStateEl.innerHTML = `
    <div>Da dang nhap voi <strong>${displayName}</strong></div>
    <div style="font-size:11px;color:#94a3b8;margin-top:4px;word-break:break-all;">API: ${apiBaseUrl || DEFAULT_API_BASE_URL}</div>
    <button id="logout-btn" class="secondary" type="button">Dang xuat</button>
  `;

  loginForm.style.display = 'none';
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn.addEventListener('click', async () => {
    await sendMessage({ type: 'LOGOUT' });
    setStatus('Da dang xuat', 'success');
    renderLoggedOut();
  });

  if (lastJob?.jobId) {
    jobCardEl.style.display = 'block';
    const createdAt = lastJob.createdAt ? new Date(lastJob.createdAt).toLocaleString() : '-';
    jobMetaEl.textContent = `Job: ${lastJob.jobId} | ${createdAt}`;
    jobStatusEl.textContent = 'Nhan "Xem trang thai job" de cap nhat.';
  } else {
    jobCardEl.style.display = 'none';
  }
}

async function loadState() {
  const authRes = await sendMessage({ type: 'GET_AUTH' });
  const data = authRes?.data || {};

  apiBaseUrlEl.value = data.apiBaseUrl || DEFAULT_API_BASE_URL;

  if (data.token) {
    renderLoggedIn(data.user, data.apiBaseUrl || DEFAULT_API_BASE_URL, data.lastJob);
  } else {
    renderLoggedOut();
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = emailEl.value.trim();
  const password = passwordEl.value;
  const apiBaseUrl = (apiBaseUrlEl.value.trim() || DEFAULT_API_BASE_URL).replace(/\/$/, '');

  if (!email || !password) {
    setStatus('Nhap day du email va mat khau', 'error');
    return;
  }

  setStatus('Dang dang nhap...');

  const response = await sendMessage({
    type: 'LOGIN',
    payload: {
      email,
      password,
      apiBaseUrl,
    },
  });

  if (!response?.ok) {
    setStatus(response?.error || 'Dang nhap that bai', 'error');
    return;
  }

  setStatus('Dang nhap thanh cong', 'success');
  await loadState();
});

googleLoginBtn.addEventListener('click', async () => {
  const apiBaseUrl = (apiBaseUrlEl.value.trim() || DEFAULT_API_BASE_URL).replace(/\/$/, '');
  setStatus('Dang mo Google login...');

  const response = await sendMessage({
    type: 'LOGIN_GOOGLE',
    payload: {
      apiBaseUrl,
    },
  });

  if (!response?.ok) {
    setStatus(response?.error || 'Google login that bai', 'error');
    return;
  }

  setStatus('Dang nhap Google thanh cong', 'success');
  await loadState();
});

refreshJobBtn.addEventListener('click', async () => {
  jobStatusEl.textContent = 'Dang tai trang thai...';

  const response = await sendMessage({ type: 'GET_LAST_JOB_STATUS' });
  if (!response?.ok) {
    const err = response?.error || 'Khong the doc trang thai job';
    jobStatusEl.textContent = err === 'NO_LAST_JOB' ? 'Chua co job nao duoc tao.' : `Loi: ${err}`;
    return;
  }

  const data = response.data || {};
  const status = String(data.status || 'unknown');
  const progress = typeof data.progress === 'number' ? data.progress : 0;
  const failedReason = data.failedReason || '';

  if (status === 'failed') {
    jobStatusEl.textContent = `FAILED (${progress}%) - ${failedReason || 'Khong ro ly do'}`;
  } else {
    jobStatusEl.textContent = `${status.toUpperCase()} (${progress}%)`;
  }
});

loadState();
