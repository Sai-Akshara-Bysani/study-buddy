// ── MULTIPLAYER.JS ── Real-time study room via Supabase

const SUPABASE_URL  = 'https://cohyohjabmajxwsyluwm.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvaHlvaGphYm1hanh3c3lsdXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODgzMDcsImV4cCI6MjA5NDY2NDMwN30.cKvaPvtkAWZAJ5pJJWmkWdmENCMojVRclfuzKpeeogg';

// ── Elements (Updated to target new Blookle layout containers) ──
const lobbyScreen     = document.getElementById('lobby-screen');
const mainAppContent  = document.getElementById('main-app-content');
const usernameInput   = document.getElementById('username-input');
const avatarInput     = document.getElementById('avatar-input');
const roomInput       = document.getElementById('room-input');
const joinBtn         = document.getElementById('join-btn');
const leaveBtn        = document.getElementById('leave-btn');
const roomNameDisplay = document.getElementById('room-name-display');
const friendsList     = document.getElementById('friends-list');

// ── State ──
const MY_ID  = crypto.randomUUID();
let sbClient  = null;
let channel   = null;
let myName    = '';
let myAvatar  = '';
let roomCode  = '';
let myStatus  = 'idle';

// Map of id → { name, status, avatar }
let members = {};

// ── Init Supabase ──
function initSupabase() {
  if (!sbClient) {
    const { createClient } = window.supabase;
    sbClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
  }
  return true;
}

// ── Join / Create Room ──
joinBtn.addEventListener('click', async () => {
  const name   = usernameInput.value.trim();
  const avatar = avatarInput.value.trim();
  const code   = roomInput.value.trim().toLowerCase().replace(/\s+/g, '');

  if (!name) { alert('Enter your name first!'); return; }
  if (!code) { alert('Enter a room code!'); return; }

  initSupabase();

  myName   = name;
  myAvatar = avatar;
  roomCode = code;
  joinBtn.disabled    = true;
  joinBtn.textContent = 'Joining…';

  channel = sbClient.channel(`study-room-${code}`, {
    config: { presence: { key: MY_ID } }
  });

  // ── Music broadcast — any room member can send play/pause/track events ──
  channel.on('broadcast', { event: 'music' }, ({ payload }) => {
    window.onMusicBroadcast?.(payload);
  });

  // ── Presence ──
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      members = {};
      for (const [id, presences] of Object.entries(state)) {
        const latest = presences[presences.length - 1];
        members[id] = { name: latest.name, status: latest.status || 'idle', avatar: latest.avatar || '' };
      }
      renderFriends();
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      const p = newPresences[newPresences.length - 1];
      members[key] = { name: p.name, status: p.status || 'idle', avatar: p.avatar || '' };
      renderFriends();
    })
    .on('presence', { event: 'leave' }, ({ key }) => {
      delete members[key];
      renderFriends();
    })
    .subscribe(async (status, err) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ name: myName, status: myStatus, avatar: myAvatar });
        enterRoom();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        alert(`Room connection failed (${status}). Check Realtime is enabled in your Supabase project.`);
        joinBtn.disabled    = false;
        joinBtn.textContent = 'Enter Room';
      }
    });
});

// ── Leave ──
leaveBtn.addEventListener('click', async () => {
  if (channel) {
    await channel.untrack();
    sbClient.removeChannel(channel);
    channel = null;
  }
  members = {};
  exitRoom();
});

// ── Broadcast a music event to everyone in the room ──
window.broadcastMusic = async function(payload) {
  if (!channel) return;
  await channel.send({ type: 'broadcast', event: 'music', payload });
};

// ── Broadcast status (called from timer.js) ──
window.broadcastStatus = async function(status) {
  myStatus = status;
  if (channel) {
    await channel.track({ name: myName, status, avatar: myAvatar });
    if (members[MY_ID]) members[MY_ID].status = status;
    renderFriends();
  }
};

// ── UI: enter room ──
function enterRoom() {
  // Hide the initial entry screen entirely, show full workspace app
  lobbyScreen.classList.add('hidden');
  mainAppContent.classList.remove('hidden');
  
  window.resizeTableCanvas?.();
  roomNameDisplay.textContent = `Room: ${roomCode}`;
  joinBtn.disabled    = false;
  joinBtn.textContent = 'Enter Room';
  document.getElementById('music-sync-bar')?.classList.remove('hidden');
  window.updateTableMembers?.(members);
  renderFriends();
}

// ── UI: exit room ──
function exitRoom() {
  // Hide workspace app, reveal clean lobby screen
  mainAppContent.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
  
  friendsList.innerHTML = '';
  window.setPetState?.('idle');
  window.updateTableMembers?.({});
  document.getElementById('music-sync-bar')?.classList.add('hidden');
}

// ── Render friend list ──
function renderFriends() {
  friendsList.innerHTML = '';

  const sortedKeys = Object.keys(members).sort((a, b) => {
    if (a === MY_ID) return -1;
    if (b === MY_ID) return 1;
    return 0;
  });

  window.updateTableMembers?.(members);

  if (sortedKeys.length === 0) {
    friendsList.innerHTML = '<p style="color:var(--muted);font-size:0.85rem">Waiting for friends to join…</p>';
    return;
  }

  sortedKeys.forEach(key => {
    const m    = members[key];
    const isMe = key === MY_ID;

    const row = document.createElement('div');
    row.className = 'friend-row';

    const avatar = document.createElement('div');
    avatar.className = 'friend-avatar';
    if (m.avatar) {
      const img = document.createElement('img');
      img.src = m.avatar;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
      img.onerror = () => { avatar.textContent = m.name[0].toUpperCase(); };
      avatar.appendChild(img);
    } else {
      avatar.textContent = m.name[0].toUpperCase();
      avatar.style.background = nameToColor(m.name);
    }

    const nameEl = document.createElement('span');
    nameEl.className   = 'friend-name';
    nameEl.textContent = m.name + (isMe ? ' (you)' : '');

    const statusEl = document.createElement('span');
    statusEl.className   = `friend-status ${m.status}`;
    statusEl.textContent = STATUS_LABELS[m.status] || m.status;
    if (isMe) statusEl.classList.add('you');

    row.append(avatar, nameEl, statusEl);
    friendsList.appendChild(row);
  });
}

const STATUS_LABELS = {
  idle:      '☕ Idle',
  studying: '📖 Studying',
  break:    '🌿 Break',
};

// ── Util ──
function nameToColor(name) {
  const colors = ['#7c6ef5','#52d9a0','#f472b6','#fb923c','#38bdf8','#a78bfa','#34d399','#f87171'];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}
