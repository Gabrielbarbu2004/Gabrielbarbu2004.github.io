(function () {
  'use strict';

  function parseLine(line) {
    const cells = [];
    let value = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') { value += '"'; i++; }
        else { quoted = !quoted; }
      } else if (char === ',' && !quoted) {
        cells.push(value.trim()); value = '';
      } else {
        value += char;
      }
    }
    cells.push(value.trim());
    return cells;
  }

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    if (!sorted.length) return null;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function analyseCsv(input) {
    const lines = input.replace(/\r/g, '').split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('Add a header and at least one data row.');
    const headers = parseLine(lines[0]).map(h => h.toLowerCase());
    const required = ['timestamp_ms', 'range_mm', 'confidence'];
    const indexes = required.map(name => headers.indexOf(name));
    if (indexes.some(index => index === -1)) throw new Error('CSV needs timestamp_ms, range_mm and confidence columns.');
    const rows = lines.slice(1).map((line, n) => {
      const cells = parseLine(line);
      const rawTime = cells[indexes[0]] || '';
      const time = rawTime === '' ? NaN : Number(rawTime);
      const rawRange = cells[indexes[1]] || '';
      const rawConfidence = cells[indexes[2]] || '';
      const range = rawRange === '' ? NaN : Number(rawRange);
      const confidence = rawConfidence === '' ? NaN : Number(rawConfidence);
      return { cells, row: n + 2, time, range, confidence, status: 'valid' };
    });
    if (rows.length > 10000) throw new Error('Please use a log with 10,000 rows or fewer.');
    const trustworthy = rows.filter(r => Number.isFinite(r.range) && r.range >= 0 && Number.isFinite(r.confidence) && r.confidence >= .5 && r.confidence <= 1);
    const centre = median(trustworthy.map(r => r.range));
    const mad = centre === null ? null : median(trustworthy.map(r => Math.abs(r.range - centre)));
    const threshold = mad === null ? null : Math.max(5, 3 * 1.4826 * mad);
    for (const r of rows) {
      if (!Number.isFinite(r.time) || !Number.isFinite(r.range) || r.range < 0 || !Number.isFinite(r.confidence) || r.confidence < 0 || r.confidence > 1) r.status = 'missing/invalid';
      else if (r.confidence < .5) r.status = 'low confidence';
      else if (centre !== null && Math.abs(r.range - centre) > threshold) r.status = 'range outlier';
    }
    return { rows, indexes, centre, mad, threshold, valid: rows.filter(r => r.status === 'valid').length, flagged: rows.filter(r => r.status !== 'valid').length };
  }

  function flaggedCsv(result) {
    const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
    return ['timestamp_ms,range_mm,confidence,status', ...result.rows.map(r => [r.cells[result.indexes[0]] || '', r.cells[result.indexes[1]] || '', r.cells[result.indexes[2]] || '', r.status].map(quote).join(','))].join('\n');
  }

  if (typeof module !== 'undefined') module.exports = { parseLine, median, analyseCsv, flaggedCsv };
  if (typeof document === 'undefined') return;

  const input = document.getElementById('csv-input');
  const button = document.getElementById('analyse-button');
  const file = document.getElementById('csv-file');
  const download = document.getElementById('download-button');
  const error = document.getElementById('tool-error');
  const results = document.getElementById('results');
  let latest = null;

  function metric(value, label) {
    const box = document.createElement('div'); box.className = 'metric';
    const strong = document.createElement('strong'); strong.textContent = value;
    const caption = document.createElement('span'); caption.textContent = label;
    box.append(strong, caption); return box;
  }

  function chart(result) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'chart'); svg.setAttribute('viewBox', '0 0 600 145'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Range readings by sample; orange dots mark flagged readings');
    const values = result.rows.map(r => r.range).filter(Number.isFinite);
    if (!values.length) return svg;
    let min = Math.min(...values), max = Math.max(...values);
    const padding = Math.max(5, (max - min) * .15); min -= padding; max += padding;
    const x = i => 20 + i * 560 / Math.max(1, result.rows.length - 1);
    const y = value => 115 - (value - min) * 90 / (max - min);
    for (const level of [25, 70, 115]) {
      const grid = document.createElementNS(NS, 'line'); grid.setAttribute('class', 'grid');
      grid.setAttribute('x1', 20); grid.setAttribute('x2', 580); grid.setAttribute('y1', level); grid.setAttribute('y2', level); svg.append(grid);
    }
    let segment = [];
    function flush() {
      if (segment.length > 1) {
        const line = document.createElementNS(NS, 'polyline'); line.setAttribute('class', 'line'); line.setAttribute('points', segment.join(' ')); svg.append(line);
      }
      segment = [];
    }
    result.rows.forEach((r, i) => {
      if (Number.isFinite(r.range)) segment.push(`${x(i)},${y(r.range)}`); else flush();
      if (Number.isFinite(r.range)) {
        const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('class', r.status === 'valid' ? 'point' : 'flag');
        dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(r.range)); dot.setAttribute('r', r.status === 'valid' ? 3.5 : 5); svg.append(dot);
      }
    });
    flush();
    return svg;
  }

  function render(result) {
    results.replaceChildren();
    const metrics = document.createElement('div'); metrics.className = 'result-summary';
    metrics.append(metric(String(result.rows.length), 'samples'), metric(String(result.flagged), 'flagged'), metric(result.centre === null ? '—' : `${result.centre.toFixed(1)} mm`, 'median range'));
    const detail = document.createElement('p'); detail.className = 'result-detail';
    const counts = ['missing/invalid', 'low confidence', 'range outlier'].map(status => `${result.rows.filter(r => r.status === status).length} ${status}`).join(' · ');
    detail.textContent = counts + '. Outliers use 3 × scaled MAD, with a 5 mm minimum threshold.';
    results.append(metrics, chart(result), detail);
  }

  function run() {
    error.hidden = true;
    try { latest = analyseCsv(input.value); render(latest); download.disabled = false; }
    catch (e) { latest = null; download.disabled = true; results.replaceChildren(); error.textContent = e.message; error.hidden = false; }
  }
  button.addEventListener('click', run);
  file.addEventListener('change', async () => { if (file.files?.[0]) { input.value = await file.files[0].text(); run(); } });
  download.addEventListener('click', () => {
    if (!latest) return;
    const blob = new Blob([flaggedCsv(latest)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'flagged-sensor-log.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  run();
})();
