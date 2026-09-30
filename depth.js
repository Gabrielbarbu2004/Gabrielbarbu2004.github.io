(function () {
  'use strict';

  function backProject({ u, v, z, fx, fy, cx, cy }) {
    if (![u, v, z, fx, fy, cx, cy].every(Number.isFinite) || z <= 0 || fx <= 0 || fy <= 0) {
      throw new Error('Enter finite values. Depth and focal lengths must be greater than zero.');
    }
    const x = (u - cx) * z / fx;
    const y = (v - cy) * z / fy;
    return { x, y, z, distance: Math.hypot(x, y, z) };
  }

  if (typeof module !== 'undefined') module.exports = { backProject };
  if (typeof document === 'undefined') return;
  const form = document.getElementById('depth-form');
  if (!form) return;
  const results = document.getElementById('depth-results');
  const error = document.getElementById('depth-error');
  const display = value => `${Number(value.toPrecision(4)).toLocaleString('en-GB')} m`;

  function metric(value, label) {
    const box = document.createElement('div'); box.className = 'metric';
    const strong = document.createElement('strong'); strong.textContent = display(value);
    const caption = document.createElement('span'); caption.textContent = label;
    box.append(strong, caption); return box;
  }

  function render() {
    error.hidden = true;
    try {
      const names = { u: 'pixel-u', v: 'pixel-v', z: 'depth-z', fx: 'focal-x', fy: 'focal-y', cx: 'centre-x', cy: 'centre-y' };
      const values = {};
      for (const [key, name] of Object.entries(names)) {
        const raw = form.elements[name].value;
        if (raw === '') throw new Error('Fill in all seven fields.');
        values[key] = Number(raw);
      }
      const point = backProject(values);
      const metrics = document.createElement('div'); metrics.className = 'result-summary';
      metrics.append(metric(point.x, 'X / right'), metric(point.y, 'Y / down'), metric(point.z, 'Z / forward'), metric(point.distance, 'Distance from camera'));
      const detail = document.createElement('p'); detail.className = 'result-detail';
      detail.textContent = `Camera-frame point: (${display(point.x)}, ${display(point.y)}, ${display(point.z)}).`;
      results.replaceChildren(metrics, detail);
    } catch (e) {
      results.replaceChildren(); error.textContent = e.message; error.hidden = false;
    }
  }

  form.addEventListener('submit', event => { event.preventDefault(); render(); });
  form.addEventListener('input', render);
  render();
})();
