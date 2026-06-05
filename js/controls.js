let keyboardState = { forward: 0, side: 0, vertical: 0 };
let isListening = false;

export function initControls() {
  const startBtn = document.getElementById('start-btn');
  const startScreen = document.getElementById('start-screen');

  initKeyboard();

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      startScreen.style.display = 'none';
      isListening = true;
    });
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
  let vertical = 0;

  if (keys['arrowup']) forward = 1;
  else if (keys['arrowdown']) forward = -1;

  if (keys['arrowleft']) side = -1;
  else if (keys['arrowright']) side = 1;

  if (keys['w']) vertical = 1;
  else if (keys['s']) vertical = -1;

  keyboardState.forward = forward * 40;
  keyboardState.side = side * 40;
  keyboardState.vertical = vertical;
}

export function getControls() {
  if (!isListening) return { forward: 0, side: 0, vertical: 0 };
  return { ...keyboardState };
}
