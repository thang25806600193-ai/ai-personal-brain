const POPUP_ID = 'ai-brain-clipper-popup';
let mouseX = 0;
let mouseY = 0;

function clamp(val, min, max) {
	return Math.max(min, Math.min(max, val));
}

function removePopup() {
	const existing = document.getElementById(POPUP_ID);
	if (existing) {
		existing.remove();
	}
}

function sendMessage(message) {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage(message, (response) => resolve(response));
	});
}

function buildPopup({ x, y, text, sourceUrl, sourceTitle }) {
	removePopup();

	const popup = document.createElement('div');
	popup.id = POPUP_ID;
	popup.style.position = 'absolute';
	popup.style.left = `${x}px`;
	popup.style.top = `${y}px`;
	popup.style.zIndex = '999999';
	popup.style.width = '320px';
	popup.style.maxWidth = 'calc(100vw - 24px)';
	popup.style.background = '#0f172a';
	popup.style.color = '#e2e8f0';
	popup.style.border = '1px solid rgba(56, 189, 248, 0.35)';
	popup.style.borderRadius = '12px';
	popup.style.boxShadow = '0 20px 40px rgba(2, 6, 23, 0.5)';
	popup.style.padding = '10px';
	popup.style.fontFamily = 'Segoe UI, Arial, sans-serif';

	popup.innerHTML = `
		<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;">
			<strong style="font-size:13px;color:#67e8f9;">Save to AI Brain</strong>
			<button id="ai-brain-close" type="button" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:12px;">Close</button>
		</div>
		<div style="font-size:12px;line-height:1.4;max-height:66px;overflow:auto;padding:8px;background:rgba(15,23,42,0.7);border:1px solid rgba(148,163,184,0.2);border-radius:8px;margin-bottom:8px;">${text.replace(/</g, '&lt;').slice(0, 320)}</div>
		<select id="ai-brain-subject" style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(100,116,139,0.45);background:#020617;color:#e2e8f0;font-size:12px;margin-bottom:8px;">
			<option value="">Loading subjects...</option>
		</select>
		<button id="ai-brain-save" type="button" style="width:100%;padding:9px;border-radius:8px;border:none;background:linear-gradient(90deg,#0284c7,#2563eb);color:white;font-weight:600;cursor:pointer;font-size:12px;">Luu vao AI Brain</button>
		<div id="ai-brain-status" style="font-size:11px;color:#94a3b8;margin-top:8px;min-height:14px;"></div>
	`;

	document.body.appendChild(popup);

	const popupRect = popup.getBoundingClientRect();
	const adjustedX = clamp(x, 8, window.scrollX + window.innerWidth - popupRect.width - 8);
	const adjustedY = clamp(y, 8, window.scrollY + window.innerHeight - popupRect.height - 8);
	popup.style.left = `${adjustedX}px`;
	popup.style.top = `${adjustedY}px`;

	const closeBtn = popup.querySelector('#ai-brain-close');
	const saveBtn = popup.querySelector('#ai-brain-save');
	const subjectSelect = popup.querySelector('#ai-brain-subject');
	const statusEl = popup.querySelector('#ai-brain-status');

	closeBtn.addEventListener('click', removePopup);

	sendMessage({ type: 'GET_SUBJECTS' }).then((res) => {
		if (!res?.ok) {
			subjectSelect.innerHTML = '<option value="">Please login via extension icon</option>';
			saveBtn.disabled = true;
			saveBtn.style.opacity = '0.6';
			statusEl.textContent = 'Ban chua dang nhap extension.';
			return;
		}

		const subjects = Array.isArray(res.data) ? res.data : [];
		if (subjects.length === 0) {
			subjectSelect.innerHTML = '<option value="">No subjects found</option>';
			saveBtn.disabled = true;
			saveBtn.style.opacity = '0.6';
			statusEl.textContent = 'Khong co mon hoc de luu.';
			return;
		}

		subjectSelect.innerHTML = subjects
			.map((subject) => `<option value="${subject.id}">${(subject.name || '').replace(/</g, '&lt;')}</option>`)
			.join('');
	});

	saveBtn.addEventListener('click', async () => {
		const subjectId = subjectSelect.value;
		if (!subjectId) {
			statusEl.textContent = 'Vui long chon mon hoc.';
			return;
		}

		saveBtn.disabled = true;
		saveBtn.textContent = 'Dang luu...';
		statusEl.textContent = 'Dang day vao queue...';

		const response = await sendMessage({
			type: 'SAVE_CLIP',
			payload: {
				text,
				source_url: sourceUrl || window.location.href,
				source_title: sourceTitle || document.title,
				subject_id: subjectId,
			},
		});

		if (!response?.ok) {
			saveBtn.disabled = false;
			saveBtn.textContent = 'Luu vao AI Brain';
			statusEl.textContent = response?.error === 'SESSION_EXPIRED'
				? 'Het phien dang nhap. Vui long login lai.'
				: `Loi: ${response?.error || 'Khong the luu clip'}`;
			return;
		}

		statusEl.style.color = '#34d399';
		statusEl.textContent = 'Da luu thanh cong. AI dang xu ly nen.';
		saveBtn.textContent = 'Da luu';

		setTimeout(() => {
			removePopup();
		}, 1400);
	});
}

document.addEventListener('mousemove', (event) => {
	mouseX = event.pageX;
	mouseY = event.pageY;
});

document.addEventListener('mouseup', (event) => {
	if (event.target && event.target.closest(`#${POPUP_ID}`)) {
		return;
	}

	setTimeout(() => {
		const selection = window.getSelection();
		const selectedText = selection ? selection.toString().trim() : '';

		if (!selectedText || selectedText.length < 20) {
			return;
		}

		const x = (mouseX || event.pageX) + 12;
		const y = (mouseY || event.pageY) + 12;
		buildPopup({ x, y, text: selectedText, sourceUrl: window.location.href, sourceTitle: document.title });
	}, 20);
});

document.addEventListener('mousedown', (event) => {
	const popup = document.getElementById(POPUP_ID);
	if (popup && !popup.contains(event.target)) {
		removePopup();
	}
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message?.type !== 'OPEN_SAVE_POPUP') {
		return;
	}

	const text = String(message?.payload?.text || '').trim();
	if (!text || text.length < 20) {
		sendResponse?.({ ok: false, error: 'Selection too short' });
		return;
	}

	const x = window.scrollX + Math.max(12, Math.floor(window.innerWidth * 0.5) - 160);
	const y = window.scrollY + 80;
	buildPopup({
		x,
		y,
		text,
		sourceUrl: message?.payload?.sourceUrl || window.location.href,
		sourceTitle: message?.payload?.sourceTitle || document.title,
	});

	sendResponse?.({ ok: true });
});
