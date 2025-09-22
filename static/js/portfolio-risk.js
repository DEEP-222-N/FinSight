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
document.addEventListener('DOMContentLoaded', function() {
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
      
      // Calculate daily return if possible
      let dailyReturn = 0;
      if (priceInfo.previous_close && priceInfo.previous_close !== 0) {
        dailyReturn = (priceInfo.current - priceInfo.previous_close) / priceInfo.previous_close;
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
      
      // If forecast fetch failed, use a simple projection based on recent returns
      if (forecastPrices.length === 0) {
        const lastPrice = historicalPrices[historicalPrices.length - 1];
        const avgReturn = historicalPrices.length > 1 ? 
          (historicalPrices[historicalPrices.length - 1] / historicalPrices[0]) ** (1 / (historicalPrices.length - 1)) - 1 : 0;
        forecastPrices = Array(7).fill(0).map((_, i) => 
          lastPrice * Math.pow(1 + avgReturn, i + 1)
        );
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
  
  // Show results section
  document.getElementById('resultsSection').style.display = 'block';

  // Scroll to results
  document.getElementById('resultsSection').scrollIntoView({ 
    behavior: 'smooth' 
  });
}

function calculateRiskMetrics(portfolio, confidenceLevel, timeHorizon) {
  // Calculate portfolio variance using weights and correlations
  let portfolioVariance = 0;
  const portfolioReturn = portfolio.reduce((sum, stock) => sum + (stock.dailyReturn * stock.weight / 100), 0);
  
  // Simplified calculation (in reality, you'd use correlation matrix)
  portfolio.forEach(stock => {
    const weight = stock.weight / 100;
    portfolioVariance += Math.pow(weight * stock.dailyReturn, 2);
  });
  
  const portfolioVolatility = Math.sqrt(portfolioVariance) * Math.sqrt(252); // Annualized
  const portfolioValue = portfolio.reduce((sum, stock) => sum + stock.value, 0);
  
  // Calculate VaR
  let zScore;
  switch(confidenceLevel) {
    case '90':
      zScore = 1.282; // For 90% confidence
      break;
    case '95':
      zScore = 1.645; // For 95% confidence
      break;
    case '99':
    default:
      zScore = 2.326; // For 99% confidence
  }
  const dailyVolatility = portfolioVolatility / Math.sqrt(252);
  const varValue = portfolioValue * zScore * dailyVolatility * Math.sqrt(parseInt(timeHorizon));
  
  // Calculate CVaR (simplified)
  const cvarValue = varValue * 1.2; // CVaR is typically 20-30% higher than VaR
  
  return {
    var: varValue,
    cvar: cvarValue,
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
            callback: function(value) {
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
