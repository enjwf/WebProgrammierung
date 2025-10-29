
export function plotLine(canvasId, labels, data, label, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  // Defensive: limit number of points to avoid creating a canvas that exceeds
  // browser maximum dimensions (causes InvalidStateError: setTransform)
  // Use a stricter default (1000) to reduce backing-store sizes on high-res displays
  const maxPoints = opts.maxPoints || 1000;
  let outLabels = labels;
  let outData = data;
  if (labels && labels.length > maxPoints) {
    const step = Math.ceil(labels.length / maxPoints);
    outLabels = labels.filter((_, i) => i % step === 0);
    outData = data.filter((_, i) => i % step === 0);
  }

  // Destroy existing chart instance on this canvas to avoid leaks
  try {
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
  } catch (e) {
    // ignore
  }

  // Force devicePixelRatio to 1 to avoid huge backing store sizes
  // (some environments still error even with downsampling if DPR>1)
  const forcedDPR = 1;

  const config = {
    type: 'line',
    data: {
      labels: outLabels,
      datasets: [{
        label,
        data: outData,
        fill: false,
        tension: .25,
        pointRadius: 0,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: true } },
      scales: {
        x: { ticks: { maxTicksLimit: 6, color: '#9aa0a6' }, grid: { color: 'rgba(255,255,255,.06)'} },
        y: { ticks: { color: '#9aa0a6' }, grid: { color: 'rgba(255,255,255,.06)'} }
      }
    }
  };

  // Try creating chart with forced DPR=1. If it still fails
  try {
    config.options.devicePixelRatio = forcedDPR;
    return new Chart(canvas, config);
  } catch (err) {
    console.error('plotLine: Chart creation failed', err);
    try {
      // Diagnostic logging to help debug: sizes and data length
      console.error('plotLine diagnostics:', {
        canvasClientWidth: canvas.clientWidth,
        canvasClientHeight: canvas.clientHeight,
        labelsLength: labels ? labels.length : 0,
        outLabelsLength: outLabels ? outLabels.length : 0,
        devicePixelRatio: window.devicePixelRatio
      });
    } catch (e) {
      // ignore diagnostic errors
    }
  }

  return null;
}
