// Market Pulse Dashboard JavaScript

let sectorChart = null;

document.addEventListener('DOMContentLoaded', function() {
  loadMarketData();
});

function loadMarketData() {
  document.getElementById('loadingOverlay').classList.add('show');

  fetch('/api/market-pulse')
    .then(response => response.json())
    .then(data => {
      renderIndices(data.indices);
      renderMovers(data.movers);
      renderSectors(data.sectors);
      createSectorChart(data.sectors);
      renderAICommentary(data.ai_commentary, data.timestamp);
      document.getElementById('lastUpdated').textContent = data.timestamp;
      document.getElementById('loadingOverlay').classList.remove('show');
    })
    .catch(err => {
      console.error('Error loading market data:', err);
      document.getElementById('loadingOverlay').classList.remove('show');
      document.getElementById('aiCommentary').innerHTML = `
        <div class="text-center py-4 text-danger">
          <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
          <p>Failed to load market data. Please try again.</p>
        </div>`;
    });
}

function renderIndices(indices) {
  const container = document.getElementById('indicesContainer');
  if (!indices || Object.keys(indices).length === 0) {
    container.innerHTML = '<div class="col-12 text-center py-4 text-muted">No index data available</div>';
    return;
  }

  container.innerHTML = '';
  for (const [name, data] of Object.entries(indices)) {
    const isPositive = data.change >= 0;
    const icon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';

    container.innerHTML += `
      <div class="col-lg-3 col-md-6 mb-4 fade-in">
        <div class="index-card ${isPositive ? 'positive' : 'negative'}">
          <div class="index-name">${name}</div>
          <div class="index-price">$${data.price.toLocaleString()}</div>
          <div class="index-change ${isPositive ? 'positive' : 'negative'}">
            <i class="fas ${icon}"></i>
            ${isPositive ? '+' : ''}${data.change.toFixed(2)}%
          </div>
        </div>
      </div>`;
  }
}

function renderMovers(movers) {
  const tbody = document.getElementById('moversBody');
  if (!movers || movers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No data available</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  movers.forEach(mover => {
    const isPositive = mover.change >= 0;
    tbody.innerHTML += `
      <tr class="fade-in">
        <td><strong>${mover.symbol}</strong></td>
        <td>$${mover.price.toFixed(2)}</td>
        <td>
          <span class="change-badge ${isPositive ? 'positive' : 'negative'}">
            ${isPositive ? '+' : ''}${mover.change.toFixed(2)}%
          </span>
        </td>
        <td>${formatVolume(mover.volume)}</td>
      </tr>`;
  });
}

function renderSectors(sectors) {
  const container = document.getElementById('sectorsContainer');
  if (!sectors || Object.keys(sectors).length === 0) {
    container.innerHTML = '<div class="col-12 text-center py-4 text-muted">No sector data available</div>';
    return;
  }

  container.innerHTML = '';
  const sorted = Object.entries(sectors).sort((a, b) => b[1].change - a[1].change);

  sorted.forEach(([name, data]) => {
    const isPositive = data.change >= 0;
    container.innerHTML += `
      <div class="col-lg-3 col-md-4 col-sm-6 mb-3 fade-in">
        <div class="sector-card">
          <span class="sector-name">${name}</span>
          <span class="sector-change ${isPositive ? 'positive' : 'negative'}">
            ${isPositive ? '+' : ''}${data.change.toFixed(2)}%
          </span>
        </div>
      </div>`;
  });
}

function createSectorChart(sectors) {
  const ctx = document.getElementById('sectorChart').getContext('2d');

  if (sectorChart) sectorChart.destroy();

  if (!sectors || Object.keys(sectors).length === 0) return;

  const sorted = Object.entries(sectors).sort((a, b) => b[1].change - a[1].change);
  const labels = sorted.map(([name]) => name);
  const data = sorted.map(([, d]) => d.change);
  const colors = data.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)');
  const borderColors = data.map(v => v >= 0 ? '#059669' : '#dc2626');

  sectorChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Daily Change %',
        data: data,
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Sector Performance (Daily Change %)',
          font: { size: 16, weight: '700' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            callback: function(value) { return value.toFixed(2) + '%'; }
          }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11, weight: '600' } }
        }
      }
    }
  });
}

function renderAICommentary(commentary, timestamp) {
  const container = document.getElementById('aiCommentary');
  const tsEl = document.getElementById('aiTimestamp');

  if (timestamp) {
    tsEl.textContent = `Analysis generated at ${timestamp}`;
  }

  if (!commentary) {
    container.innerHTML = `
      <div class="text-center py-4">
        <i class="fas fa-key fa-2x mb-3" style="color: var(--warning-color);"></i>
        <p><strong>AI Commentary Unavailable</strong></p>
        <p class="text-muted">Please add your Grok API key to the .env file as XAI_API_KEY to enable AI-powered market analysis.</p>
      </div>`;
    return;
  }

  if (typeof marked !== 'undefined') {
    container.innerHTML = marked.parse(commentary);
  } else {
    container.innerHTML = commentary.replace(/\n/g, '<br>');
  }
}

function formatVolume(volume) {
  if (volume >= 1e9) return (volume / 1e9).toFixed(1) + 'B';
  if (volume >= 1e6) return (volume / 1e6).toFixed(1) + 'M';
  if (volume >= 1e3) return (volume / 1e3).toFixed(1) + 'K';
  return volume.toString();
}
