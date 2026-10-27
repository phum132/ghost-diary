import { boot } from '../core/boot.js';
import { radio } from '../ritual/radio.js';
import { glass } from '../ritual/glass.js';
import { siamsi } from '../ritual/siamsi.js';

boot('ritual');

// each ritual mounts the first time its tab opens; the radio is switched off when you leave its tab
const MOUNT = { radio, glass, siamsi };
const live = {};
const names = Object.keys(MOUNT);

function show(name) {
  for (const k of names) {
    const on = k === name;
    document.getElementById(`tab-${k}`).setAttribute('aria-selected', String(on));
    document.getElementById(`pane-${k}`).hidden = !on;
    if (!on && live[k] && k === 'radio') { live[k](); delete live[k]; document.querySelector('#pane-radio .rt-body')?.remove(); }
  }
  if (!live[name]) {
    const body = document.createElement('div');
    body.className = 'rt-body';
    document.getElementById(`pane-${name}`).append(body);
    live[name] = MOUNT[name](body) || (() => {});
  }
  history.replaceState(null, '', `#${name}`);
}

for (const k of names) document.getElementById(`tab-${k}`).addEventListener('click', () => show(k));
show(names.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'radio');
