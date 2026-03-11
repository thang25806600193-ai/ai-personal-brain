const DEFAULT_API_BASE_URL = 'https://aiinterviewcoach.id.vn/api';
const DEFAULT_GOOGLE_CLIENT_ID = '655409197383-ossuvrrka5gkhvplf0s9b78eao8oeas4.apps.googleusercontent.com';
const CONTEXT_MENU_ID = 'save-selection-ai-brain';

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result));
  });
}

function setStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => resolve());
  });
}

function launchWebAuthFlow(url) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (redirectUrl) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message || 'OAuth failed'));
        return;
      }
      resolve(redirectUrl || '');
    });
  });
}

function randomString(length = 24) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function getApiBaseUrl() {
  const { apiBaseUrl } = await getStorage(['apiBaseUrl']);
  return (apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/$/, '');
}

async function getAuthToken() {
  const { token } = await getStorage(['token']);
  return token || null;
}

async function doBackendLogin(base, body) {
  const response = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Login failed');
  }

  await setStorage({
    token: payload.token,
    user: payload.user || null,
    apiBaseUrl: base,
  });

  return payload;
}

async function login({ email, password, apiBaseUrl }) {
  const base = (apiBaseUrl || (await getApiBaseUrl())).replace(/\/$/, '');
  return doBackendLogin(base, { email, password });
}

async function loginWithGoogle({ apiBaseUrl, googleClientId }) {
  const base = (apiBaseUrl || (await getApiBaseUrl())).replace(/\/$/, '');
  const clientId = (googleClientId || DEFAULT_GOOGLE_CLIENT_ID).trim();

  if (!clientId) {
    throw new Error('Missing Google client id');
  }

  const redirectUri = chrome.identity.getRedirectURL('google');
  const nonce = randomString(28);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'id_token');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('prompt', 'select_account');

  const redirected = await launchWebAuthFlow(authUrl.toString());
  if (!redirected) {
    throw new Error('Google login cancelled');
  }

  const hashIndex = redirected.indexOf('#');
  const hash = hashIndex >= 0 ? redirected.slice(hashIndex + 1) : '';
  const params = new URLSearchParams(hash);
  const idToken = params.get('id_token');

  if (!idToken) {
    throw new Error('Could not get id_token from Google response');
  }

  const response = await fetch(`${base}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential: idToken }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Google login failed');
  }

  await setStorage({
    token: payload.token,
    user: payload.user || null,
    apiBaseUrl: base,
  });

  return payload;
}

async function fetchSubjects() {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const base = await getApiBaseUrl();
  const response = await fetch(`${base}/subjects`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => []);

  if (response.status === 401 || response.status === 403) {
    await setStorage({ token: null, user: null });
    throw new Error('SESSION_EXPIRED');
  }

  if (!response.ok) {
    throw new Error(payload?.error || 'Cannot load subjects');
  }

  return Array.isArray(payload) ? payload : [];
}

async function saveClip({ text, source_url, source_title, subject_id }) {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const base = await getApiBaseUrl();
  const response = await fetch(`${base}/extension/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, source_url, source_title, subject_id }),
  });

  const payload = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    await setStorage({ token: null, user: null });
    throw new Error('SESSION_EXPIRED');
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Cannot save clip');
  }

  const lastJob = {
    jobId: payload?.job?.jobId || null,
    createdAt: Date.now(),
    sourceTitle: source_title || '',
    sourceUrl: source_url || '',
  };
  await setStorage({ lastJob });

  return payload;
}

async function getLastJobStatus() {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const { lastJob } = await getStorage(['lastJob']);
  const jobId = lastJob?.jobId;
  if (!jobId) {
    throw new Error('NO_LAST_JOB');
  }

  const base = await getApiBaseUrl();
  const response = await fetch(`${base}/extension/job/${encodeURIComponent(jobId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    await setStorage({ token: null, user: null });
    throw new Error('SESSION_EXPIRED');
  }

  if (!response.ok) {
    throw new Error(payload?.error || 'Cannot read job status');
  }

  return {
    ...payload,
    lastJob,
  };
}

function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Save selection to AI Brain',
      contexts: ['selection'],
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  setupContextMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return;
  }

  const selected = String(info.selectionText || '').trim();
  if (!selected || !tab?.id) {
    return;
  }

  chrome.tabs.sendMessage(tab.id, {
    type: 'OPEN_SAVE_POPUP',
    payload: {
      text: selected,
      sourceUrl: info.pageUrl || tab.url || '',
      sourceTitle: tab.title || '',
    },
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === 'LOGIN') {
        const data = await login(message.payload || {});
        sendResponse({ ok: true, data });
        return;
      }

      if (message?.type === 'LOGIN_GOOGLE') {
        const data = await loginWithGoogle(message.payload || {});
        sendResponse({ ok: true, data });
        return;
      }

      if (message?.type === 'LOGOUT') {
        await setStorage({ token: null, user: null });
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === 'GET_AUTH') {
        const state = await getStorage(['token', 'user', 'apiBaseUrl', 'lastJob']);
        sendResponse({ ok: true, data: state });
        return;
      }

      if (message?.type === 'GET_SUBJECTS') {
        const subjects = await fetchSubjects();
        sendResponse({ ok: true, data: subjects });
        return;
      }

      if (message?.type === 'SAVE_CLIP') {
        const result = await saveClip(message.payload || {});
        sendResponse({ ok: true, data: result });
        return;
      }

      if (message?.type === 'GET_LAST_JOB_STATUS') {
        const result = await getLastJobStatus();
        sendResponse({ ok: true, data: result });
        return;
      }

      sendResponse({ ok: false, error: 'Unsupported message type' });
    } catch (error) {
      sendResponse({ ok: false, error: error.message || 'Unknown error' });
    }
  })();

  return true;
});
