// ── TABLE.JS ── Animated study room table visualization

const canvas = document.getElementById('table-canvas');
const ctx = canvas.getContext('2d');
const W = 540, H = 380;

// This function forces the canvas to recalculate its bounds when visible
window.resizeTableCanvas = function() {
  const container = canvas.parentElement;
  if (!container) return;
  const currentWidth = container.clientWidth || W;
  canvas.width = currentWidth;
  canvas.height = H;
  canvas.style.width = '100%';
  canvas.style.height = H + 'px';
};

window.resizeTableCanvas();

const PALETTE      = ['#7c6ef5','#52d9a0','#f472b6','#fb923c','#38bdf8','#a78bfa','#34d399','#f87171'];
const STATUS_COLOR = { idle: '#7c6ef5', studying: '#52d9a0', break: '#f5c842' };
const STATUS_LABEL = { idle: 'idle', studying: 'studying', break: 'break' };

const SEATS = [
  { x: 270, y: 60,  side: 'top' },
  { x: 148, y: 108, side: 'top' },
  { x: 392, y: 108, side: 'top' },
  { x: 78,  y: 195, side: 'left' },
  { x: 462, y: 195, side: 'right' },
  { x: 148, y: 282, side: 'bottom' },
  { x: 392, y: 282, side: 'bottom' },
  { x: 270, y: 328, side: 'bottom' },
];

function nameColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

// ── Avatar image cache ──
const imgCache = {};

function loadAvatar(url) {
  if (!url) return null;
  if (imgCache[url]) return imgCache[url];
  const img = new Image();
  img.crossOrigin = 'anonymous'; // works when the image host allows it
  img.src = url;
  imgCache[url] = img;
  return img;
}

// Draw a circular clipped avatar image, or fall back to colored circle + initial
function drawHead(x, y, r, img, color, initial) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  } else {
    // Fallback: solid color fill (eyes/smile drawn separately below)
    ctx.fillStyle = color;
    ctx.fill();
  }

  ctx.restore();

  // Colored ring
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.stroke();
}

let seated = [];
let frame  = 0;

function setMembers(memberObj) {
  if (!memberObj) { seated = []; return; }

  const list = Array.isArray(memberObj) ? memberObj : Object.values(memberObj);

  // Preserve bobbing phase per name so it doesn't reset on every presence update
  const oldPhase = {};
  seated.forEach(s => { oldPhase[s.name] = s.phase; });

  seated = list
    .filter(m => m && m.name)
    .map((m, i) => {
      let cleanStatus = 'idle';
      const rawStatus = String(m.status || '').toLowerCase();
      if (rawStatus.includes('study') || rawStatus.includes('📖')) cleanStatus = 'studying';
      else if (rawStatus.includes('break') || rawStatus.includes('🌿')) cleanStatus = 'break';

      return {
        name:      m.name,
        status:    cleanStatus,
        seat:      SEATS[i % SEATS.length],
        color:     nameColor(m.name),
        phase:     oldPhase[m.name] ?? Math.random() * Math.PI * 2,
        avatarImg: m.avatar ? loadAvatar(m.avatar) : null,
      };
    });
}

function draw() {
  frame++;
  const t = frame / 60;

  const centerX = canvas.width  / 2;
  const centerY = canvas.height / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Table surface
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur  = 20;
  ctx.fillStyle   = '#23273a';
  ctx.strokeStyle = '#3c4260';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, 168, 96, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.restore();

  // Wood grain rings
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth   = 1;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 155 + i*5, 86 + i*3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (seated.length === 0) {
    ctx.fillStyle    = '#7a80a0';
    ctx.font         = '500 13px system-ui';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Waiting for friends…', centerX, centerY);
  }

  seated.forEach((m, i) => {
    const standardSeat = SEATS[i % SEATS.length];
    const x    = centerX + (standardSeat.x - 270);
    const y    = centerY + (standardSeat.y - 195);
    const side = standardSeat.side;

    const bob   = Math.sin(t * 1.8 + m.phase) * 3;
    const sc    = STATUS_COLOR[m.status] || '#7c6ef5';
    const charY = y + (side === 'top' ? -10 + bob : side === 'bottom' ? 10 + bob : bob);

    const hasAvatar = m.avatarImg && m.avatarImg.complete && m.avatarImg.naturalWidth > 0;

    // Chair cushion
    ctx.fillStyle   = '#2a2e3e';
    ctx.strokeStyle = '#3c4260';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    if (side === 'top' || side === 'bottom') {
      ctx.ellipse(x, y + (side === 'top' ? 12 : -12), 18, 9, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(x + (side === 'left' ? 12 : -12), y, 9, 18, 0, 0, Math.PI * 2);
    }
    ctx.fill(); ctx.stroke();

    // Body
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.ellipse(x, charY + 4, 11, 9, 0, 0, Math.PI);
    ctx.fill();

    // Head
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur    = 6;
    ctx.shadowOffsetY = 2;
    drawHead(x, charY - 14, 13, m.avatarImg, m.color, m.name[0].toUpperCase());
    ctx.restore();

    // Eyes + smile — only when no avatar image is loaded (avatar replaces the face)
    if (!hasAvatar) {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(x - 4, charY - 16, 2, 0, Math.PI * 2);
      ctx.arc(x + 4, charY - 16, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth   = 1.5;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.arc(x, charY - 11, 4, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    // Status dot
    ctx.fillStyle   = sc;
    ctx.beginPath();
    ctx.arc(x + 11, charY - 24, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1d27';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Name label
    ctx.textAlign    = 'center';
    ctx.fillStyle    = '#e8eaf0';
    ctx.font         = '500 10px system-ui';
    ctx.textBaseline = 'top';
    const ly = charY + 8;
    ctx.fillText(m.name.length > 9 ? m.name.slice(0, 8) + '…' : m.name, x, ly);

    // Status label
    ctx.fillStyle = sc;
    ctx.font      = '400 9px system-ui';
    ctx.fillText(STATUS_LABEL[m.status] || m.status, x, ly + 13);
  });

  requestAnimationFrame(draw);
}

draw();

window.updateTableMembers = setMembers;
