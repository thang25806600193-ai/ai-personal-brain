# AI Personal Brain Clipper

## Install (Chrome)
1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked` and select this `extension/` folder.
4. Pin extension icon to toolbar.

## Login
1. Click extension icon.
2. Enter `API Base URL` (default: `https://aiinterviewcoach.id.vn/api`).
3. Login with your AI Personal Brain account (email/password) or `Dang nhap voi Google`.

### Google login note
- Google OAuth in extension uses `chrome.identity.launchWebAuthFlow`.
- You must whitelist the extension redirect URI in Google Cloud OAuth client settings:
  - Format: `https://<your-extension-id>.chromiumapp.org/google`

## Usage
1. Open any webpage (Wikipedia, Medium, Docs, etc.).
2. Highlight a useful text segment.
3. Tooltip popup appears near cursor.
4. Select a Subject and click `Luu vao AI Brain`.
5. Clip is queued and processed in the backend worker.

## Context menu (V2)
1. Highlight text on any webpage.
2. Right-click and choose `Save selection to AI Brain`.
3. Popup save UI opens on page so you can pick subject and save.

## View latest job status (V2)
1. Open extension popup.
2. If there is a recent clip job, press `Xem trang thai job`.
3. Status examples: `waiting`, `active`, `completed`, `failed`.

## Payload sent to backend
`POST /api/extension/save`

```json
{
  "text": "highlighted text",
  "source_url": "https://example.com/page",
  "source_title": "Page title",
  "subject_id": "subject-uuid"
}
```

## Notes
- JWT token is stored in `chrome.storage.local`.
- If session expires, login again from the extension popup.
- Web clips are stored as source nodes (`Web_Article`) and concepts are linked into the graph.
