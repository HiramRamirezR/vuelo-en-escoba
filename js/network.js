let ws = null;
let connected = false;
let playerId = null;
let playerColor = 0x4444ff;
const listeners = {};

export function on(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
}

function emit(event, data) {
  const cbs = listeners[event];
  if (cbs) cbs.forEach(cb => cb(data));
}

export function connect(url) {
  if (ws) ws.close();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const fullUrl = url.includes('://') ? url : `${protocol}//${url}`;
  try {
    ws = new WebSocket(fullUrl);
  } catch (e) {
    emit('error', 'No se pudo conectar');
    return;
  }
  ws.onopen = () => {
    connected = true;
    emit('connect');
  };
  ws.onmessage = (event) => {
    try {
      handleMessage(JSON.parse(event.data));
    } catch (e) { /* ignore */ }
  };
  ws.onclose = () => {
    connected = false;
    const oldId = playerId;
    playerId = null;
    emit('disconnect', { id: oldId });
  };
  ws.onerror = () => {
    emit('error', 'Error de conexión');
  };
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'init':
      playerId = msg.id;
      playerColor = msg.color;
      emit('init', { id: msg.id, color: msg.color, players: msg.players, collectedRings: msg.collectedRings });
      break;
    case 'player_join':
      emit('player_join', { id: msg.id, color: msg.color });
      break;
    case 'player_leave':
      emit('player_leave', { id: msg.id });
      break;
    case 'player_update':
      emit('player_update', msg);
      break;
    case 'ring_collected':
      emit('ring_collected', { ringId: msg.ringId });
      break;
  }
}

export function disconnect() {
  if (ws) { ws.close(); ws = null; }
  connected = false;
  playerId = null;
}

export function sendUpdate(state) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: 'update', ...state }));
}

export function sendRingCollect(ringId) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: 'ring_collect', ringId }));
}

export function isConnected() {
  return connected;
}

export function getPlayerId() {
  return playerId;
}

export function getPlayerColor() {
  return playerColor;
}
