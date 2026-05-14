# FinSight - AI-Powered Financial Risk Analysis Platform

FinSight is a comprehensive web-based financial risk analysis platform that combines real-time market data, machine learning models, and **AI-powered insights (Groq)** to help users make informed investment and lending decisions. Built with Flask, it features portfolio risk assessment, credit risk evaluation, stock price forecasting, and an AI market intelligence dashboard.

## Live Demo

[https://finsight-r7dh.onrender.com](https://finsight-r7dh.onrender.com)

## Features

### Portfolio Market Risk Analysis
- **Value at Risk (VaR) Calculation**: Compute portfolio risk at various confidence levels (90%, 95%, 99%)
- **Conditional VaR (CVaR)**: Expected shortfall calculations for extreme risk scenarios
- **Portfolio Volatility**: Annualized volatility and risk metrics
- **Interactive Visualizations**: Historical price trends and portfolio allocation charts
- **Multi-time Horizon Analysis**: Risk assessment for 1, 5, 10, or 30-day periods
- **AI "What If" Scenario Analyzer**: Ask AI questions like "What if I sell AAPL and buy TSLA?" and get risk impact analysis
- **AI Portfolio Report Generator**: Generate professional PDF reports with executive summary, stress scenarios, and recommendations

### AI Market Pulse Dashboard
- **Real-time Market Indices**: Track S&P 500, Dow Jones, NASDAQ, Russell 2000 with live data
- **Top Movers Analysis**: Top 10 stocks sorted by biggest daily moves with volume data
- **Sector Performance Heatmap**: 11 sectors (Technology, Financials, Healthcare, Energy, etc.) with visual bar chart
- **Sector Rotation Insights**: Understand which sectors are gaining or losing momentum
- **AI Market Commentary**: Groq-powered analysis covering market overview, key drivers, sector rotation, and short-term outlook

### Credit Risk Assessment
- **Loan Approval Prediction**: Machine learning model-based loan approval probability
- **Risk Scoring**: Automated assessment based on applicant financial data
- **Confidence Metrics**: Prediction confidence levels for informed decision making
- **Stress Testing**: Adverse scenario simulation with economic shocks

### Stock Price Forecasting
- **7-Day Price Predictions**: LSTM neural network-based stock price forecasting
- **Historical Data Integration**: Uses 30 days of historical data for accurate predictions
- **GBM Fallback**: Geometric Brownian Motion stochastic forecast when ML model is unavailable
- **Interactive Forecast Charts**: Plotly-based visualization with toggleable historical and forecast data

## Technology Stack

### Backend
- **Python 3.11** - Core language
- **Flask** - Web framework
- **Groq API** (LLaMA 3.3 70B) - AI-powered financial analysis, market commentary, and report generation
- **TensorFlow/Keras** - LSTM neural network for stock price forecasting
- **Scikit-learn** - Machine learning for credit risk assessment
- **Pandas & NumPy** - Data processing and numerical computing
- **YFinance** - Historical stock data retrieval
- **Finnhub API** - Real-time stock prices and market data

### Frontend
- **HTML5** - Semantic markup with responsive design
- **Bootstrap 5.3** - CSS framework for responsive layout
- **JavaScript (ES6+)** - Interactive functionality
- **Chart.js** - Data visualization (line, doughnut, bar charts)
- **Plotly.js** - Advanced interactive charting
- **Marked.js** - Markdown rendering for AI responses
- **jsPDF** - Client-side PDF report generation
- **Font Awesome 6** - Icon library

### DevOps & Deployment
- **Docker** - Containerization
- **Gunicorn** - Production WSGI server
- **Render** - Cloud deployment
- **Heroku** - Alternative deployment (Procfile included)

## Project Structure

```
FinSight/
├── app.py                              # Main Flask application
├── requirements.txt                    # Python dependencies
├── .env                               # Environment variables (not in git)
├── .gitignore                         # Git ignore rules
├── Dockerfile                         # Docker configuration
├── Procfile                           # Heroku deployment config
├── README.md                          # This file
│
├── templates/                         # HTML templates
│   ├── index.html                    # Landing page
│   ├── portfolio-risk.html           # Portfolio risk analysis + AI What-If + PDF Report
│   ├── credit-risk.html              # Credit risk assessment
│   └── market-pulse.html             # AI Market Pulse dashboard
│
├── static/                            # Static assets
│   ├── css/
│   │   ├── style.css                # Global styles
│   │   ├── portfolio-risk.css       # Portfolio risk + AI sections styles
│   │   ├── credit-risk.css          # Credit risk styles
│   │   └── market-pulse.css         # Market Pulse dashboard styles
│   │
│   └── js/
│       ├── portfolio-risk.js        # Portfolio risk + What-If + PDF logic
│       ├── credit-risk.js           # Credit risk logic
│       └── market-pulse.js          # Market Pulse dashboard logic
│
├── stock_model_7day.h5               # Pre-trained LSTM model
├── scaler.pkl                        # Data scaler for stock model
└── loan_approval_model_subset.pkl    # Loan classification model
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Home / Landing page |
| `/portfolio-risk.html` | GET | Portfolio risk analysis page |
| `/credit-risk.html` | GET | Credit risk assessment page |
| `/market-pulse` | GET | AI Market Pulse dashboard |
| `/api/stock-price` | GET | Get current and 5-day historical stock prices |
| `/api/stock-forecast` | GET | Get 7-day LSTM stock price forecast |
| `/api/risk-metrics` | POST | Calculate portfolio VaR, CVaR, volatility |
| `/predict-loan` | POST | Predict loan approval using ML model |
| `/api/market-pulse` | GET | Get market indices, sectors, movers + AI commentary |
| `/api/what-if` | POST | AI "What If" scenario analysis for portfolio changes |
| `/api/generate-report` | POST | Generate AI-powered professional portfolio report |

## Quick Start

### Prerequisites
- Python 3.11 or higher
- Groq API key (free at [console.groq.com](https://console.groq.com))
- Finnhub API key (free at [finnhub.io](https://finnhub.io))

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/DEEP-222-N/FinSight/
   cd FinSight
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file
   echo "FINNHUB_API_KEY=your_finnhub_key" > .env
   echo "XAI_API_KEY=your_groq_api_key" >> .env
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Open your browser**
   Navigate to `http://localhost:5000`

### Docker Deployment

```bash
docker build -t finsight .
docker run -p 5000:5000 --env-file .env finsight
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FINNHUB_API_KEY` | Yes | Finnhub API key for real-time stock data |
| `XAI_API_KEY` | Yes | Groq API key for AI-powered features |

### Getting API Keys

1. **Groq API Key** (Free)
   - Sign up at [console.groq.com](https://console.groq.com)
   - Create an API key (starts with `gsk_`)
   - Free tier: 30 requests/minute

2. **Finnhub API Key** (Free)
   - Sign up at [finnhub.io](https://finnhub.io)
   - Get your API key from the dashboard

## AI Features (Powered by Groq)

### AI "What If" Scenario Analyzer
Ask natural language questions about portfolio changes:
- *"What if I sell AAPL and buy TSLA instead?"*
- *"What if a 20% market crash happens?"*
- *"Should I add NVDA to diversify?"*

The AI analyzes your current portfolio context and provides risk impact assessment, concentration analysis, and a clear recommendation.

### AI Portfolio Report Generator
Generates a professional PDF report with:
- Executive Summary
- Portfolio Composition Analysis
- Detailed Risk Assessment (VaR, CVaR interpretation)
- Stress Scenarios (market crash, moderate decline, sector rotation)
- Actionable Recommendations
- Overall Risk Rating

### AI Market Pulse
Real-time market intelligence dashboard with:
- Market indices tracking
- Sector rotation analysis
- Top movers with AI explanations
- Short-term market outlook

## Machine Learning Models

### Stock Price Forecasting (LSTM)
- **Architecture**: Long Short-Term Memory Neural Network
- **Input**: 30 days of historical closing prices
- **Output**: 7-day price predictions
- **Preprocessing**: MinMaxScaler normalization
- **Fallback**: GBM stochastic forecast

### Credit Risk Classification
- **Type**: Supervised classification (loan approval)
- **Features**: Employment status, income, loan amount, term, credit score
- **Output**: Approval/Rejection with confidence probability
- **Framework**: Scikit-learn

### Portfolio Risk Engine
- **Parametric VaR**: Using z-scores and covariance matrices
- **Analytical CVaR**: Expected shortfall under normal distribution
- **Monte Carlo VaR**: 10,000 simulations
- **Covariance Matrix**: Calculated from log returns

## Acknowledgments

- [Groq](https://groq.com) for ultra-fast AI inference
- [Finnhub](https://finnhub.io) for real-time stock market API
- [Yahoo Finance](https://finance.yahoo.com) for historical data
- [Bootstrap](https://getbootstrap.com) for UI components
- [Chart.js](https://www.chartjs.org) & [Plotly.js](https://plotly.com/javascript/) for data visualization

---

**FinSight** - Empowering financial decisions through AI-powered risk analysis and machine learning.
