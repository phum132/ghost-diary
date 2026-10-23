// WebGL background: red dust everywhere, plus a voxel "apparition" on the home page
// that morphs between a ghost figure, a glory ring and the room number 407.
import * as THREE from 'three';

const W = 256;

function spriteTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,190,170,.6)'); grd.addColorStop(1, 'rgba(255,60,40,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Rasterize a 2D drawing, then pick N filled pixels as voxel targets. Alpha = acceptance probability.
function sample(draw, N, scale, depth, rand) {
  const c = document.createElement('canvas'); c.width = c.height = W;
  const g = c.getContext('2d', { willReadFrequently: true });
  draw(g);
  const d = g.getImageData(0, 0, W, W).data;
  const px = [];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const a = d[(y * W + x) * 4 + 3]; if (a > 10) px.push(x, y, a / 255); }
  const out = new Float32Array(N * 3);
  const cnt = px.length / 3;
  for (let i = 0; i < N; i++) {
    let k, tries = 0;
    do { k = Math.floor(rand() * cnt); tries++; } while (rand() > px[k * 3 + 2] && tries < 12);
    const x = (px[k * 3] + rand() - W / 2) / W * scale;
    const y = -(px[k * 3 + 1] + rand() - W / 2) / W * scale;
    out[i * 3] = x; out[i * 3 + 1] = y;
    out[i * 3 + 2] = (rand() - 0.5) * depth * (1 - Math.min(1, Math.abs(x) / (scale * 0.4)) * 0.6);
  }
  return out;
}

function drawFigure(g, s = 1, ox = 0, oy = 0) {
  g.save(); g.translate(128 + ox, 128 + oy); g.scale(s, s); g.translate(-128, -128);
  g.fillStyle = '#fff';
  // head bowed forward, face hidden by hair
  g.beginPath(); g.ellipse(128, 40, 16, 20, -0.15, 0, Math.PI * 2); g.fill();
  // narrow shoulders + gown that only flares a little
  g.beginPath(); g.moveTo(112, 70); g.quadraticCurveTo(128, 62, 144, 70); g.lineTo(148, 130); g.quadraticCurveTo(156, 190, 162, 246);
  g.lineTo(94, 246); g.quadraticCurveTo(100, 190, 108, 130); g.closePath(); g.fill();
  // long hair falling straight down over the chest (a separate, darker-reading strip)
  g.beginPath(); g.moveTo(113, 34); g.quadraticCurveTo(128, 16, 143, 34); g.lineTo(141, 150); g.lineTo(115, 150); g.closePath(); g.fill();
  // arms hanging apart from the body, leaving a gap the eye reads as a person
  g.lineCap = 'round'; g.strokeStyle = '#fff'; g.lineWidth = 8;
  g.beginPath(); g.moveTo(108, 76); g.quadraticCurveTo(92, 120, 94, 178); g.stroke();
  g.beginPath(); g.moveTo(148, 76); g.quadraticCurveTo(164, 120, 162, 178); g.stroke();
  g.globalCompositeOperation = 'destination-out';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(103, 92); g.quadraticCurveTo(100, 130, 102, 172); g.stroke();
  g.beginPath(); g.moveTo(153, 92); g.quadraticCurveTo(156, 130, 154, 172); g.stroke();
  g.globalCompositeOperation = 'source-over';
  // fade the hem so the figure has no feet
  g.globalCompositeOperation = 'destination-out';
  const grd = g.createLinearGradient(0, 190, 0, 250); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = grd; g.fillRect(0, 190, 256, 66);
  g.restore();
}

export function start(host, { mode = 'ambient', still = false } = {}) {
  const small = matchMedia('(max-width: 700px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060304, 0.055);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 9);
  const sprite = spriteTexture();
  let rand = mulberry(407);

  // ---- dust ----
  const DUST = small ? 450 : 1100;
  const dpos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) { dpos[i * 3] = (rand() - 0.5) * 30; dpos[i * 3 + 1] = (rand() - 0.5) * 18; dpos[i * 3 + 2] = (rand() - 0.5) * 16 - 2; }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({
    size: 0.09, map: sprite, color: 0xff5a40, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);

  // ---- hero apparition ----
  let hero = null;
  if (mode === 'hero') hero = buildHero();

  function buildHero() {
    const N = small ? 1300 : 2600;
    rand = mulberry(13);
    const shapes = [
      sample((g) => drawFigure(g), N, 4.6, 1.1, rand),
      sample((g) => {
        g.strokeStyle = '#fff'; g.lineWidth = 20; g.beginPath(); g.arc(128, 128, 92, 0, Math.PI * 2); g.stroke();
        g.globalAlpha = 0.5; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
        drawFigure(g, 0.55, 0, 12);
      }, N, 4.8, 0.9, rand),
      sample((g) => {
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '800 118px "Kanit", "Arial Black", sans-serif'; g.fillText('407', 128, 132);
      }, N, 5.2, 0.8, rand),
    ];
    const cloud = new Float32Array(N * 3);
    const dir = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1), r = 3 + rand() * 4;
      dir[i * 3] = Math.sin(ph) * Math.cos(th); dir[i * 3 + 1] = Math.cos(ph); dir[i * 3 + 2] = Math.sin(ph) * Math.sin(th);
      cloud[i * 3] = dir[i * 3] * r; cloud[i * 3 + 1] = dir[i * 3 + 1] * r; cloud[i * 3 + 2] = dir[i * 3 + 2] * r;
    }
    const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, fog: true });
    const mesh = new THREE.InstancedMesh(geo, mat, N);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const col = new THREE.Color();
    const palette = [0xff3b2f, 0xff6a3d, 0xff2a1f, 0xffb199, 0x9a1410];
    for (let i = 0; i < N; i++) {
      const r = rand();
      col.setHex(palette[r < 0.45 ? 0 : r < 0.7 ? 1 : r < 0.85 ? 2 : r < 0.93 ? 3 : 4]);
      mesh.setColorAt(i, col);
    }
    const glowPos = new Float32Array(N * 3);
    const ggeo = new THREE.BufferGeometry(); ggeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
    const glow = new THREE.Points(ggeo, new THREE.PointsMaterial({
      size: 0.3, map: sprite, color: 0xff3b2f, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const group = new THREE.Group(); group.add(mesh, glow); scene.add(group);
    const delay = new Float32Array(N).map(() => rand());
    const cur = new Float32Array(N * 3); cur.set(cloud);
    return { N, mesh, glow, group, shapes, cloud, dir, delay, from: cloud.slice(), to: shapes[0], t0: performance.now(), idx: 0, cur };
  }

  function morphTo(i) {
    if (!hero) return;
    hero.from = hero.cur.slice();
    hero.idx = (i + hero.shapes.length) % hero.shapes.length;
    hero.to = hero.shapes[hero.idx];
    hero.t0 = performance.now();
  }

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }, { passive: true });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 700 ? 11.5 : 9;
    camera.updateProjectionMatrix();
    if (still) frame(performance.now());
  }
  addEventListener('resize', resize);

  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  let lastSwitch = performance.now();

  function frame(now) {
    const t = now / 1000;
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    camera.position.x = mouse.x * 0.8; camera.position.y = -mouse.y * 0.5;
    camera.lookAt(0, 0, 0);
    dust.rotation.y = t * 0.012; dust.position.y = Math.sin(t * 0.1) * 0.3;

    if (hero) {
      if (!still && now - lastSwitch > 7000) { lastSwitch = now; morphTo(hero.idx + 1); }
      const prog = still ? 1 : Math.min(1, (now - hero.t0) / 2200);
      const explode = Math.min(1, scrollY / (innerHeight * 0.9));
      const m = hero.mesh.instanceMatrix.array, gp = hero.glow.geometry.attributes.position.array;
      const { N, from, to, delay, dir, cur } = hero;
      for (let i = 0; i < N; i++) {
        const u = ease(Math.max(0, Math.min(1, (prog - delay[i] * 0.35) / 0.65)));
        const k = i * 3;
        const wob = still ? 0 : Math.sin(t * 1.4 + i * 0.37) * 0.025;
        const ex = explode * 5 * (0.4 + delay[i]);
        const x = from[k] + (to[k] - from[k]) * u + dir[k] * ex + wob;
        const y = from[k + 1] + (to[k + 1] - from[k + 1]) * u + dir[k + 1] * ex + (still ? 0 : Math.cos(t * 1.1 + i) * 0.02);
        const z = from[k + 2] + (to[k + 2] - from[k + 2]) * u + dir[k + 2] * ex;
        cur[k] = x; cur[k + 1] = y; cur[k + 2] = z;
        const o = i * 16;
        m[o] = 1; m[o + 5] = 1; m[o + 10] = 1; m[o + 15] = 1;
        m[o + 12] = x; m[o + 13] = y; m[o + 14] = z;
        gp[k] = x; gp[k + 1] = y; gp[k + 2] = z;
      }
      hero.mesh.instanceMatrix.needsUpdate = true;
      hero.glow.geometry.attributes.position.needsUpdate = true;
      hero.group.rotation.y = (still ? 0 : Math.sin(t * 0.25) * 0.35) + mouse.x * 0.5;
      hero.group.rotation.x = mouse.y * 0.18;
      hero.group.position.y = small ? 1.5 : 1.0;
      hero.mesh.material.opacity = 1 - explode * 0.7;
    }
    renderer.render(scene, camera);
  }

  let raf = 0, running = false;
  const loop = (now) => { frame(now); raf = requestAnimationFrame(loop); };
  const run = (on) => {
    if (still) return;
    if (on && !running) { running = true; raf = requestAnimationFrame(loop); }
    if (!on && running) { running = false; cancelAnimationFrame(raf); }
  };
  document.addEventListener('visibilitychange', () => run(!document.hidden));
  resize();
  if (hero) hero.from = hero.cloud.slice();
  if (still) { if (hero) { hero.from = hero.shapes[0]; hero.to = hero.shapes[0]; } frame(performance.now()); } else run(true);

  return {
    next: () => { lastSwitch = performance.now(); morphTo(hero ? hero.idx + 1 : 0); if (still) frame(performance.now() + 1e5); },
    shape: () => (hero ? ['figure', 'ring', '407'][hero.idx] : null),
  };
}

function mulberry(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
