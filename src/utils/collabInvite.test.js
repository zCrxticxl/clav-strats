import { createCollabInvite, parseCollabInvite } from './collabInvite';

test('round-trips the room and public websocket server in one invitation code', () => {
  const code = createCollabInvite('room_123', 'wss://bright-map.trycloudflare.com/');

  expect(code.startsWith('CLAV1.')).toBe(true);
  expect(parseCollabInvite(code)).toEqual({
    room:'room_123',
    serverUrl:'wss://bright-map.trycloudflare.com',
    legacy:false,
  });
});

test('keeps legacy room codes working', () => {
  expect(parseCollabInvite('old-room')).toMatchObject({
    room:'old-room',
    serverUrl:null,
    legacy:true,
  });
  expect(parseCollabInvite('clavstrats://join/linked-room')).toMatchObject({
    room:'linked-room',
    serverUrl:null,
  });
});

test('rejects malformed and insecure remote invitations', () => {
  expect(() => parseCollabInvite('CLAV1.invalid')).toThrow(/damaged/i);
  expect(() => createCollabInvite('valid-room', 'ws://example.com')).toThrow(/encrypted/i);
  expect(() => createCollabInvite('../room', 'wss://example.com')).toThrow(/room/i);
});
