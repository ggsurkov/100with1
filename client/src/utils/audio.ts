const MUTE_STORAGE_KEY = 'audioMuted';

const revealSound = new Audio('/sounds/reveal.wav');
const timerMusic = new Audio('/sounds/timer.wav');
timerMusic.loop = true;

function isMuted(): boolean {
  return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
}

revealSound.muted = isMuted();
timerMusic.muted = isMuted();

export function toggleMute(): boolean {
  const next = !isMuted();
  localStorage.setItem(MUTE_STORAGE_KEY, String(next));
  revealSound.muted = next;
  timerMusic.muted = next;
  return next;
}

export { isMuted };

function handlePlayError(error: any) {
  if (error?.name === 'NotAllowedError') {
    console.warn('[Audio] Play blocked by browser Autoplay policy. User gesture required.');
  } else {
    console.error('[Audio] Playback failed:', error);
  }
}

export function playRevealSound() {
  revealSound.currentTime = 0;
  console.log('[Audio] Playing reveal sound...');
  revealSound.play().catch(handlePlayError);
}

export function startTimerMusic() {
  timerMusic.currentTime = 0;
  console.log('[Audio] Starting timer music...');
  timerMusic.play().catch(handlePlayError);
}

export function stopTimerMusic() {
  console.log('[Audio] Stopping timer music...');
  timerMusic.pause();
  timerMusic.currentTime = 0;
}

// Test/unlock: plays reveal.wav for real, so the host both hears a test
// beep and satisfies the browser's user-gesture requirement for autoplay.
export function playTestSound() {
  playRevealSound();
}

// Chrome (and most browsers) block audio.play() until a user gesture has
// occurred on the page. Play-then-immediately-pause both clips on the first
// click/keydown anywhere so later programmatic play() calls (reveal SFX,
// timer music) aren't silently blocked mid-game.
function unlockAudio() {
  [revealSound, timerMusic].forEach((audio) => {
    audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => {});
  });
  console.log('[Audio] Unlocked via user gesture');
}

window.addEventListener('click', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });
