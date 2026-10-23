// Holographic globe for the ghost archive: dotted sphere + lat/long rings + pulsing pins you can click.
import * as THREE from 'three';

const toVec = (lat, lon, r) => {
  const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
};

export function globe(host, pins, { onPick, onHover, still = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 4.2);
  const world = new THREE.Group(); scene.add(world);

  // dotted shell (fibonacci sphere)
  const N = 2600, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
    pos[i * 3] = Math.cos(th) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(th) * r;
  }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  world.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x7a1a14, size: 0.012, transparent: true, opacity: 0.9 })));
  // inner glow sphere to hide the back side a little
  world.add(new THREE.Mesh(new THREE.SphereGeometry(0.985, 48, 48), new THREE.MeshBasicMaterial({ color: 0x0a0405, transparent: true, opacity: 0.85 })));
  // lat/long rings
  const ringMat = new THREE.LineBasicMaterial({ color: 0xff3b2f, transparent: true, opacity: 0.18 });
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = []; for (let lon = -180; lon <= 180; lon += 5) pts.push(toVec(lat, lon, 1.002));
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const pts = []; for (let lat = -90; lat <= 90; lat += 5) pts.push(toVec(lat, lon, 1.002));
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
  }
  // pins: a bright head + a beam + a pulse ring
  const pinObjs = pins.map((p) => {
    const base = toVec(p.lat, p.lon, 1);
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff3b2f }));
    const tip = toVec(p.lat, p.lon, 1.18);
    head.position.copy(tip);
    const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([base, tip]), new THREE.LineBasicMaterial({ color: 0xff6a3d }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.045, 32), new THREE.MeshBasicMaterial({ color: 0xff3b2f, transparent: true, side: THREE.DoubleSide }));
    ring.position.copy(base); ring.lookAt(base.clone().multiplyScalar(2));
    g.add(head, beam, ring); world.add(g);
    head.userData.pin = p;
    return { p, head, ring, phase: Math.random() * 6 };
  });

  // interaction: drag to spin, click pins
  let rotY = -2.4, rotX = 0.35, vel = 0.0025, drag = null, hovered = null, target = null;
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  const el = renderer.domElement;
  el.style.touchAction = 'pan-y';
  const hit = (e) => {
    const r = el.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const h = ray.intersectObjects(pinObjs.map((o) => o.head))[0];
    return h ? h.object.userData.pin : null;
  };
  el.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, rx: rotX, ry: rotY, moved: false }; });
  addEventListener('pointerup', (e) => {
    if (drag && !drag.moved && e.target === el) { const p = hit(e); if (p) { focus(p); onPick?.(p); } }
    drag = null;
  });
  el.addEventListener('pointermove', (e) => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      rotY = drag.ry + dx * 0.008; rotX = Math.max(-1.2, Math.min(1.2, drag.rx + dy * 0.006)); target = null;
      if (still) render();
    } else {
      const p = hit(e);
      if (p !== hovered) { hovered = p; el.style.cursor = p ? 'pointer' : 'grab'; onHover?.(p); }
    }
  });
  function focus(p) {
    // turn the globe so the pin faces the camera
    // Ry(a) brings longitude th to the front when a = π/2 − th; then Rx(lat) levels it
    let y = Math.PI / 2 - (p.lon + 180) * Math.PI / 180;
    y = rotY + Math.atan2(Math.sin(y - rotY), Math.cos(y - rotY)); // shortest way round
    target = { y, x: p.lat * Math.PI / 180 };
    if (still) { rotY = target.y; rotX = target.x; render(); }
  }

  function resize() {
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
    render();
  }
  new ResizeObserver(resize).observe(host);

  function render(t = 0) {
    world.rotation.y = rotY; world.rotation.x = rotX;
    for (const o of pinObjs) {
      const k = ((t / 1000 + o.phase) % 2) / 2;
      o.ring.scale.setScalar(1 + k * 3); o.ring.material.opacity = 1 - k;
      o.head.scale.setScalar(o.p === hovered ? 1.8 : 1);
    }
    renderer.render(scene, camera);
  }
  let raf = 0;
  const loop = (t) => {
    if (target) { rotY += (target.y - rotY) * 0.06; rotX += (target.x - rotX) * 0.06; }
    else if (!drag) rotY += vel;
    render(t);
    raf = requestAnimationFrame(loop);
  };
  if (still) resize(); else raf = requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => {
    if (still) return;
    if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(loop);
  });
  return { focus };
}
