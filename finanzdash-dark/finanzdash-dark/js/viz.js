
export function plotLine(canvasId, labels, data, label) {
  const ctx = document.getElementById(canvasId);
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data,
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
  });
}
