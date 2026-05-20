// ── MUSIC.JS ── Collaborative Synced Vintage Vinyl Player via IFrame API + Supabase

const PRESETS = [
  { id: 'jfKfPfyJRdk', label: 'Lofi Girl ☕' }, // Standard video
  { id: 'tNtIsoE9S1s', label: 'Synthwave 🌃' }, // Standard video
  { id: '5wRWniH7sh8', label: 'Jazz Hop 🎷' }  // Standard video
];

let queue       = PRESETS.map(p => p.id);
let queueIndex = 0;
let ytPlayer   = null;
let playerReady = false;
let pendingLoad = null; 

// ── Elements ──
const trackBtns  = document.querySelectorAll('.track-btn');
const ytUrlInput = document.getElementById('yt-url-input');
const ytQueueBtn = document.getElementById('yt-queue-btn');
const playBtn    = document.getElementById('music-play-btn');
const pauseBtn   = document.getElementById('music-pause-btn');
const skipBtn    = document.getElementById('music-skip-btn');
const queueEl    = document.getElementById('music-queue');
const syncLabel  = document.getElementById('music-sync-label');

// ── Vinyl Animation Elements ──
const disc     = document.getElementById('vinyl-disc');
const tonearm  = document.getElementById('tonearm');
const labelBadge = document.getElementById('vinyl-track-badge');

function updateVinylVisuals(isPlaying) {
  if (!disc || !tonearm) return;
  if (isPlaying) {
    tonearm.classList.remove('retracted');
    tonearm.classList.add('engaged');
    // Tiny delay to let needle land before turntable spins up
    setTimeout(() => {
      disc.classList.remove('stopped');
      disc.classList.add('spinning');
    }, 150);
  } else {
    disc.classList.remove('spinning');
    disc.classList.add('stopped');
    tonearm.classList.remove('engaged');
    tonearm.classList.add('retracted');
  }
}

function extractVideoId(input) {
  input = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('?')[0];
    return url.searchParams.get('v') || null;
  } catch { return null; }
}

// ── YouTube IFrame API Ready Initialization Block ──
window.onYouTubeIframeAPIReady = function() {
  ytPlayer = new YT.Player('yt-player', {
    height: '60',
    width: '200',
    videoId: queue[0],
    playerVars: { 
      autoplay: 0, 
      controls: 0, 
      rel: 0, 
      modestbranding: 1,
      disablekb: 1,
      origin: window.location.origin
    },
    events: {
      onReady() {
        playerReady = true;
        ytPlayer.setVolume(80); // 🌟 Ensure the player isn't initializing muted by default!
        
        if (pendingLoad) {
          ytPlayer.loadVideoById({ videoId: pendingLoad.videoId, startSeconds: pendingLoad.seconds });
          pendingLoad = null;
        }
      },
      onStateChange(e) {
        if (e.data === YT.PlayerState.ENDED) {
          advanceQueue();
          window.broadcastMusic?.({ action: 'load', videoId: queue[queueIndex], seconds: 0, isPlaying: true });
        }
        
        // Apply or remove vinyl record spinning classes instantly
        if (e.data === YT.PlayerState.PLAYING) updateVinylVisuals(true);
        if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.BUFFERING) {
          if (e.data === YT.PlayerState.PAUSED) updateVinylVisuals(false);
        }
      }
    }
  });
};

function loadVideo(videoId, startSeconds = 0, autoPlay = false) {
  if (labelBadge) {
    const preset = PRESETS.find(p => p.id === videoId);
    labelBadge.textContent = preset ? preset.label.slice(0, 10) : 'Custom Vinyl';
  }
  if (!playerReady) { pendingLoad = { videoId, startSeconds }; return; }
  
  if (autoPlay) {
    ytPlayer.loadVideoById({ videoId, startSeconds });
    updateVinylVisuals(true);
  } else {
    ytPlayer.cueVideoById({ videoId, startSeconds });
    updateVinylVisuals(false);
  }
}

function advanceQueue() {
  if (!queue.length) return;
  queueIndex = (queueIndex + 1) % queue.length;
  loadVideo(queue[queueIndex], 0, true);
  renderQueue();
}

// Track buttons setup
trackBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const videoId = btn.dataset.id;
    trackBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (!queue.includes(videoId)) queue.unshift(videoId);
    queueIndex = queue.indexOf(videoId);
    loadVideo(videoId, 0, true);
    renderQueue();
    window.broadcastMusic?.({ action: 'load', videoId, seconds: 0, isPlaying: true });
  });
});

ytQueueBtn.addEventListener('click', () => {
  const videoId = extractVideoId(ytUrlInput.value);
  if (!videoId) { alert('Paste a valid YouTube link or ID.'); return; }
  ytUrlInput.value = '';

  if (!queue.includes(videoId)) queue.push(videoId);
  renderQueue();

  const state = playerReady ? ytPlayer.getPlayerState() : -1;
  if (state === -1 || state === YT.PlayerState.ENDED) {
    queueIndex = queue.indexOf(videoId);
    loadVideo(videoId, 0, true);
    window.broadcastMusic?.({ action: 'load', videoId, seconds: 0, isPlaying: true });
  } else {
    window.broadcastMusic?.({ action: 'queue', videoId });
  }
});

// Room button trigger overrides mapping realtime signals out to friends
playBtn.addEventListener('click', () => {
  ytPlayer?.playVideo();
  const seconds = ytPlayer?.getCurrentTime?.() || 0;
  updateVinylVisuals(true);
  window.broadcastMusic?.({ action: 'play', videoId: queue[queueIndex], seconds });
});

pauseBtn.addEventListener('click', () => {
  ytPlayer?.pauseVideo();
  updateVinylVisuals(false);
  window.broadcastMusic?.({ action: 'pause' });
});

skipBtn.addEventListener('click', () => {
  advanceQueue();
  window.broadcastMusic?.({ action: 'load', videoId: queue[queueIndex], seconds: 0, isPlaying: true });
});

// ── BROADCAST BACKPLANE LISTENER ── Handles real-time cross-device sync
window.onMusicBroadcast = function({ action, videoId, seconds = 0, isPlaying = false }) {
  switch (action) {
    case 'load':
      if (videoId && !queue.includes(videoId)) queue.push(videoId);
      if (videoId) queueIndex = queue.indexOf(videoId);
      loadVideo(videoId, seconds, isPlaying);
      renderQueue();
      if (syncLabel) syncLabel.textContent = '🎵 Playing Track';
      break;
    case 'play':
      if (playerReady) {
        if (videoId && queue[queueIndex] !== videoId) {
          queueIndex = queue.indexOf(videoId) >= 0 ? queue.indexOf(videoId) : queueIndex;
          loadVideo(videoId, seconds, true);
        } else {
          ytPlayer.seekTo(seconds, true);
          ytPlayer.playVideo();
        }
        updateVinylVisuals(true);
      }
      if (syncLabel) syncLabel.textContent = '▶ Record Spinning';
      break;
    case 'pause':
      ytPlayer?.pauseVideo();
      updateVinylVisuals(false);
      if (syncLabel) syncLabel.textContent = '⏸ Needle Lifted';
      break;
    case 'queue':
      if (videoId && !queue.includes(videoId)) {
        queue.push(videoId);
        renderQueue();
      }
      break;
  }
};

function renderQueue() {
  queueEl.innerHTML = '';
  if (!queue.length) return;

  const header = document.createElement('p');
  header.style.cssText = "font-family:'Courier New',monospace; font-size:0.8rem; color:#1e2025; margin-bottom:6px; font-weight:bold;";
  header.textContent = 'Tracklist Queue:';
  queueEl.appendChild(header);

  queue.forEach((id, i) => {
    const preset = PRESETS.find(p => p.id === id);
    const isNow  = i === queueIndex;

    const item = document.createElement('div');
    item.style.cssText = `
      display:flex; align-items:center; gap:8px;
      background:#ffffff; border:2px solid #1e2025;
      border-radius:4px; padding:4px 8px; font-size:0.8rem; margin-bottom:4px;
      box-shadow: ${isNow ? '2px 2px 0px #1e2025' : '1px 1px 0px #1e2025'};
      background: ${isNow ? '#fffdf3' : '#fff'};
    `;

    const label = document.createElement('span');
    label.style.cssText = `flex:1; font-family:'Courier New',monospace; font-weight:bold; color:#1e2025;`;
    label.textContent = (isNow ? '💽 ' : '') + (preset ? preset.label : `Custom Rec (${id.slice(0,5)})`);

    const playNow = document.createElement('button');
    playNow.style.padding = '2px 6px';
    playNow.textContent = '▶';
    playNow.onclick = () => {
      queueIndex = i;
      loadVideo(id, 0, true);
      renderQueue();
      window.broadcastMusic?.({ action: 'load', videoId: id, seconds: 0, isPlaying: true });
    };

    const remove = document.createElement('button');
    remove.style.padding = '2px 6px';
    remove.textContent = '✕';
    remove.style.color = '#f46e6e';
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
