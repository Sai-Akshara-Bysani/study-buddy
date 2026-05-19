// ── TABLE.JS ── Immersive Full-Screen Cozy Workspace Canvas

window.addEventListener('DOMContentLoaded', () => {

const canvas = document.getElementById('table-canvas');
const ctx = canvas.getContext('2d');
const wrap = document.getElementById('study-table-wrap');
wrap.style.position = 'relative';

let overlay = document.querySelector('#study-table-wrap .avatar-dom-layer');
if (!overlay) {
  overlay = document.createElement('div');
  overlay.className = 'avatar-dom-layer';
  overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:5;';
  wrap.appendChild(overlay);
}

window.resizeTableCanvas = function() {
  const currentWidth = window.innerWidth;
  const currentHeight = window.innerHeight;
  canvas.width  = currentWidth;
  canvas.height = currentHeight;
  canvas.style.width  = currentWidth + 'px';
  canvas.style.height = currentHeight + 'px';
  overlay.style.width  = currentWidth + 'px';
  overlay.style.height = currentHeight + 'px';
};
window.resizeTableCanvas();
window.addEventListener('resize', window.resizeTableCanvas);

const MAX_MEMBERS = 8;
overlay.innerHTML = '';
const avatarImgs = Array.from({ length: MAX_MEMBERS }, () => {
  const img = document.createElement('img');
  img.style.cssText = `position:absolute;display:none;pointer-events:none;z-index:6;`;
  overlay.appendChild(img);
  return img;
});

const STATUS_COLOR = { idle: '#7c6ef5', studying: '#52d9a0', break: '#f5c842' };
let seated = [];
let frame  = 0;

function setMembers(memberObj) {
  if (!memberObj) { seated = []; return; }
  const list = Array.isArray(memberObj) ? memberObj : Object.values(memberObj);
  const oldData = {};
  seated.forEach(s => { oldData[s.name] = s; });

  const cw = window.innerWidth;
  const ch = window.innerHeight;

  seated = list.filter(m => m && m.name).map((m, i) => {
    const prev = oldData[m.name];
    let cleanStatus = 'idle';
    const rawStatus = String(m.status || '').toLowerCase();
    if (rawStatus.includes('study') || rawStatus.includes('📖')) cleanStatus = 'studying';
    else if (rawStatus.includes('break') || rawStatus.includes('🌿')) cleanStatus = 'break';

    // Random initial placement within comfortable safety margins
    const initX = prev?.walkX ?? (Math.random() * (cw - 300) + 150);
    const initY = prev?.walkY ?? (Math.random() * (ch - 350) + 200);

    return {
      name:      m.name,
      status:    cleanStatus,
      phase:     prev?.phase  ?? (Math.random() * Math.PI * 2),
      walkX:     initX,
      walkY:     initY,
      targetX:   prev?.targetX ?? initX,
      targetY:   prev?.targetY ?? initY,
      restTimer: prev?.restTimer ?? Math.random() * 120,
      avatar:    m.avatar || '',
      bobPhase:  prev?.bobPhase ?? Math.random() * Math.PI * 2,
    };
  });

  avatarImgs.forEach((el, i) => {
    const m = seated[i];
    if (m && m.avatar) {
      el.src = m.avatar;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
      el.src = '';
    }
  });
}

const floatingNotes = Array.from({ length: 5 }, (_, i) => ({
  x: 0.7 + i * 0.04, y: 0.3 + Math.random() * 0.3,
  vy: -(0.001 + Math.random() * 0.001), opacity: Math.random(),
  symbol: ['♪','♫','♬'][i % 3], phase: Math.random() * Math.PI * 2, size: 14 + Math.random() * 8
}));

function draw() {
  frame++;
  const t  = frame / 60;
  const cw = canvas.width;
  const ch = canvas.height;

  ctx.clearRect(0, 0, cw, ch);

  // Floating lofi notes rhythm updates
  floatingNotes.forEach(n => {
    n.y += n.vy; n.opacity -= 0.001;
    if (n.opacity <= 0 || n.y < 0.05) { n.y = 0.8; n.opacity = 0.6; n.x = 0.65 + Math.random() * 0.25; }
    ctx.save();
    ctx.globalAlpha = n.opacity; ctx.fillStyle = '#7c6ef5'; ctx.font = `${n.size}px sans-serif`;
    ctx.fillText(n.symbol, n.x * cw + Math.sin(t * 2 + n.phase) * 6, n.y * ch);
    ctx.restore();
  });

  // Render & Process characters
  seated.forEach((m, i) => {
    // 🌟 BEHAVIOR LOGIC ENGINE
    if (m.status === 'studying') {
      // Focused: Lock position, typing/swaying bob style effect
      m.targetX = m.walkX;
      m.targetY = m.walkY;
    } else {
      // Idle / Break: Cozy roam to random spots in the workspace
      const dist = Math.hypot(m.targetX - m.walkX, m.targetY - m.walkY);
      if (dist < 8) {
        m.restTimer--;
        if (m.restTimer <= 0) {
          // Pick a brand new cozy coordination point across the full viewport
          m.targetX = Math.random() * (cw - 320) + 160;
          m.targetY = Math.random() * (ch - 320) + 160;
          m.restTimer = 180 + Math.random() * 240; // Rest for 3-7 seconds
        }
      } else {
        // Step gracefully toward destination target
        m.walkX += (m.targetX - m.walkX) * 0.015;
        m.walkY += (m.targetY - m.walkY) * 0.015;
      }
    }

    // Dynamic animation speeds based on active state rules
    let bob = 0;
    let tilt = 0;
    
    if (m.status === 'studying') {
      bob = Math.sin(t * 1.5 + m.bobPhase) * 2;
      tilt = Math.sin(t * 0.8 + m.bobPhase) * 0.02; // Subtle focus sway
    } else if (m.status === 'break') {
      bob = Math.sin(t * 3.5 + m.bobPhase) * 8;     // Happy bouncing vibe
    } else {
      bob = Math.sin(t * 2.0 + m.bobPhase) * 4;     // Soft casual idle float
    }

    if (m.avatar) {
      // 🌟 UPDATED AVATAR SIZE: Pushed up to 140px for prominent visibility
      const size = 140; 
      const ax = m.walkX - size / 2;
      const ay = m.walkY - size / 2 + bob;

      const el = avatarImgs[i];
      if (el) {
        el.style.width  = size + 'px';
        el.style.height = size + 'px';
        el.style.left   = ax + 'px';
        el.style.top    = ay + 'px';
        el.style.transform = `rotate(${tilt}rad)`;
      }

      // Canvas Indicator Decorations (Shadow beneath transparent body + status lights)
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.beginPath();
      ctx.ellipse(m.walkX, m.walkY + (size/2) - 10, 35, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clean little Status glow dot indicator placement
      const sc = STATUS_COLOR[m.status] || '#7c6ef5';
      ctx.fillStyle = sc;
      ctx.beginPath();
      ctx.arc(m.walkX - 45, m.walkY - (size/2) + bob + 30, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();

      // Clean Name Display Label
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#2e3138';
      ctx.fillText(m.name, m.walkX, m.walkY + (size/2) + 12);
      ctx.restore();
    }
  });

  // Simple Room Tracker on bottom right
  const roomEl = document.getElementById('room-name-display');
  if (roomEl && roomEl.textContent) {
    ctx.save();
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.font = 'bold 15px system-ui'; ctx.fillStyle = '#2e3138';
    ctx.fillText(roomEl.textContent, cw - 30, ch - 30);
    ctx.font = '600 13px system-ui'; ctx.fillStyle = '#7a80a0';
    ctx.fillText(`${seated.length} studying`, cw - 30, ch - 50);
    ctx.restore();
  }

  requestAnimationFrame(draw);
}

draw();
window.updateTableMembers = setMembers;

});
