# FinSight - Financial Risk Analysis Platform

FinSight is a comprehensive web-based financial risk analysis platform that provides advanced portfolio risk assessment, credit risk evaluation, and stock price forecasting capabilities. Built with Flask, the application combines real-time market data, machine learning models, and interactive visualizations to help users make informed investment and lending decisions.

## 🚀 Features

### 📊 Portfolio Market Risk Analysis
- **Value at Risk (VaR) Calculation**: Compute portfolio risk at various confidence levels (90%, 95%, 99%)
- **Conditional VaR (CVaR)**: Expected shortfall calculations for extreme risk scenarios
- **Portfolio Volatility**: Annualized volatility and risk metrics
- **Interactive Visualizations**: Historical price trends and portfolio allocation charts
- **Multi-time Horizon Analysis**: Risk assessment for 1, 5, 10, or 30-day periods

### 🤖 Credit Risk Assessment
- **Loan Approval Prediction**: Machine learning model-based loan approval probability
- **Risk Scoring**: Automated assessment based on applicant financial data
- **Confidence Metrics**: Prediction confidence levels for informed decision making

### 📈 Stock Price Forecasting
- **7-Day Price Predictions**: LSTM neural network-based stock price forecasting
- **Historical Data Integration**: Uses 30 days of historical data for accurate predictions
- **Fallback Methods**: Alternative forecasting when ML models are unavailable
- **Interactive Forecast Charts**: Visual representation of predicted vs. historical prices

### 🔗 Real-time Market Data
- **Finnhub API Integration**: Live stock prices and market data
- **Yahoo Finance Integration**: Historical price data for analysis
- **Multi-symbol Support**: Analyze multiple stocks simultaneously

## 🛠️ Technology Stack

### Backend
- **Python 3.11**
- **Flask**: Web framework for API development
- **TensorFlow**: Deep learning for stock price forecasting
- **Scikit-learn**: Machine learning for credit risk assessment
- **Pandas & NumPy**: Data processing and analysis
- **YFinance**: Historical stock data retrieval
- **Requests**: API communication

### Frontend
- **HTML5**: Semantic markup with responsive design
- **Bootstrap 5**: Modern CSS framework for styling
- **JavaScript (ES6+)**: Interactive functionality
- **Chart.js**: Data visualization and charts
- **Plotly.js**: Advanced interactive charts

### DevOps & Deployment
- **Docker**: Containerization for easy deployment
- **Gunicorn**: WSGI server for production deployment
- **Python-dotenv**: Environment variable management

## 🏗️ Project Structure

```
FinSight/
├── app.py                    # Main Flask application
├── requirements.txt          # Python dependencies
├── Dockerfile               # Docker configuration
├── templates/               # HTML templates
│   ├── index.html          # Landing page
│   ├── portfolio-risk.html # Portfolio risk analysis page
│   └── credit-risk.html    # Credit risk assessment page
├── static/                 # Static assets
│   ├── css/               # Stylesheets
│   └── js/                # JavaScript files
├── stock_model_7day.h5     # Pre-trained LSTM model (not included)
├── scaler.pkl             # Data scaler for ML model (not included)
└── loan_approval_model_subset.pkl  # Loan prediction model (not included)
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11 or higher
- Docker (optional, for containerized deployment)
- API keys (see Configuration section)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FinSight
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env file with your API keys (see Configuration section)
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

### Docker Deployment

1. **Build and run with Docker**
   ```bash
   docker build -t finsight .
   docker run -p 5000:5000 --env-file .env finsight
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Finnhub API Key (required for real-time stock data)
FINNHUB_API_KEY=your_finnhub_api_key_here

# Optional: Custom Flask settings
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=true
```

### API Keys Setup

1. **Finnhub API Key**
   - Sign up at [finnhub.io](https://finnhub.io)
   - Get your free API key from the dashboard
   - Add it to your `.env` file as `FINNHUB_API_KEY`

## 📖 Usage Guide

### Portfolio Risk Analysis

1. Navigate to "Portfolio Risk" section
2. Enter stock symbols (e.g., "AAPL, MSFT, GOOGL")
3. Provide corresponding quantities
4. Select confidence level and time horizon
5. Click "Analyze Portfolio Risk"
6. View comprehensive risk metrics and visualizations

### Credit Risk Assessment

1. Go to "Credit Risk" section
2. Fill in applicant information:
   - Employment status
   - Annual income
   - Loan amount and term
   - Credit score (CIBIL)
3. Submit for loan approval prediction

### Stock Price Forecasting

1. Access the forecasting feature through portfolio analysis
2. View 7-day price predictions for individual stocks
3. Toggle between historical data and forecast visualization

## 🔧 Machine Learning Models

### Stock Price Forecasting Model
- **Architecture**: LSTM Neural Network
- **Input**: 30 days of historical closing prices
- **Output**: 7-day price predictions
- **Framework**: TensorFlow/Keras

### Credit Risk Model
- **Type**: Classification model for loan approval
- **Features**: Employment status, income, loan amount, term, credit score
- **Framework**: Scikit-learn

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Home page |
| `/api/stock-price` | GET | Get current and historical stock prices |
| `/api/stock-forecast` | GET | Get 7-day stock price forecast |
| `/api/risk-metrics` | POST | Calculate portfolio risk metrics |
| `/predict-loan` | POST | Predict loan approval |

## 🔒 Security Considerations

- API keys are managed through environment variables
- No sensitive data is logged or exposed
- Input validation on all API endpoints
- CORS headers configured for web application security

## 🚨 Troubleshooting

### Common Issues

1. **Model loading errors**
   - Ensure `stock_model_7day.h5`, `scaler.pkl`, and `loan_approval_model_subset.pkl` are present
   - Check file permissions and paths

2. **API rate limits**
   - Finnhub API has rate limits for free accounts
   - Implement request caching if needed

3. **Missing dependencies**
   - Run `pip install -r requirements.txt` to ensure all packages are installed

4. **Port conflicts**
   - Change the port in `app.py` if 5000 is already in use

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Finnhub](https://finnhub.io) for providing free stock market API
- [Yahoo Finance](https://finance.yahoo.com) for historical data
- [Bootstrap](https://getbootstrap.com) for the beautiful UI components
- [Chart.js](https://www.chartjs.org) for data visualization

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

---

**FinSight** - Empowering financial decisions through advanced risk analysis and machine learning.
