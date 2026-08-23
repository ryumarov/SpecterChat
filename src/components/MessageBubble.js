import { openImagePreview } from './ImagePreview.js';

const PLAY_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>';
const PAUSE_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="5" height="18" rx="1"></rect><rect x="14" y="3" width="5" height="18" rx="1"></rect></svg>';

function fmtDuration(s) {
  s = Math.max(0, Math.round(s || 0));
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

// A compact, messenger-style voice bubble: play/pause button, a scrubbable
// progress track (with a static waveform-like bar pattern underneath it so
// it doesn't read as a bare slider), and a duration label that switches
// between the total length and live elapsed time while playing.
function createVoiceBubble(msg, isOutgoing) {
  const wrap = document.createElement('div');
  wrap.className = `message-audio ${isOutgoing ? 'outgoing' : 'incoming'}`;

  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'voice-play-btn';
  playBtn.setAttribute('aria-label', 'Play voice message');
  playBtn.innerHTML = PLAY_ICON;

  const body = document.createElement('div');
  body.className = 'voice-body';

  const track = document.createElement('div');
  track.className = 'voice-track';

  // Static waveform bars purely for visual texture — heights are seeded
  // deterministically from the message id so the same message always
  // renders the same "shape" instead of looking random on every re-render.
  const waveform = document.createElement('div');
  waveform.className = 'voice-waveform';
  const seed = String(msg.id || msg.createdAt || '1');
  let seedNum = 0;
  for (let i = 0; i < seed.length; i++) seedNum = (seedNum * 31 + seed.charCodeAt(i)) >>> 0;
  const barCount = 28;
  for (let i = 0; i < barCount; i++) {
    seedNum = (seedNum * 1103515245 + 12345) >>> 0;
    const h = 20 + (seedNum % 100) * 0.6; // 20%–80% height
    const bar = document.createElement('div');
    bar.className = 'voice-bar';
    bar.style.height = `${h}%`;
    waveform.appendChild(bar);
  }

  const progressFill = document.createElement('div');
  progressFill.className = 'voice-progress-fill';

  const scrubber = document.createElement('div');
  scrubber.className = 'voice-scrubber';

  track.appendChild(waveform);
  track.appendChild(progressFill);
  track.appendChild(scrubber);

  const timeLabel = document.createElement('div');
  timeLabel.className = 'voice-time';
  const totalDuration = msg.duration || 0;
  timeLabel.textContent = fmtDuration(totalDuration);

  body.appendChild(track);
  body.appendChild(timeLabel);

  wrap.appendChild(playBtn);
  wrap.appendChild(body);

  let audio = null;
  let isPlaying = false;
  let rafId = null;

  function setProgress(ratio) {
    ratio = Math.max(0, Math.min(1, ratio));
    progressFill.style.width = `${ratio * 100}%`;
    scrubber.style.left = `${ratio * 100}%`;
  }

  function tick() {
    if (!audio) return;
    const dur = audio.duration || totalDuration || 1;
    setProgress(audio.currentTime / dur);
    timeLabel.textContent = fmtDuration(audio.currentTime);
    rafId = requestAnimationFrame(tick);
  }

  function stopVisualPlaying() {
    isPlaying = false;
    wrap.classList.remove('playing');
    playBtn.innerHTML = PLAY_ICON;
    playBtn.setAttribute('aria-label', 'Play voice message');
    if (rafId) cancelAnimationFrame(rafId);
  }

  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio(msg.audioUrl);
    audio.addEventListener('ended', () => {
      stopVisualPlaying();
      setProgress(0);
      timeLabel.textContent = fmtDuration(totalDuration);
    });
    return audio;
  }

  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    ensureAudio();
    if (isPlaying) {
      audio.pause();
      stopVisualPlaying();
    } else {
      audio.play().catch(err => console.error('Audio playback error:', err));
      isPlaying = true;
      wrap.classList.add('playing');
      playBtn.innerHTML = PAUSE_ICON;
      playBtn.setAttribute('aria-label', 'Pause voice message');
      rafId = requestAnimationFrame(tick);
    }
  });

  // Tap/click anywhere on the track to seek.
  track.addEventListener('click', (e) => {
    e.stopPropagation();
    ensureAudio();
    const rect = track.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const dur = audio.duration || totalDuration || 0;
    if (dur > 0) audio.currentTime = ratio * dur;
    setProgress(ratio);
    if (!isPlaying) {
      audio.play().catch(err => console.error('Audio playback error:', err));
      isPlaying = true;
      wrap.classList.add('playing');
      playBtn.innerHTML = PAUSE_ICON;
      rafId = requestAnimationFrame(tick);
    }
  });

  return wrap;
}

export function createMessageBubble(msg, isOutgoing, handlers = {}) {
  // Back-compat: earlier callers passed a bare onReply function as the 3rd
  // argument. Accept both shapes.
  if (typeof handlers === 'function') handlers = { onReply: handlers };
  const { onReply, onContextMenu, isSelectMode, isSelected, onToggleSelect } = handlers;

  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`;
  if (isSelected && isSelected(msg.id)) wrapper.classList.add('selected');

  // Selection checkbox — only visible while the messages area has the
  // 'select-mode' class (see styles/chat.css), but always present in the
  // DOM so toggling select mode never has to rebuild bubbles.
  const selectCheck = document.createElement('div');
  selectCheck.className = 'msg-select-check';
  selectCheck.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  wrapper.appendChild(selectCheck);

  // In select mode, any click on the message toggles selection instead of
  // running its normal action (open image, play audio, reply). Registered
  // on the capture phase so it intercepts before the image/audio bubbles'
  // own click handlers (added in the bubbling phase) ever run.
  wrapper.addEventListener('click', (e) => {
    if (isSelectMode && isSelectMode()) {
      e.preventDefault();
      e.stopPropagation();
      if (onToggleSelect) onToggleSelect(msg.id);
    }
  }, true);

  // Double tap to reply (iOS style) or context menu. We'll use double click for simplicity on desktop, and a simple tap & hold for mobile isn't trivial without libraries, so we just use dblclick.
  wrapper.addEventListener('dblclick', () => {
    if (isSelectMode && isSelectMode()) return;
    if (onReply) onReply(msg);
  });

  // Custom right-click menu (Reply / Delete) — stopPropagation so the
  // site-wide "block the native context menu" listener in main.js never
  // has to do anything but see this event already handled.
  wrapper.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSelectMode && isSelectMode()) return;
    if (onContextMenu) onContextMenu(msg, e);
  });

  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;
  
  // Reply preview
  if (msg.replyTo) {
    const replyEl = document.createElement('div');
    replyEl.className = 'bubble-reply';
    
    const replyName = document.createElement('div');
    replyName.className = 'bubble-reply-name';
    replyName.textContent = msg.replyTo.senderName || 'User';
    
    const replyText = document.createElement('div');
    replyText.className = 'bubble-reply-text';
    replyText.textContent = msg.replyTo.text || 'Media message';
    
    replyEl.appendChild(replyName);
    replyEl.appendChild(replyText);
    bubble.appendChild(replyEl);
  }

  // Main content
  if (msg.type === 'image' || msg.imageUrl) {
    const img = document.createElement('img');
    img.className = 'message-image';
    img.src = msg.imageUrl;
    img.loading = 'lazy';
    img.alt = 'Image message';
    // Tap the compact thumbnail to open a large, centered preview that
    // keeps the original aspect ratio. Stop propagation so this single
    // tap never gets mistaken for the wrapper's double-tap-to-reply.
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openImagePreview(msg.imageUrl);
    });
    bubble.appendChild(img);
  } else if (msg.type === 'audio' || msg.audioUrl) {
    bubble.appendChild(createVoiceBubble(msg, isOutgoing));
  } else {
    // Default to text
    const text = document.createElement('div');
    text.className = 'message-text';
    text.textContent = msg.text || msg.Message || '...';
    bubble.appendChild(text);
  }
  
  const time = document.createElement('div');
  time.className = 'message-time';
  
  const date = new Date(msg.createdAt);
  time.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  
  wrapper.appendChild(bubble);
  wrapper.appendChild(time);
  
  return wrapper;
}
