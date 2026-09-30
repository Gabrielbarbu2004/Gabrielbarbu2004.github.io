(function () {
  'use strict';

  function calculate(sampleRate, signalFrequency, sampleCount) {
    if (![sampleRate, signalFrequency, sampleCount].every(Number.isFinite) ||
        sampleRate <= 0 || signalFrequency <= 0 ||
        !Number.isInteger(sampleCount) || sampleCount < 2 || sampleCount > 10000000) {
      throw new Error('Enter positive frequencies and a whole sample count from 2 to 10,000,000.');
    }
    const nyquist = sampleRate / 2;
    return {
      nyquist,
      spacing: sampleRate / sampleCount,
      duration: sampleCount / sampleRate,
      ratio: sampleRate / (2 * signalFrequency),
      sufficient: sampleRate > 2 * signalFrequency
    };
  }

  if (typeof module !== 'undefined') module.exports = { calculate };
  if (typeof document === 'undefined') return;

  const form = document.getElementById('sampling-form');
  if (!form) return;
  const results = document.getElementById('sampling-results');
  const error = document.getElementById('sampling-error');
  const number = (value, unit) => `${Number(value.toPrecision(4)).toLocaleString('en-GB')} ${unit}`;

  function metric(value, label) {
    const box = document.createElement('div'); box.className = 'metric';
    const strong = document.createElement('strong'); strong.textContent = value;
    const caption = document.createElement('span'); caption.textContent = label;
    box.append(strong, caption); return box;
  }

  function render() {
    error.hidden = true;
    try {
      const rate = Number(form.elements['sample-rate'].value);
      const frequency = Number(form.elements['signal-frequency'].value);
      const count = Number(form.elements['fft-size'].value);
      if (!form.elements['sample-rate'].value || !form.elements['signal-frequency'].value || !form.elements['fft-size'].value) {
        throw new Error('Fill in all three fields.');
      }
      const result = calculate(rate, frequency, count);
      const status = document.createElement('p');
      status.className = `status-banner${result.sufficient ? '' : ' warn'}`;
      status.textContent = result.sufficient
        ? `Above Nyquist: ${Number(result.ratio.toPrecision(3))}× the minimum sample rate.`
        : 'At or below the Nyquist limit: choose a higher sample rate for this signal.';
      const metrics = document.createElement('div'); metrics.className = 'result-summary';
      metrics.append(
        metric(number(result.nyquist, 'Hz'), 'Nyquist frequency'),
        metric(number(result.spacing, 'Hz'), 'FFT bin spacing'),
        metric(number(result.duration, 's'), 'Capture duration'),
        metric(`${Number(result.ratio.toPrecision(3))}×`, 'Sample-rate margin')
      );
      const detail = document.createElement('p'); detail.className = 'result-detail';
      detail.textContent = 'A narrower FFT bin spacing can help separate nearby frequencies, but does not by itself guarantee accurate amplitude or detection.';
      results.replaceChildren(status, metrics, detail);
    } catch (e) {
      results.replaceChildren(); error.textContent = e.message; error.hidden = false;
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); render(); });
  render();
})();
