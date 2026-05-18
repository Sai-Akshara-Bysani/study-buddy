// ── MULTIPLAYER.JS ── Real-time study room via Supabase
//
// SETUP REQUIRED — replace these two lines with your own Supabase project values.
// Get them from: https://app.supabase.com → Settings → API
// The anon key is safe to expose in frontend code.
//
const SUPABASE_URL  = 'https://cohyohjabmajxwsyluwm.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvaHlvaGphYm1hanh3c3lsdXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODgzMDcsImV4cCI6MjA5NDY2NDMwN30.cKvaPvtkAWZAJ5pJJWmkWdmENCMojVRclfuzKpeeogg';

// ── Elements ──
const joinForm         = document.getElementById('join-form');
const roomStatus       = document.getElementById('room-status');
const usernameInput    = document.getElementById('username-input');
const roomInput        = document.getElementById('room-input');
const joinBtn          = document.getElementById('join-btn');
const leaveBtn         = document.getElementById('leave-btn');
const roomNameDisplay  = document.getElementById('room-name-display');
const friendsList      = document.getElementById('friends-list');

// ── State ──
// Each browser tab gets a unique ID so two people with the same name don't collide
const MY_ID  = crypto.randomUUID();
let sbClient = null;
let channel  = null;
let myName   = '';
let roomCode = '';
let myStatus = 'idle';

// Map of id → { name, status }
let members = {};

// ── Init Supabase (once, at top level) ──
function initSupabase() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.warn('[StudyBuddy] Add your Supabase credentials in multiplayer.js to enable rooms.');
    return false;
  }
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
  const name = usernameInput.value.trim();
  const code = roomInput.value.trim().toLowerCase().replace(/\s+/g, '');

  if (!name) { alert('Enter your name first!'); return; }
  if (!code)  { alert('Enter a room code!'); return; }

  if (!initSupabase()) {
    enterDemoMode(name, code);
    return;
  }

  myName   = name;
  roomCode = code;
  joinBtn.disabled    = true;
  joinBtn.textContent = 'Joining…';

  // Use MY_ID (not the name) as the presence key — unique per browser tab
  channel = sbClient.channel(`study-room-${code}`, {
    config: { presence: { key: MY_ID } }
  });

  // ── Presence callbacks ──
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      members = {};
      for (const [id, presences] of Object.entries(state)) {
        const latest = presences[presences.length - 1];
        members[id] = { name: latest.name, status: latest.status || 'idle' };
      }
      renderFriends();
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      const p = newPresences[newPresences.length - 1];
      members[key] = { name: p.name, status: p.status || 'idle' };
      renderFriends();
    })
    .on('presence', { event: 'leave' }, ({ key }) => {
      delete members[key];
      renderFriends();
    })
    .subscribe(async (status, err) => {
      console.log('[StudyBuddy] channel status:', status, err || '');
      if (status === 'SUBSCRIBED') {
        await channel.track({ name: myName, status: myStatus });
        enterRoom();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('[StudyBuddy] Connection failed:', err);
        alert(`Room connection failed (${status}). Check that Realtime is enabled in your Supabase project:\nSupabase dashboard → Project Settings → API → Realtime: ON`);
        joinBtn.disabled    = false;
        joinBtn.textContent = 'Join / Create';
      }
    });
});

// ── Leave Room ──
leaveBtn.addEventListener('click', async () => {
  if (channel) {
    await channel.untrack();
    sbClient.removeChannel(channel);
    channel = null;
  }
  members = {};
  exitRoom();
});

// ── UI: enter room view ──
function enterRoom() {
  joinForm.classList.add('hidden');
  roomStatus.classList.remove('hidden');
  
  // FIX: Force the canvas to recalculate dimensions now that it's visible!
  window.resizeTableCanvas?.();
  
  roomNameDisplay.textContent = `Room: ${roomCode}`;
  joinBtn.disabled    = false;
  joinBtn.textContent = 'Join / Create';
  renderFriends();
}

// ── UI: exit room view ──
function exitRoom() {
  roomStatus.classList.add('hidden');
  joinForm.classList.remove('hidden');
  friendsList.innerHTML = '';
  window.setPetState?.('idle');
  window.updateTableMembers?.({});
}

// ── Render friend list ──
function renderFriends() {
  friendsList.innerHTML = '';

  const sortedKeys = Object.keys(members).sort((a, b) => {
    if (a === MY_ID) return -1;
    if (b === MY_ID) return 1;
    return 0;
  });

  // Always sync the table with current members
  window.updateTableMembers?.(members);

  if (sortedKeys.length === 0) {
    friendsList.innerHTML = '<p style="color:var(--muted);font-size:0.85rem">Waiting for friends to join…</p>';
    return;
  }

  sortedKeys.forEach(key => {
    const m    = members[key];
    const isMe = key === MY_ID;

    const row    = document.createElement('div');
    row.className = 'friend-row';

    const avatar = document.createElement('div');
    avatar.className = 'friend-avatar';
    avatar.textContent = m.name[0].toUpperCase();
    avatar.style.background = nameToColor(m.name);

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
  idle:     '☕ Idle',
  studying: '📖 Studying',
  break:    '🌿 Break',
};

// ── Broadcast status (called from timer.js) ──
window.broadcastStatus = async function(status) {
  myStatus = status;
  if (channel) {
    await channel.track({ name: myName, status });
    // Update local copy immediately for responsiveness
    if (members[MY_ID]) members[MY_ID].status = status;
    renderFriends();
  }
};

// ── Demo mode (no Supabase configured) ──
function enterDemoMode(name, code) {
  myName   = name;
  roomCode = code;
  members[MY_ID] = { name, status: 'idle' };
  enterRoom();
  // Simulate a friend joining after 3s in demo
  setTimeout(() => {
    members['demo-friend'] = { name: 'Demo Friend', status: 'studying' };
    renderFriends();
  }, 3000);
}

// ── Util: consistent color per username ──
function nameToColor(name) {
  const colors = [
    '#7c6ef5', '#52d9a0', '#f472b6', '#fb923c',
    '#38bdf8', '#a78bfa', '#34d399', '#f87171',
  ];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}
