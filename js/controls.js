let sensorData = { forward: 0, side: 0 };
let keyboardState = { forward: 0, side: 0 };
let touchState = { forward: 0, side: 0 };
let useSensor = false;
let useTouch = false;
let isListening = false;

export function initControls() {
  const startBtn = document.getElementById('start-btn');
  const startScreen = document.getElementById('start-screen');
  const debugPanel = document.getElementById('debug-panel');

  initKeyboard();
  initTouch();

  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        try {
          const permission = await DeviceOrientationEvent.requestPermission();
          if (permission === 'granted') {
            useSensor = true;
            startGame(startScreen, debugPanel);
          } else {
            useTouch = true;
            startGame(startScreen, debugPanel);
          }
        } catch {
          useSensor = true;
          startGame(startScreen, debugPanel);
        }
      } else if ('DeviceOrientationEvent' in window) {
        useSensor = true;
        startGame(startScreen, debugPanel);
      } else {
        useTouch = true;
        startGame(startScreen, debugPanel);
      }
    });
  }
}

function startGame(screen, debugPanel) {
  screen.style.display = 'none';
  isListening = true;

  if (useSensor) {
    window.addEventListener('deviceorientation', handleOrientation);
    debugPanel.textContent = 'Sensor activado';
  } else {
    debugPanel.textContent = 'Controles táctiles activados';
  }

  setTimeout(() => {
    debugPanel.style.opacity = '0.4';
  }, 3000);
}

function handleOrientation(event) {
  if (!isListening) return;
  if (event.beta === null || event.gamma === null) return;

  let beta = event.beta;
  let gamma = event.gamma;

  if (beta > 180) beta -= 360;

  const forwardTilt = 90 - beta;
  sensorData.forward = forwardTilt;
  sensorData.side = gamma;

  const debugPanel = document.getElementById('debug-panel');
  if (debugPanel) {
    debugPanel.innerHTML = `F: ${forwardTilt.toFixed(1)}°  L: ${(-gamma).toFixed(1)}°`;
  }
}

function initKeyboard() {
  const keys = {};

  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    updateKeyboard(keys);
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    updateKeyboard(keys);
  });
}

function updateKeyboard(keys) {
  let forward = 0;
  let side = 0;

  if (keys['w'] || keys['arrowup']) forward = 1;
  else if (keys['s'] || keys['arrowdown']) forward = -1;

  if (keys['a'] || keys['arrowleft']) side = -1;
  else if (keys['d'] || keys['arrowright']) side = 1;

  keyboardState.forward = forward * 45;
  keyboardState.side = side * 45;
}

function initTouch() {
  const container = document.getElementById('game-container') || document.body;
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouching = false;

  container.addEventListener('touchstart', (e) => {
    isTouching = true;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchState.forward = 0;
    touchState.side = 0;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isTouching) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    const screenW = window.innerWidth;
    const sensitivity = 0.4;

    touchState.side = Math.max(-45, Math.min(45, (dx / screenW) * 90 * sensitivity));
    touchState.forward = Math.max(-45, Math.min(45, (-dy / screenW) * 90 * sensitivity));
  }, { passive: true });

  container.addEventListener('touchend', () => {
    isTouching = false;
    touchState.forward = 0;
    touchState.side = 0;
  }, { passive: true });
}

export function getControls() {
  if (!isListening) return { forward: 0, side: 0 };

  const kFwd = keyboardState.forward;
  const kSide = keyboardState.side;

  if (kFwd !== 0 || kSide !== 0) {
    return { forward: kFwd, side: kSide };
  }

  if (useSensor) return sensorData;

  if (touchState.forward !== 0 || touchState.side !== 0) {
    return { forward: touchState.forward, side: touchState.side };
  }

  return { forward: 0, side: 0 };
}

export function isUsingSensor() {
  return useSensor;
}
