// Portfolio Risk Analysis JavaScript

// Global variables
let portfolioData = [];
let priceChart = null;
let allocationChart = null;
let forecastChart = null;

// Sample stock data (in a real application, this would come from an API)
const sampleStockData = {
  'AAPL': {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    currentPrice: 175.43,
    dailyReturn: 0.0234,
    historicalPrices: [170.12, 171.45, 169.87, 172.34, 175.43],
    forecastPrices: [177.89, 180.12, 182.45, 184.78, 187.11, 189.44, 191.77]
  },
  'MSFT': {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    currentPrice: 378.85,
    dailyReturn: 0.0156,
    historicalPrices: [372.10, 374.25, 371.89, 375.42, 378.85],
    forecastPrices: [381.23, 383.61, 385.99, 388.37, 390.75, 393.13, 395.51]
  },
  'GOOGL': {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    currentPrice: 142.56,
    dailyReturn: -0.0089,
    historicalPrices: [143.89, 144.12, 142.78, 141.23, 142.56],
    forecastPrices: [144.12, 145.68, 147.24, 148.80, 150.36, 151.92, 153.48]
  },
  'TSLA': {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    currentPrice: 248.42,
    dailyReturn: 0.0456,
    historicalPrices: [238.12, 241.56, 239.89, 245.23, 248.42],
    forecastPrices: [252.18, 255.94, 259.70, 263.46, 267.22, 270.98, 274.74]
  },
  'AMZN': {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    currentPrice: 155.23,
    dailyReturn: 0.0123,
    historicalPrices: [153.45, 154.12, 152.89, 154.67, 155.23],
    forecastPrices: [156.45, 157.67, 158.89, 160.11, 161.33, 162.55, 163.77]
  }
};

// Symbol to company name mapping
const symbolNameMap = {
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'GOOGL': 'Alphabet Inc.',
  'TSLA': 'Tesla Inc.',
  'AMZN': 'Amazon.com Inc.'
  // Add more as needed
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
  setupEventListeners();
  updateLastUpdatedTime();
});

function initializeApp() {
  // No default values - form will be blank
  document.getElementById('confidenceLevel').value = '99';
  document.getElementById('timeHorizon').value = '1';
}

function setupEventListeners() {
  // Form submission
  document.getElementById('portfolioForm').addEventListener('submit', handleFormSubmit);

  // Clear form button
  document.getElementById('clearForm').addEventListener('click', clearForm);

  // Forecast chart controls
  document.getElementById('showHistorical').addEventListener('change', updateForecastChart);
  document.getElementById('showForecast').addEventListener('change', updateForecastChart);
}

function updateLastUpdatedTime() {
  const now = new Date();
  const timeString = now.toLocaleString();
  document.getElementById('lastUpdated').textContent = timeString;
}

function handleFormSubmit(e) {
  e.preventDefault();

  const symbols = document.getElementById('stockSymbols').value.trim();
  const quantities = document.getElementById('quantities').value.trim();
  const confidenceLevel = document.getElementById('confidenceLevel').value;
  const timeHorizon = document.getElementById('timeHorizon').value;

  // Validate inputs
  if (!symbols || !quantities) {
    alert('Please enter both stock symbols and quantities.');
    return;
  }

  const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());
  const quantityArray = quantities.split(',').map(q => parseInt(q.trim()));

  if (symbolArray.length !== quantityArray.length) {
    alert('Number of symbols must match number of quantities.');
    return;
  }

  // Show loading overlay
  showLoadingOverlay();

  // Fetch real-time prices from Flask backend
  fetch(`/api/stock-price?symbols=${symbolArray.join(',')}`)
    .then(response => response.json())
    .then(priceData => {
      analyzePortfolio(symbolArray, quantityArray, confidenceLevel, timeHorizon, priceData);
      hideLoadingOverlay();
    })
    .catch(err => {
      alert('Failed to fetch real-time stock prices.');
      hideLoadingOverlay();
    });
}

async function analyzePortfolio(symbols, quantities, confidenceLevel, timeHorizon, priceData) {
  // Process portfolio data
  portfolioData = [];
  let totalValue = 0;

  // First, process the basic price data
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const priceInfo = priceData[symbol];
    const quantity = quantities[i];

    if (priceInfo && priceInfo.current) {
      const value = priceInfo.current * quantity;
      totalValue += value;

      // Compute log return (more accurate than simple return)
      let dailyReturn = 0;
      if (priceInfo.previous_close && priceInfo.previous_close > 0 && priceInfo.current > 0) {
        dailyReturn = Math.log(priceInfo.current / priceInfo.previous_close);
      }

      // Get historical prices from the API response or fallback
      let historicalPrices = [];
      if (priceInfo.historical_prices && priceInfo.historical_prices.length >= 5) {
        historicalPrices = priceInfo.historical_prices.slice(-5); // Get last 5 days
      } else {
        // Fallback to using current price for historical data
        historicalPrices = [
          priceInfo.previous_close || priceInfo.current,
          priceInfo.open || priceInfo.current,
          priceInfo.low || priceInfo.current,
          priceInfo.high || priceInfo.current,
          priceInfo.current
        ];
      }

      // Fetch forecast data
      let forecastPrices = [];
      try {
        const response = await fetch(`/api/stock-forecast?symbol=${symbol}`);
        if (response.ok) {
          const forecastData = await response.json();
          if (forecastData.forecast_prices) {
            forecastPrices = forecastData.forecast_prices;
          }
        }
      } catch (error) {
        console.error(`Error fetching forecast for ${symbol}:`, error);
      }

      // GBM-based stochastic forecast (replaces deterministic geometric projection)
      if (forecastPrices.length === 0) {
        const lastPrice = historicalPrices[historicalPrices.length - 1];
        // Compute log returns from historical prices for mu/sigma
        const logRets = [];
        for (let k = 1; k < historicalPrices.length; k++) {
          if (historicalPrices[k - 1] > 0) {
            logRets.push(Math.log(historicalPrices[k] / historicalPrices[k - 1]));
          }
        }
        const mu = logRets.length > 0 ? logRets.reduce((s, r) => s + r, 0) / logRets.length : 0;
        const sigma = logRets.length > 1
          ? Math.sqrt(logRets.reduce((s, r) => s + Math.pow(r - mu, 2), 0) / (logRets.length - 1))
          : Math.abs(mu) * 0.5 || 0.01;
        // S(t) = S(0) * exp((mu - 0.5*sigma^2)*t + sigma*W_t)
        forecastPrices = Array(7).fill(0).map((_, i) => {
          const t = i + 1;
          const W = gaussianRandom();
          return lastPrice * Math.exp((mu - 0.5 * sigma * sigma) * t + sigma * Math.sqrt(t) * W);
        });
      }

      portfolioData.push({
        symbol: symbol,
        name: symbolNameMap[symbol] || symbol,
        currentPrice: priceInfo.current,
        dailyReturn: dailyReturn,
        historicalPrices: historicalPrices,
        forecastPrices: forecastPrices,
        quantity: quantity,
        value: value
      });
    } else {
      // Handle missing data
      portfolioData.push({
        symbol: symbol,
        name: symbolNameMap[symbol] || symbol,
        currentPrice: 0,
        dailyReturn: 0,
        historicalPrices: [0, 0, 0, 0, 0],
        forecastPrices: [0, 0, 0, 0, 0, 0, 0],
        quantity: quantity,
        value: 0
      });
    }
  }

  // Calculate weights
  portfolioData.forEach(stock => {
    stock.weight = totalValue > 0 ? (stock.value / totalValue) * 100 : 0;
  });

  // Calculate risk metrics
  const riskMetrics = calculateRiskMetrics(portfolioData, confidenceLevel, timeHorizon);

  // Update UI
  updateRiskMetrics(riskMetrics, totalValue);
  updatePortfolioTable();
  createPriceChart();
  createAllocationChart();
  createForecastChart();

  // Show results section and AI sections
  document.getElementById('resultsSection').style.display = 'block';
  document.getElementById('whatIfSection').style.display = 'block';
  document.getElementById('reportSection').style.display = 'block';

  // Scroll to results
  document.getElementById('resultsSection').scrollIntoView({
    behavior: 'smooth'
  });
}

// ─── Statistical helper functions ───────────────────────────────────────────

/** Box-Muller transform: returns a standard normal sample */
function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Build an N×N sample covariance matrix from log-return series.
 * @param {number[][]} logReturnSeries  Array of per-asset log-return arrays
 * @returns {number[][]}
 */
function calculateCovarianceMatrix(logReturnSeries) {
  const n = logReturnSeries.length;
  const means = logReturnSeries.map(r => r.reduce((s, x) => s + x, 0) / (r.length || 1));
  const cov = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const T = Math.min(logReturnSeries[i].length, logReturnSeries[j].length);
      if (T < 2) { cov[i][j] = 0; continue; }
      let sum = 0;
      for (let t = 0; t < T; t++) {
        sum += (logReturnSeries[i][t] - means[i]) * (logReturnSeries[j][t] - means[j]);
      }
      cov[i][j] = sum / (T - 1);
    }
  }
  return cov;
}

/**
 * Compute portfolio variance from weights and covariance matrix.
 * @param {number[]} weights
 * @param {number[][]} covarianceMatrix
 * @returns {number}
 */
function calculatePortfolioVariance(weights, covarianceMatrix) {
  let variance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      variance += weights[i] * weights[j] * covarianceMatrix[i][j];
    }
  }
  return variance;
}

/**
 * Analytical CVaR under normality.
 * @param {number} z          – z-score for the chosen confidence level
 * @param {number} sigma      – daily portfolio volatility (decimal)
 * @param {number} portfolioValue
 * @param {number} confidence – e.g. 0.99
 * @returns {number}
 */
function calculateCVaR(z, sigma, portfolioValue, confidence) {
  const pdf = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z);
  return (pdf / (1 - confidence)) * sigma * portfolioValue;
}

/**
 * Monte Carlo VaR.
 * @param {number} portfolioValue
 * @param {number} mu         – daily expected return
 * @param {number} sigma      – daily volatility
 * @param {number} simulations
 * @param {number} confidence – e.g. 0.99
 * @returns {number}          – VaR as a positive dollar loss
 */
function monteCarloVaR(portfolioValue, mu, sigma, simulations, confidence) {
  const results = [];
  for (let i = 0; i < simulations; i++) {
    const randomShock = mu + sigma * gaussianRandom();
    results.push(portfolioValue * randomShock);
  }
  results.sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * simulations);
  return Math.abs(results[index]);
}

// ─────────────────────────────────────────────────────────────────────────────

function calculateRiskMetrics(portfolio, confidenceLevel, timeHorizon) {
  // --- Confidence level z-score mapping ---
  let zScore;
  switch (String(confidenceLevel)) {
    case '90': zScore = 1.282; break;
    case '95': zScore = 1.645; break;
    case '99':
    default: zScore = 2.326;
  }
  const confidenceFraction = parseInt(confidenceLevel) / 100;

  const portfolioValue = portfolio.reduce((sum, stock) => sum + stock.value, 0);
  const weights = portfolio.map(stock => stock.weight / 100);

  // --- Log returns for each asset ---
  const logReturnSeries = portfolio.map(stock => {
    const prices = stock.historicalPrices;
    const returns = [];
    for (let t = 1; t < prices.length; t++) {
      if (prices[t - 1] > 0) {
        returns.push(Math.log(prices[t] / prices[t - 1]));
      } else {
        returns.push(0);
      }
    }
    return returns;
  });

  // --- Covariance-based portfolio variance (daily) ---
  const covMatrix = calculateCovarianceMatrix(logReturnSeries);
  const dailyVariance = calculatePortfolioVariance(weights, covMatrix);
  const dailyVolatility = Math.sqrt(dailyVariance);
  const portfolioVolatility = dailyVolatility * Math.sqrt(252); // annualised

  // --- Portfolio expected daily return (weighted log returns) ---
  const portfolioMu = portfolio.reduce((sum, stock, i) => {
    const series = logReturnSeries[i];
    const meanReturn = series.length > 0
      ? series.reduce((s, x) => s + x, 0) / series.length
      : 0;
    return sum + weights[i] * meanReturn;
  }, 0);

  // --- Parametric VaR (scaled to time horizon) ---
  const scaledVol = dailyVolatility * Math.sqrt(parseInt(timeHorizon));
  const varValue = portfolioValue * zScore * scaledVol;

  // --- Analytical CVaR (normal distribution) ---
  const cvarValue = calculateCVaR(zScore, scaledVol, portfolioValue, confidenceFraction);

  // --- Monte Carlo VaR (10,000 simulations, scaled to time horizon) ---
  const mcVaR = monteCarloVaR(portfolioValue, portfolioMu * parseInt(timeHorizon), dailyVolatility * Math.sqrt(parseInt(timeHorizon)), 10000, confidenceFraction);

  return {
    var: varValue,
    cvar: cvarValue,
    mcVar: mcVaR,
    volatility: portfolioVolatility * 100,
    portfolioValue: portfolioValue
  };
}

function updateRiskMetrics(metrics, totalValue) {
  document.getElementById('varValue').textContent = `$${metrics.var.toFixed(2)}`;
  document.getElementById('cvarValue').textContent = `$${metrics.cvar.toFixed(2)}`;
  document.getElementById('volatilityValue').textContent = `${metrics.volatility.toFixed(2)}%`;
  document.getElementById('portfolioValue').textContent = `$${totalValue.toLocaleString()}`;

  const confidenceLevel = document.getElementById('confidenceLevel').value;
  document.getElementById('varDetail').textContent = `${confidenceLevel}% Confidence`;

  document.getElementById('monteCarloVarValue').textContent = `$${metrics.mcVar.toFixed(2)}`;
}

function updatePortfolioTable() {
  const tbody = document.getElementById('portfolioTableBody');
  tbody.innerHTML = '';

  portfolioData.forEach(stock => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <div class="stock-symbol">${stock.symbol}</div>
          <div class="stock-name text-muted ms-2">${stock.name}</div>
        </div>
      </td>
      <td><strong>${stock.quantity.toLocaleString()}</strong></td>
      <td>$${stock.currentPrice.toFixed(2)}</td>
      <td>
        <div class="d-flex align-items-center">
          <div class="weight-bar me-2" style="width: 60px; height: 8px; background: #e5e7eb; border-radius: 4px;">
            <div class="weight-fill" style="width: ${stock.weight}%; height: 100%; background: var(--primary-color); border-radius: 4px;"></div>
          </div>
          <span>${stock.weight.toFixed(1)}%</span>
        </div>
      </td>
      <td><strong>$${stock.value.toLocaleString()}</strong></td>
      <td>
        <span class="return-badge ${stock.dailyReturn >= 0 ? 'positive' : 'negative'}">
          ${stock.dailyReturn >= 0 ? '+' : ''}${(stock.dailyReturn * 100).toFixed(2)}%
        </span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function createPriceChart() {
  const ctx = document.getElementById('priceChart').getContext('2d');

  if (priceChart) {
    priceChart.destroy();
  }

  const labels = ['5 days ago', '4 days ago', '3 days ago', '2 days ago', 'Yesterday'];
  const datasets = portfolioData.map((stock, index) => ({
    label: stock.symbol,
    data: stock.historicalPrices,
    borderColor: getChartColor(index),
    backgroundColor: getChartColor(index, 0.1),
    borderWidth: 2,
    fill: false,
    tension: 0.4
  }));

  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Historical Stock Prices (Last 5 Days)'
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function (value) {
              return '$' + value.toFixed(2);
            }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });
}

function createAllocationChart() {
  const ctx = document.getElementById('allocationChart').getContext('2d');

  if (allocationChart) {
    allocationChart.destroy();
  }

  const labels = portfolioData.map(stock => stock.symbol);
  const data = portfolioData.map(stock => stock.weight);
  const colors = portfolioData.map((_, index) => getChartColor(index));

  allocationChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
        title: {
          display: true,
          text: 'Portfolio Allocation by Weight'
        }
      }
    }
  });
}

function createForecastChart() {
  const container = document.getElementById('forecastChart');

  // Prepare data for Plotly
  const traces = [];

  // Historical data
  if (document.getElementById('showHistorical').checked) {
    portfolioData.forEach((stock, index) => {
      const historicalDates = [];
      const historicalPrices = [];

      // Generate dates for historical data
      for (let i = 4; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        historicalDates.push(date.toISOString().split('T')[0]);
        historicalPrices.push(stock.historicalPrices[4 - i]);
      }

      traces.push({
        x: historicalDates,
        y: historicalPrices,
        type: 'scatter',
        mode: 'lines+markers',
        name: `${stock.symbol} (Historical)`,
        line: {
          color: getChartColor(index),
          width: 3
        },
        marker: {
          size: 6
        }
      });
    });
  }

  // Forecast data
  if (document.getElementById('showForecast').checked) {
    portfolioData.forEach((stock, index) => {
      const forecastDates = [];
      const forecastPrices = [];

      // Generate dates for forecast data
      for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        forecastDates.push(date.toISOString().split('T')[0]);
        forecastPrices.push(stock.forecastPrices[i - 1]);
      }

      traces.push({
        x: forecastDates,
        y: forecastPrices,
        type: 'scatter',
        mode: 'lines+markers',
        name: `${stock.symbol} (Forecast)`,
        line: {
          color: getChartColor(index),
          width: 3,
          dash: 'dash'
        },
        marker: {
          size: 6
        }
      });
    });
  }

  const layout = {
    title: {
      text: '7-Day Stock Price Forecast',
      font: { size: 18 }
    },
    xaxis: {
      title: 'Date',
      type: 'date'
    },
    yaxis: {
      title: 'Price ($)',
      tickformat: '$.2f'
    },
    hovermode: 'x unified',
    showlegend: true,
    legend: {
      orientation: 'h',
      y: -0.2
    },
    margin: { t: 60, b: 80, l: 60, r: 40 }
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
  };

  Plotly.newPlot(container, traces, layout, config);
}

function updateForecastChart() {
  if (forecastChart) {
    createForecastChart();
  }
}

function getChartColor(index, alpha = 1) {
  const colors = [
    `rgba(99, 102, 241, ${alpha})`,   // Primary blue
    `rgba(139, 92, 246, ${alpha})`,   // Purple
    `rgba(6, 182, 212, ${alpha})`,    // Cyan
    `rgba(16, 185, 129, ${alpha})`,   // Green
    `rgba(245, 158, 11, ${alpha})`,   // Yellow
    `rgba(239, 68, 68, ${alpha})`,    // Red
    `rgba(59, 130, 246, ${alpha})`,   // Blue
    `rgba(168, 85, 247, ${alpha})`    // Violet
  ];
  return colors[index % colors.length];
}

function showLoadingOverlay() {
  document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoadingOverlay() {
  document.getElementById('loadingOverlay').classList.remove('show');
}

function clearForm() {
  document.getElementById('portfolioForm').reset();
  document.getElementById('resultsSection').style.display = 'none';

  // Hide AI sections
  document.getElementById('whatIfSection').style.display = 'none';
  document.getElementById('reportSection').style.display = 'none';

  // Clear charts
  if (priceChart) {
    priceChart.destroy();
    priceChart = null;
  }
  if (allocationChart) {
    allocationChart.destroy();
    allocationChart = null;
  }
  if (forecastChart) {
    Plotly.purge('forecastChart');
    forecastChart = null;
  }

  // Reset portfolio data
  portfolioData = [];
}

// Add CSS for return badges
const style = document.createElement('style');
style.textContent = `
  .return-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
  }
  .return-badge.positive {
    background-color: #dcfce7;
    color: #166534;
  }
  .return-badge.negative {
    background-color: #fee2e2;
    color: #dc2626;
  }
  .stock-symbol {
    font-weight: 600;
    color: var(--gray-900);
  }
  .stock-name {
    font-size: 0.875rem;
  }
`;
document.head.appendChild(style);

// ─── What-If Scenario Analyzer ──────────────────────────────────────────────

let lastRiskMetrics = {};

function fillWhatIf(text) {
  document.getElementById('whatIfInput').value = text;
}

function analyzeWhatIf() {
  const question = document.getElementById('whatIfInput').value.trim();
  if (!question) {
    alert('Please enter a "What If" question.');
    return;
  }

  if (portfolioData.length === 0) {
    alert('Please analyze your portfolio first.');
    return;
  }

  const btn = document.getElementById('whatIfBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Analyzing...';

  const resultDiv = document.getElementById('whatIfResult');
  resultDiv.style.display = 'block';
  document.getElementById('whatIfResponse').innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3 text-muted">AI is analyzing your scenario...</p>
    </div>`;

  const portfolioPayload = portfolioData.map(stock => ({
    symbol: stock.symbol,
    quantity: stock.quantity,
    currentPrice: stock.currentPrice,
    weight: stock.weight,
    dailyReturn: stock.dailyReturn
  }));

  fetch('/api/what-if', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      portfolio: portfolioPayload,
      action: question
    })
  })
  .then(response => response.json())
  .then(data => {
    const responseDiv = document.getElementById('whatIfResponse');
    if (typeof marked !== 'undefined') {
      responseDiv.innerHTML = marked.parse(data.analysis);
    } else {
      responseDiv.innerHTML = data.analysis.replace(/\n/g, '<br>');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic me-2"></i>Analyze';
  })
  .catch(err => {
    document.getElementById('whatIfResponse').innerHTML = `
      <div class="text-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>Failed to get AI analysis. Please try again.
      </div>`;
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic me-2"></i>Analyze';
  });
}

// ─── AI Report Generator ────────────────────────────────────────────────────

function generateAIReport() {
  if (portfolioData.length === 0) {
    alert('Please analyze your portfolio first.');
    return;
  }

  const btn = document.getElementById('generateReportBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';

  const preview = document.getElementById('reportPreview');
  preview.style.display = 'block';
  document.getElementById('reportContent').innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3 text-muted">AI is generating your professional report...</p>
      <small class="text-muted">This may take 15-30 seconds</small>
    </div>`;

  const riskMetrics = {
    var: parseFloat(document.getElementById('varValue').textContent.replace('$', '').replace(',', '')) || 0,
    cvar: parseFloat(document.getElementById('cvarValue').textContent.replace('$', '').replace(',', '')) || 0,
    volatility: parseFloat(document.getElementById('volatilityValue').textContent.replace('%', '')) || 0,
    portfolioValue: parseFloat(document.getElementById('portfolioValue').textContent.replace('$', '').replace(/,/g, '')) || 0
  };

  lastRiskMetrics = riskMetrics;

  const portfolioPayload = portfolioData.map(stock => ({
    symbol: stock.symbol,
    quantity: stock.quantity,
    currentPrice: stock.currentPrice,
    weight: stock.weight,
    dailyReturn: stock.dailyReturn
  }));

  fetch('/api/generate-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      portfolio: portfolioPayload,
      riskMetrics: riskMetrics,
      confidenceLevel: document.getElementById('confidenceLevel').value,
      timeHorizon: document.getElementById('timeHorizon').value
    })
  })
  .then(response => response.json())
  .then(data => {
    const contentDiv = document.getElementById('reportContent');
    if (typeof marked !== 'undefined') {
      contentDiv.innerHTML = marked.parse(data.report);
    } else {
      contentDiv.innerHTML = data.report.replace(/\n/g, '<br>');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Report';
  })
  .catch(err => {
    document.getElementById('reportContent').innerHTML = `
      <div class="text-center text-danger py-4">
        <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
        <p>Failed to generate report. Please try again.</p>
      </div>`;
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Report';
  });
}

function downloadReportPDF() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    alert('PDF library not loaded. Please refresh and try again.');
    return;
  }

  const btn = document.querySelector('[onclick="downloadReportPDF()"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating PDF...';

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);
  let y = 0;

  function checkPage(needed) {
    if (y + needed > pageHeight - 15) {
      addFooter();
      pdf.addPage();
      y = 15;
    }
  }

  function addFooter() {
    pdf.setFontSize(7);
    pdf.setTextColor(160, 160, 160);
    pdf.setFont('helvetica', 'normal');
    const pg = pdf.internal.getNumberOfPages();
    pdf.text(`FinSight AI Report  |  Page ${pg}`, margin, pageHeight - 8);
    pdf.text('Powered by Groq AI', pageWidth - margin - 32, pageHeight - 8);
  }

  // ── Header Banner ──
  pdf.setFillColor(99, 102, 241);
  pdf.rect(0, 0, pageWidth, 38, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FinSight Portfolio Risk Report', margin, 18);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, 28);
  pdf.text(`Confidence: ${document.getElementById('confidenceLevel').value}%  |  Horizon: ${document.getElementById('timeHorizon').value} Day(s)`, margin, 34);

  // ── Metrics Bar ──
  pdf.setFillColor(243, 244, 246);
  pdf.rect(0, 40, pageWidth, 18, 'F');
  pdf.setTextColor(55, 65, 81);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  const my = 51;
  pdf.text(`Portfolio: $${(lastRiskMetrics.portfolioValue || 0).toLocaleString()}`, margin, my);
  pdf.text(`VaR: $${(lastRiskMetrics.var || 0).toFixed(2)}`, margin + 50, my);
  pdf.text(`CVaR: $${(lastRiskMetrics.cvar || 0).toFixed(2)}`, margin + 95, my);
  pdf.text(`Volatility: ${(lastRiskMetrics.volatility || 0).toFixed(2)}%`, margin + 140, my);

  // ── Holdings Table ──
  y = 64;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('Portfolio Holdings', margin, y);
  y += 6;

  // Table header
  pdf.setFillColor(99, 102, 241);
  pdf.rect(margin, y, contentWidth, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  const cols = [margin + 2, margin + 22, margin + 42, margin + 68, margin + 95, margin + 130];
  pdf.text('Symbol', cols[0], y + 5);
  pdf.text('Qty', cols[1], y + 5);
  pdf.text('Price', cols[2], y + 5);
  pdf.text('Weight', cols[3], y + 5);
  pdf.text('Value', cols[4], y + 5);
  pdf.text('Return', cols[5], y + 5);
  y += 9;

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  portfolioData.forEach((stock, i) => {
    checkPage(7);
    if (i % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, y - 4, contentWidth, 7, 'F');
    }
    pdf.setTextColor(55, 65, 81);
    pdf.setFontSize(8);
    pdf.text(stock.symbol, cols[0], y);
    pdf.text(String(stock.quantity), cols[1], y);
    pdf.text(`$${stock.currentPrice.toFixed(2)}`, cols[2], y);
    pdf.text(`${stock.weight.toFixed(1)}%`, cols[3], y);
    pdf.text(`$${stock.value.toLocaleString()}`, cols[4], y);
    const ret = (stock.dailyReturn * 100).toFixed(2);
    if (stock.dailyReturn >= 0) {
      pdf.setTextColor(16, 185, 129);
      pdf.text(`+${ret}%`, cols[5], y);
    } else {
      pdf.setTextColor(239, 68, 68);
      pdf.text(`${ret}%`, cols[5], y);
    }
    y += 7;
  });

  y += 6;

  // ── Divider ──
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── AI Report Content ──
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  checkPage(10);
  pdf.text('AI Analysis Report', margin, y);
  y += 8;

  const reportEl = document.getElementById('reportContent');
  const textContent = reportEl.innerText || reportEl.textContent;
  const lines = textContent.split('\n');

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      y += 3;
      return;
    }

    const isHeading = /^\d+\.\s/.test(trimmed) || trimmed.startsWith('#');
    const cleanLine = trimmed.replace(/^#+\s*/, '');

    if (isHeading) {
      checkPage(12);
      y += 3;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(99, 102, 241);
      const headingLines = pdf.splitTextToSize(cleanLine, contentWidth);
      headingLines.forEach(hl => {
        checkPage(6);
        pdf.text(hl, margin, y);
        y += 6;
      });
      // underline
      pdf.setDrawColor(99, 102, 241);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y - 2, margin + 60, y - 2);
      y += 2;
    } else {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);

      const isBullet = trimmed.startsWith('-') || trimmed.startsWith('•');
      const textLine = isBullet ? trimmed.substring(1).trim() : trimmed;
      const xOffset = isBullet ? margin + 5 : margin;
      const wrapWidth = isBullet ? contentWidth - 5 : contentWidth;

      const wrapped = pdf.splitTextToSize(textLine, wrapWidth);
      wrapped.forEach((wl, wi) => {
        checkPage(5);
        if (isBullet && wi === 0) {
          pdf.setFillColor(99, 102, 241);
          pdf.circle(margin + 1.5, y - 1.2, 0.8, 'F');
        }
        pdf.text(wl, wi === 0 ? xOffset : xOffset, y);
        y += 4.5;
      });
      y += 1;
    }
  });

  // ── Footer on all pages ──
  addFooter();
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i < totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(160, 160, 160);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`FinSight AI Report  |  Page ${i} of ${totalPages}`, margin, pageHeight - 8);
    pdf.text('Powered by Groq AI', pageWidth - margin - 32, pageHeight - 8);
  }
  // Fix last page footer too
  pdf.setPage(totalPages);
  pdf.setFontSize(7);
  pdf.setTextColor(160, 160, 160);
  pdf.text(`FinSight AI Report  |  Page ${totalPages} of ${totalPages}`, margin, pageHeight - 8);
  pdf.text('Powered by Groq AI', pageWidth - margin - 32, pageHeight - 8);

  pdf.save(`FinSight_Portfolio_Report_${new Date().toISOString().split('T')[0]}.pdf`);

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-download me-2"></i>Download PDF';
}
