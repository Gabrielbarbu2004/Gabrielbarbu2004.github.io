(function () {
  'use strict';

  function planArm(l1, l2, x, y) {
    if (![l1, l2, x, y].every(Number.isFinite) || l1 <= 0 || l2 <= 0) {
      throw new Error('Enter finite values and link lengths greater than zero.');
    }
    const distance = Math.hypot(x, y);
    const minReach = Math.abs(l1 - l2);
    const maxReach = l1 + l2;
    const tolerance = 1e-10 * maxReach;
    if (distance > maxReach + tolerance || distance < minReach - tolerance) {
      return { reachable: false, distance, minReach, maxReach, target: { x, y }, solutions: [] };
    }
    const cosine = Math.max(-1, Math.min(1, (distance ** 2 - l1 ** 2 - l2 ** 2) / (2 * l1 * l2)));
    const angle = Math.acos(cosine);
    const solutions = [angle, -angle].map((q2, i) => {
      const q1 = Math.atan2(y, x) - Math.atan2(l2 * Math.sin(q2), l1 + l2 * Math.cos(q2));
      return { name: i === 0 ? 'Positive elbow bend' : 'Negative elbow bend', q1, q2, elbow: { x: l1 * Math.cos(q1), y: l1 * Math.sin(q1) } };
    });
    return { reachable: true, distance, minReach, maxReach, target: { x, y }, solutions };
  }

  if (typeof module !== 'undefined') module.exports = { planArm };
  if (typeof document === 'undefined') return;
  const form = document.getElementById('arm-form');
  if (!form) return;
  const results = document.getElementById('arm-results');
  const error = document.getElementById('arm-error');
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = n => Number(n.toPrecision(4)).toLocaleString('en-GB');
  const degrees = r => `${fmt(r * 180 / Math.PI)}°`;

  function svgElement(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    return el;
  }

  function plot(plan, l1, l2) {
    const svg = svgElement('svg', { class: 'arm-plot', viewBox: '0 0 380 330', role: 'img', 'aria-label': plan.reachable ? 'Two planar arm solutions and target point' : 'Arm workspace and unreachable target point' });
    const bound = Math.max(plan.maxReach, Math.abs(plan.target.x), Math.abs(plan.target.y), 0.01) * 1.08;
    const scale = 138 / bound;
    const px = x => 190 + x * scale;
    const py = y => 165 - y * scale;
    svg.append(svgElement('line', { x1: 15, y1: 165, x2: 365, y2: 165, class: 'axis' }), svgElement('line', { x1: 190, y1: 10, x2: 190, y2: 320, class: 'axis' }));
    svg.append(svgElement('circle', { cx: 190, cy: 165, r: plan.maxReach * scale, class: 'reach-outer' }));
    if (plan.minReach > 0.00001) svg.append(svgElement('circle', { cx: 190, cy: 165, r: plan.minReach * scale, class: 'reach-inner' }));
    for (const [i, s] of plan.solutions.entries()) {
      svg.append(svgElement('polyline', { points: `190,165 ${px(s.elbow.x)},${py(s.elbow.y)} ${px(plan.target.x)},${py(plan.target.y)}`, class: `arm-path arm-path-${i}` }));
      svg.append(svgElement('circle', { cx: px(s.elbow.x), cy: py(s.elbow.y), r: 5, class: `elbow elbow-${i}` }));
    }
    svg.append(svgElement('circle', { cx: 190, cy: 165, r: 5, class: 'arm-base' }));
    svg.append(svgElement('circle', { cx: px(plan.target.x), cy: py(plan.target.y), r: 6, class: plan.reachable ? 'arm-target' : 'arm-target unreachable' }));
    const text = svgElement('text', { x: 199, y: 154, class: 'axis-label' }); text.textContent = 'base'; svg.append(text);
    const targetText = svgElement('text', { x: Math.min(325, px(plan.target.x) + 8), y: Math.max(19, py(plan.target.y) - 8), class: 'axis-label' }); targetText.textContent = 'target'; svg.append(targetText);
    return svg;
  }

  function render() {
    error.hidden = true;
    try {
      const names = ['link-one', 'link-two', 'target-x', 'target-y'];
      const raw = names.map(name => form.elements[name].value);
      if (raw.some(value => value === '')) throw new Error('Fill in all four fields.');
      const [l1, l2, x, y] = raw.map(Number);
      const plan = planArm(l1, l2, x, y);
      const status = document.createElement('p'); status.className = `status-banner${plan.reachable ? '' : ' warn'}`;
      status.textContent = plan.reachable ? 'Target is inside the reachable workspace.' : 'Target is outside the reachable workspace.';
      const overview = document.createElement('p'); overview.className = 'result-detail';
      overview.textContent = `Target distance ${fmt(plan.distance)} m · reachable radius ${fmt(plan.minReach)}–${fmt(plan.maxReach)} m.`;
      const children = [status, plot(plan, l1, l2), overview];
      if (plan.reachable) {
        const solutions = document.createElement('div'); solutions.className = 'solution-grid';
        for (const solution of plan.solutions) {
          const box = document.createElement('div'); box.className = 'solution';
          const name = document.createElement('strong'); name.textContent = solution.name;
          const angles = document.createElement('span'); angles.textContent = `θ₁ ${degrees(solution.q1)} · θ₂ ${degrees(solution.q2)}`;
          box.append(name, angles); solutions.append(box);
        }
        children.push(solutions);
        const note = document.createElement('p'); note.className = 'result-detail';
        note.textContent = 'Solid line: positive elbow bend. Dashed line: negative elbow bend. At fully extended or folded positions the two solutions coincide.';
        children.push(note);
      }
      results.replaceChildren(...children);
    } catch (e) {
      results.replaceChildren(); error.textContent = e.message; error.hidden = false;
    }
  }

  form.addEventListener('submit', event => { event.preventDefault(); render(); });
  form.addEventListener('input', render);
  render();
})();
