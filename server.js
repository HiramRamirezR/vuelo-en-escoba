const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const os = require('os');

const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

const PLAYER_COLORS = [0xcc3333, 0x3399cc, 0x33cc66, 0xcccc33, 0xcc66cc, 0xff8844];
const SPAWN_POSITIONS = [
  { x: 0, z: 0 },
  { x: -5, z: -3 },
  { x: 5, z: 3 },
  { x: -5, z: 3 },
  { x: 5, z: -3 },
];
let nextId = 0;
const players = new Map();
const collectedRings = new Set();

function broadcast(message, excludeWs = null) {
  const data = JSON.stringify(message);
  for (const [, player] of players) {
    if (player.ws !== excludeWs && player.ws.readyState === 1) {
      player.ws.send(data);
    }
  }
}

wss.on('connection', (ws) => {
  const id = nextId++;
  const color = PLAYER_COLORS[id % PLAYER_COLORS.length];
  const spawn = SPAWN_POSITIONS[id % SPAWN_POSITIONS.length];
  const player = { id, color, ws, x: spawn.x, y: 0.3, z: spawn.z, rotation: 0, pitch: 0, bank: 0, speed: 0 };
  players.set(id, player);

  const otherPlayers = [];
  for (const [pid, p] of players) {
    if (pid !== id) {
      otherPlayers.push({ id: pid, color: p.color, x: p.x, y: p.y, z: p.z, rotation: p.rotation, pitch: p.pitch, bank: p.bank, speed: p.speed });
    }
  }

  ws.send(JSON.stringify({
    type: 'init',
    id,
    color,
    spawnX: spawn.x,
    spawnZ: spawn.z,
    players: otherPlayers,
    collectedRings: [...collectedRings]
  }));

  broadcast({ type: 'player_join', id, color }, ws);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      switch (msg.type) {
        case 'update':
          player.x = msg.x; player.y = msg.y; player.z = msg.z;
          player.rotation = msg.rotation; player.pitch = msg.pitch;
          player.bank = msg.bank; player.speed = msg.speed;
          broadcast({
            type: 'player_update', id,
            x: msg.x, y: msg.y, z: msg.z,
            rotation: msg.rotation, pitch: msg.pitch,
            bank: msg.bank, speed: msg.speed
          }, ws);
          break;
        case 'ring_collect':
          if (!collectedRings.has(msg.ringId)) {
            collectedRings.add(msg.ringId);
            broadcast({ type: 'ring_collected', ringId: msg.ringId });
          }
          break;
      }
    } catch (e) {
      // ignore
    }
  });

  ws.on('close', () => {
    players.delete(id);
    broadcast({ type: 'player_leave', id });
  });
});

server.listen(PORT, () => {
  console.log(`\n  🧹 Vuelo en Escoba\n`);
  console.log(`  Abrí el juego desde el navegador:\n`);
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`    http://${iface.address}:${PORT}`);
      }
    }
  }
  console.log(`    http://localhost:${PORT}\n`);
  console.log(`  (no hace falta python ni otro servidor)\n`);
});
