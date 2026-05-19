// ── MUSIC.JS ── Synced YouTube player via IFrame API + Supabase broadcast

const PRESETS = [
  { id: 'jfKfPfyJRdk', label: 'Lofi Girl ☕' },
  { id: '4xDzrJKXOOY', label: 'Synthwave 🌃' },
  { id: 'lTRiuFIWV54', label: 'Jazz Hop 🎷' },
];

let queue      = PRESETS.map(p => p.id);
let queueIndex = 0;
let ytPlayer   = null;
let playerReady = false;
let pendingLoad = null; // { videoId, seconds } to apply once player is ready

// ── Elements ──
const trackBtns  = document.querySelectorAll('.track-btn');
const ytUrlInput = document.getElementById('yt-url-input');
const ytQueueBtn = document.getElementById('yt-queue-btn');
const playBtn    = document.getElementById('music-play-btn');
const pauseBtn   = document.getElementById('music-pause-btn');
const skipBtn    = document.getElementById('music-skip-btn');
const queueEl   = document.getElementById('music-queue');
const syncLabel  = document.getElementById('music-sync-label');

// ── Extract video ID from a YouTube URL or bare ID ──
function extractVideoId(input) {
  input = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('?')[0];
    return url.searchParams.get('v') || null;
  } catch { return null; }
}

// ── YouTube IFrame API ready (called automatically by the API script) ──
window.onYouTubeIframeAPIReady = function() {
  ytPlayer = new YT.Player('yt-player', {
    height: '80',
    width: '100%',
    videoId: queue[0],
    playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
    events: {
      onReady() {
        playerReady = true;
        if (pendingLoad) {
          ytPlayer.loadVideoById({ videoId: pendingLoad.videoId, startSeconds: pendingLoad.seconds });
          pendingLoad = null;
        }
      },
      onStateChange(e) {
        // Auto-advance when video ends
        if (e.data === YT.PlayerState.ENDED) advanceQueue();
      }
    }
  });
};

function loadVideo(videoId, startSeconds = 0) {
  if (!playerReady) { pendingLoad = { videoId, startSeconds }; return; }
  ytPlayer.loadVideoById({ videoId, startSeconds });
}

function advanceQueue() {
  if (!queue.length) return;
  queueIndex = (queueIndex + 1) % queue.length;
  loadVideo(queue[queueIndex]);
  renderQueue();
}

// ── Preset track buttons ──
trackBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const videoId = btn.dataset.id;
    trackBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (!queue.includes(videoId)) queue.unshift(videoId);
    queueIndex = queue.indexOf(videoId);
    loadVideo(videoId);
    renderQueue();
    window.broadcastMusic?.({ action: 'load', videoId, seconds: 0 });
  });
});

// ── Add a YouTube URL to the queue ──
ytQueueBtn.addEventListener('click', () => {
  const videoId = extractVideoId(ytUrlInput.value);
  if (!videoId) { alert('Paste a YouTube URL or video ID.'); return; }
  ytUrlInput.value = '';

  if (!queue.includes(videoId)) queue.push(videoId);
  renderQueue();

  const state = playerReady ? ytPlayer.getPlayerState() : -1;
  if (state === -1 || state === YT.PlayerState.ENDED) {
    queueIndex = queue.indexOf(videoId);
    loadVideo(videoId);
    window.broadcastMusic?.({ action: 'load', videoId, seconds: 0 });
  } else {
    window.broadcastMusic?.({ action: 'queue', videoId });
  }
});

// ── Room sync controls ──
playBtn.addEventListener('click', () => {
  ytPlayer?.playVideo();
  const seconds = ytPlayer?.getCurrentTime?.() || 0;
  window.broadcastMusic?.({ action: 'play', videoId: queue[queueIndex], seconds });
});

pauseBtn.addEventListener('click', () => {
  ytPlayer?.pauseVideo();
  window.broadcastMusic?.({ action: 'pause' });
});

skipBtn.addEventListener('click', () => {
  advanceQueue();
  window.broadcastMusic?.({ action: 'load', videoId: queue[queueIndex], seconds: 0 });
});

// ── Receive broadcast events from other room members ──
window.onMusicBroadcast = function({ action, videoId, seconds = 0 }) {
  switch (action) {
    case 'load':
      if (videoId && !queue.includes(videoId)) queue.push(videoId);
      if (videoId) queueIndex = queue.indexOf(videoId);
      loadVideo(videoId, seconds);
      renderQueue();
      if (syncLabel) syncLabel.textContent = '🎵 Synced track';
      break;
    case 'play':
      if (playerReady) {
        if (videoId && queue[queueIndex] !== videoId) {
          queueIndex = queue.indexOf(videoId) >= 0 ? queue.indexOf(videoId) : queueIndex;
          loadVideo(videoId, seconds);
        } else {
          ytPlayer.seekTo(seconds, true);
          ytPlayer.playVideo();
        }
      }
      break;
    case 'pause':
      ytPlayer?.pauseVideo();
      break;
    case 'queue':
      if (videoId && !queue.includes(videoId)) {
        queue.push(videoId);
        renderQueue();
      }
      break;
  }
};

// ── Render queue ──
function renderQueue() {
  queueEl.innerHTML = '';
  if (!queue.length) return;

  const header = document.createElement('p');
  header.style.cssText = 'font-size:0.8rem;color:var(--muted);margin-bottom:4px;font-weight:600;';
  header.textContent = 'Queue';
  queueEl.appendChild(header);

  queue.forEach((id, i) => {
    const preset = PRESETS.find(p => p.id === id);
    const isNow  = i === queueIndex;

    const item = document.createElement('div');
    item.style.cssText = `
      display:flex; align-items:center; gap:8px;
      background:var(--surface2); border:1px solid var(--border);
      border-radius:8px; padding:6px 12px; font-size:0.82rem;
      ${isNow ? 'border-color:var(--accent);' : ''}
    `;

    const label = document.createElement('span');
    label.style.cssText = `flex:1; color:${isNow ? 'var(--accent)' : 'var(--muted)'};`;
    label.textContent = (isNow ? '▶ ' : '') + (preset ? preset.label : `youtu.be/${id}`);

    const playNow = document.createElement('button');
    playNow.className = 'small';
    playNow.textContent = '▶';
    playNow.title = 'Play now';
    playNow.onclick = () => {
      queueIndex = i;
      loadVideo(id);
      renderQueue();
      window.broadcastMusic?.({ action: 'load', videoId: id, seconds: 0 });
    };

    const remove = document.createElement('button');
    remove.className = 'small';
    remove.textContent = '✕';
    remove.style.color = 'var(--danger)';
    remove.title = 'Remove';
    remove.onclick = () => {
      queue.splice(i, 1);
      if (queueIndex >= queue.length) queueIndex = Math.max(0, queue.length - 1);
      renderQueue();
    };

    item.append(label, playNow, remove);
    queueEl.appendChild(item);
  });
}

renderQueue();
