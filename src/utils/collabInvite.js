const INVITE_PREFIX = 'CLAV1.';
const ROOM_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function normalizeServerUrl(value) {
  const url = new URL(String(value || '').trim());
  if (!['wss:', 'ws:'].includes(url.protocol)) {
    throw new Error('The invitation contains an unsupported server address.');
  }
  if (url.username || url.password || !url.hostname) {
    throw new Error('The invitation contains an invalid server address.');
  }
  if (url.protocol === 'ws:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Remote collaboration servers must use an encrypted connection.');
  }
  return url.toString().replace(/\/$/, '');
}

function validateRoom(room) {
  const normalized = String(room || '').trim();
  if (!ROOM_PATTERN.test(normalized)) {
    throw new Error('The invitation contains an invalid room code.');
  }
  return normalized;
}

function encodeBase64Url(value) {
  return window.btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return window.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
}

export function createCollabInvite(room, serverUrl) {
  const payload = {
    v:1,
    r:validateRoom(room),
    s:normalizeServerUrl(serverUrl),
  };
  return `${INVITE_PREFIX}${encodeBase64Url(JSON.stringify(payload))}`;
}

export function parseCollabInvite(input) {
  const value = String(input || '').trim();
  if (value.startsWith(INVITE_PREFIX)) {
    let payload;
    try {
      payload = JSON.parse(decodeBase64Url(value.slice(INVITE_PREFIX.length)));
    } catch {
      throw new Error('The invitation code is damaged or incomplete.');
    }
    if (payload?.v !== 1) {
      throw new Error('This invitation code version is not supported.');
    }
    return {
      room:validateRoom(payload.r),
      serverUrl:normalizeServerUrl(payload.s),
      legacy:false,
    };
  }

  const legacyMatch =
    value.match(/join\/([A-Za-z0-9_-]+)/) ||
    value.match(/[?&]room=([A-Za-z0-9_-]+)/) ||
    value.match(/^([A-Za-z0-9_-]+)$/);
  if (!legacyMatch) {
    throw new Error('No valid collaboration invitation was found.');
  }
  return {
    room:validateRoom(legacyMatch[1]),
    serverUrl:null,
    legacy:true,
  };
}
