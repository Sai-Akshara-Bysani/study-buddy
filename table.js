// ── TABLE.JS ── Animated study room table visualization
// Avatar images are rendered as position:absolute <img> elements overlaid on
// the canvas — this sidesteps CORS restrictions entirely since <img> tags can
// display any cross-origin image without tainting the canvas.

const canvas = document.getElementById('table-canvas');
const ctx = canvas.getContext('2d');
const W = 540, H = 380;

// ── Overlay container sits on top of the canvas, same size ──
const overlay = document.createElement('div');
overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:' + H + 'px;pointer-events:none;overflow:hidden;';
canvas.parentElement.style.position = 'relative';
canvas.parentElement.appendChild(overlay);

window.resizeTableCanvas = function() {
  const container = canvas.parentElement;
  if (!container) return;
  const currentWidth = container.clientWidth || W;
  canvas.width  = currentWidth;
  canvas.height = H;
  canvas.style.width  = '100%';
  canvas.style.height = H + 'px';
  overlay.style.height = H + 'px';
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

// ── Per-seat overlay <img> elements (one per seat slot, reused) ──
const avatarEls = SEATS.map(() => {
  const img = document.createElement('img');
  img.style.cssText = `
    position: absolute;
    width: 26px; height: 26px;
    border-radius: 50%;
    object-fit: cover;
    display: none;
    border: 2px solid #7c6ef5;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  `;
  overlay.appendChild(img);
  return img;
});

let seated = [];
let frame  = 0;

function setMembers(memberObj) {
  if (!memberObj) { seated = []; return; }

  const list = Array.isArray(memberObj) ? memberObj : Object.values(memberObj);

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
        name:   m.name,
        status: cleanStatus,
        seat:   SEATS[i % SEATS.length],
        color:  nameColor(m.name),
        phase:  oldPhase[m.name] ?? Math.random() * Math.PI * 2,
        avatar: m.avatar || '',
      };
    });

  // Update overlay img elements
  avatarEls.forEach((el, i) => {
    const m = seated[i];
    if (m && m.avatar) {
      el.src              = m.avatar;
      el.style.display    = 'block';
      el.style.borderColor = m.color;
    } else {
      el.style.display = 'none';
      el.src = '';
    }
  });
}

// ── Position overlay imgs in sync with the bobbing animation ──
function updateOverlayPositions(t) {
  const centerX = canvas.width  / 2;
  const centerY = canvas.height / 2;
  // canvas rect relative to the overlay container
  const canvasRect     = canvas.getBoundingClientRect();
  const containerRect  = canvas.parentElement.getBoundingClientRect();
  const offsetLeft     = canvasRect.left - containerRect.left;
  const offsetTop      = canvasRect.top  - containerRect.top;

  const R = 13; // head radius, matches canvas drawing

  avatarEls.forEach((el, i) => {
    const m = seated[i];
    if (!m || !m.avatar) return;

    const standardSeat = SEATS[i % SEATS.length];
    const x    = centerX + (standardSeat.x - 270);
    const y    = centerY + (standardSeat.y - 195);
    const side = standardSeat.side;
    const bob  = Math.sin(t * 1.8 + m.phase) * 3;
    const charY = y + (side === 'top' ? -10 + bob : side === 'bottom' ? 10 + bob : bob);

    // Head center on canvas → pixel position on overlay
    const headX = offsetLeft + (x / W) * canvas.clientWidth;
    const headY = offsetTop  + ((charY - 14) / H) * canvas.clientHeight;

    el.style.left = (headX - R) + 'px';
    el.style.top  = (headY - R) + 'px';
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

    // Head — only draw colored circle + face if no avatar URL
    if (!m.avatar) {
      ctx.save();
      ctx.shadowColor   = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur    = 6;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(x, charY - 14, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Eyes
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(x - 4, charY - 16, 2, 0, Math.PI * 2);
      ctx.arc(x + 4, charY - 16, 2, 0, Math.PI * 2);
      ctx.fill();

      // Smile
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth   = 1.5;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.arc(x, charY - 11, 4, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      // Draw a placeholder ring so the body connects cleanly while image loads
      ctx.beginPath();
      ctx.arc(x, charY - 14, 13, 0, Math.PI * 2);
      ctx.strokeStyle = m.color;
      ctx.lineWidth   = 2;
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

  // Move overlay <img> elements to match the bobbing positions
  updateOverlayPositions(t);

  requestAnimationFrame(draw);
}

draw();

window.updateTableMembers = setMembers;
