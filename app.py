from flask import Flask, request, jsonify, render_template
import requests
import numpy as np
import os
import pandas as pd
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
from datetime import datetime, timedelta
import yfinance as yf
import tensorflow as tf
import joblib
from sklearn.preprocessing import MinMaxScaler
import pickle

app = Flask(__name__)

# Load the pre-trained model and scaler
model = None
try:
    model = tf.keras.models.load_model('stock_model_7day.h5')
    print("Successfully loaded pre-trained model")
except Exception as e:
    print(f"Error loading model: {str(e)}")
    model = None

# Load the scaler
try:
    scaler = joblib.load('scaler.pkl')
    print("Successfully loaded scaler")
except Exception as e:
    print(f"Error loading scaler: {str(e)}")
    scaler = None

# Finnhub API key
FINNHUB_API_KEY = os.getenv('FINNHUB_API_KEY')
FINNHUB_BASE_URL = 'https://finnhub.io/api/v1/quote'

# Groq API key
XAI_API_KEY = os.getenv('XAI_API_KEY')
XAI_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions'

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/stock-price', methods=['GET'])
def get_stock_price():
    symbols = request.args.get('symbols')
    if not symbols:
        return jsonify({'error': 'No symbols provided'}), 400

    if not FINNHUB_API_KEY:
        return jsonify({'error': 'FINNHUB_API_KEY not configured'}), 500

    symbol_list = [s.strip().upper() for s in symbols.split(',')]
    prices = {}

    for symbol in symbol_list:
        try:
            params = {'symbol': symbol, 'token': FINNHUB_API_KEY}
            response = requests.get(FINNHUB_BASE_URL, params=params, timeout=10)

            if response.status_code == 200:
                data = response.json()
                current_price = data.get('c', 0)

                if not current_price or current_price == 0:
                    prices[symbol] = {'error': f'No price data from Finnhub for {symbol} (market may be closed or symbol invalid)'}
                    continue

                historical_prices = []
                try:
                    end_date = datetime.now()
                    start_date = end_date - timedelta(days=10)
                    ticker = yf.Ticker(symbol)
                    hist = ticker.history(start=start_date, end=end_date, interval='1d')

                    if not hist.empty:
                        hist = hist.tail(5)
                        historical_prices = hist['Close'].tolist()
                except Exception as yf_err:
                    print(f"yfinance failed for {symbol}: {str(yf_err)}")

                if len(historical_prices) < 5:
                    pc = data.get('pc', current_price)
                    spread = (current_price - pc) / 5 if pc else 0
                    historical_prices = [current_price - spread * (4 - i) for i in range(5)]

                prices[symbol] = {
                    'current': current_price,
                    'high': data.get('h'),
                    'low': data.get('l'),
                    'open': data.get('o'),
                    'previous_close': data.get('pc'),
                    'historical_prices': historical_prices
                }
            elif response.status_code == 403:
                prices[symbol] = {'error': 'Finnhub API key invalid or rate limited'}
            else:
                prices[symbol] = {'error': f'Finnhub returned status {response.status_code}'}

        except requests.exceptions.Timeout:
            print(f"Timeout fetching data for {symbol}")
            prices[symbol] = {'error': f'Timeout fetching {symbol}'}
        except Exception as e:
            print(f"Error fetching data for {symbol}: {str(e)}")
            prices[symbol] = {'error': f'Error: {str(e)}'}

    return jsonify(prices)

@app.route('/portfolio-risk.html')
def portfolio_risk():
    return render_template('portfolio-risk.html')

@app.route('/credit-risk.html')
@app.route('/credit-risk')
def credit_risk():
    return render_template('credit-risk.html')

@app.route('/api/stock-forecast', methods=['GET'])
def get_stock_forecast():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({'error': 'No symbol provided'}), 400
    
    if model is None or scaler is None:
        return jsonify({'error': 'Prediction model not loaded'}), 500
    
    try:
        # Get historical data - we'll use 30 days of data for prediction
        end_date = datetime.now()
        start_date = end_date - timedelta(days=60)  # Get extra days in case of weekends/holidays
        
        ticker = yf.Ticker(symbol)
        hist = ticker.history(start=start_date, end=end_date, interval='1d')
        
        if hist.empty or len(hist) < 30:
            return jsonify({'error': 'Not enough historical data available'}), 400
        
        # Prepare the data for the model
        # Use the last 30 days of closing prices
        prices = hist['Close'].values[-30:].reshape(-1, 1)
        
        # Scale the data using the pre-trained scaler
        scaled_prices = scaler.transform(prices)
        
        # Reshape for LSTM input: [samples, time steps, features]
        X = scaled_prices.reshape(1, 30, 1)
        
        # Make prediction
        scaled_forecast = model.predict(X)
        
        # Inverse transform to get actual prices
        forecast_prices = scaler.inverse_transform(scaled_forecast)[0]
        forecast_prices = [round(price, 2) for price in forecast_prices]
        
        # Generate forecast dates
        forecast_dates = []
        for i in range(1, 8):  # Next 7 days
            forecast_date = end_date + timedelta(days=i)
            forecast_dates.append(forecast_date.strftime('%Y-%m-%d'))
        
        return jsonify({
            'symbol': symbol,
            'forecast_dates': forecast_dates,
            'forecast_prices': forecast_prices,
            'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'model_used': True
        })
        
    except Exception as e:
        print(f"Error generating forecast for {symbol}: {str(e)}")
        # Fall back to simple moving average if model prediction fails
        try:
            return fallback_forecast(symbol, end_date)
        except Exception as fallback_error:
            return jsonify({'error': f'Error in forecast: {str(e)} (Fallback also failed: {str(fallback_error)})'}), 500

def fallback_forecast(symbol, end_date):
    """Fallback forecast using simple moving average if model prediction fails"""
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period='30d', interval='1d')
    
    if hist.empty:
        raise Exception('No historical data available')
    
    # Simple forecast: use average of last 5 days' returns
    hist['Returns'] = hist['Close'].pct_change()
    avg_return = hist['Returns'].tail(5).mean()
    last_price = hist['Close'].iloc[-1]
    
    forecast_dates = []
    forecast_prices = []
    
    for i in range(1, 8):  # Next 7 days
        forecast_date = end_date + timedelta(days=i)
        forecast_dates.append(forecast_date.strftime('%Y-%m-%d'))
        # Simple projection based on average return
        forecast_price = last_price * (1 + avg_return * i)
        forecast_prices.append(round(forecast_price, 2))
    
    return jsonify({
        'symbol': symbol,
        'forecast_dates': forecast_dates,
        'forecast_prices': forecast_prices,
        'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'model_used': False,
        'warning': 'Using fallback forecast method'
    })

@app.route('/api/risk-metrics', methods=['POST'])
def risk_metrics():
    data = request.get_json()
    portfolio = data.get('portfolio', [])
    confidence_level = str(data.get('confidenceLevel', '99'))
    time_horizon = int(data.get('timeHorizon', 1))

    total_value = sum(stock['currentPrice'] * stock['quantity'] for stock in portfolio)

    for stock in portfolio:
        stock['value'] = stock['currentPrice'] * stock['quantity']
        stock['weight'] = (stock['value'] / total_value * 100) if total_value > 0 else 0

    symbols = [stock['symbol'] for stock in portfolio]
    weights = np.array([stock['weight'] / 100 for stock in portfolio])

    end_date = datetime.now()
    start_date = end_date - timedelta(days=60)

    log_returns_list = []
    for symbol in symbols:
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(start=start_date, end=end_date, interval='1d')
            if not hist.empty and len(hist) >= 2:
                prices = hist['Close'].values
                log_rets = np.diff(np.log(prices))
                log_returns_list.append(log_rets)
            else:
                log_returns_list.append(np.array([0.0]))
        except Exception:
            log_returns_list.append(np.array([0.0]))

    min_len = min(len(r) for r in log_returns_list)
    aligned_returns = np.column_stack([r[-min_len:] for r in log_returns_list])

    if min_len >= 2:
        cov_matrix = np.cov(aligned_returns, rowvar=False)
    else:
        cov_matrix = np.zeros((len(symbols), len(symbols)))

    daily_variance = float(weights @ cov_matrix @ weights)
    daily_volatility = np.sqrt(daily_variance)
    portfolio_volatility = daily_volatility * np.sqrt(252)
    portfolio_value = total_value

    z_scores = {'90': 1.282, '95': 1.645, '99': 2.326}
    z_score = z_scores.get(confidence_level, 2.326)
    confidence_fraction = int(confidence_level) / 100

    scaled_vol = daily_volatility * np.sqrt(time_horizon)
    var_value = portfolio_value * z_score * scaled_vol

    # Analytical CVaR under normality: CVaR = (φ(z) / (1 - α)) × σ × P
    pdf_z = (1 / np.sqrt(2 * np.pi)) * np.exp(-0.5 * z_score ** 2)
    cvar_value = (pdf_z / (1 - confidence_fraction)) * scaled_vol * portfolio_value

    return jsonify({
        'var': float(var_value),
        'cvar': float(cvar_value),
        'volatility': float(portfolio_volatility * 100),
        'portfolioValue': float(portfolio_value)
    })

# Load the loan approval model
try:
    loan_model = pickle.load(open('loan_approval_model_subset.pkl', 'rb'))
    print("Successfully loaded loan approval model")
except Exception as e:
    print(f"Error loading loan approval model: {str(e)}")
    loan_model = None

@app.route('/predict-loan', methods=['POST'])
def predict_loan():
    if loan_model is None:
        return jsonify({'error': 'Loan prediction model not loaded'}), 500
        
    try:
        # Get data from the request
        data = request.get_json(force=True)
        
        # Validate required fields
        required_fields = ['self_employed', 'income_annum', 'loan_amount', 'loan_term', 'cibil_score']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
            
        # Convert data to DataFrame
        df = pd.DataFrame([data])
        
        # Ensure columns are in the correct order and handle missing ones if necessary
        expected_columns = ['self_employed', 'income_annum', 'loan_amount', 'loan_term', 'cibil_score']
        
        # Check if all expected columns are present
        missing_columns = [col for col in expected_columns if col not in df.columns]
        if missing_columns:
            return jsonify({'error': f'Missing required columns: {missing_columns}'}), 400
            
        # Select only the expected columns in the correct order
        df = df[expected_columns]
        
        # Convert data types to ensure compatibility
        try:
            df['self_employed'] = df['self_employed'].astype(int)
            df['income_annum'] = df['income_annum'].astype(float)
            df['loan_amount'] = df['loan_amount'].astype(float)
            df['loan_term'] = df['loan_term'].astype(int)
            df['cibil_score'] = df['cibil_score'].astype(int)
        except (ValueError, TypeError) as e:
            return jsonify({'error': f'Invalid data types in request: {str(e)}'}), 400
            
        # Make prediction
        prediction = loan_model.predict(df)
        probability = loan_model.predict_proba(df)[0]
        
        # Get the predicted class (0 for Rejected, 1 for Approved)
        loan_status = 'Approved' if prediction[0] == 1 else 'Rejected'
        
        # Get the confidence score
        confidence = float(probability[prediction[0]] * 100)
        
        return jsonify({
            'loan_status': loan_status,
            'confidence': round(confidence, 2),
            'details': {
                'self_employed': bool(data['self_employed']),
                'income_annum': float(data['income_annum']),
                'loan_amount': float(data['loan_amount']),
                'loan_term': int(data['loan_term']),
                'cibil_score': int(data['cibil_score'])
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

def call_grok(prompt, max_tokens=1024):
    if not XAI_API_KEY or XAI_API_KEY.startswith('your-'):
        return None
    try:
        resp = requests.post(XAI_BASE_URL, headers={
            'Authorization': f'Bearer {XAI_API_KEY}',
            'Content-Type': 'application/json'
        }, json={
            'model': 'llama-3.3-70b-versatile',
            'messages': [
                {'role': 'system', 'content': 'You are a senior financial analyst at a top investment bank. Give concise, data-driven insights. Use bullet points. Be specific with numbers. Always include actionable recommendations.'},
                {'role': 'user', 'content': prompt}
            ],
            'max_tokens': max_tokens,
            'temperature': 0.7
        }, timeout=30)
        if resp.status_code == 200:
            return resp.json()['choices'][0]['message']['content']
    except Exception as e:
        print(f"Grok API error: {e}")
    return None


@app.route('/market-pulse')
def market_pulse():
    return render_template('market-pulse.html')


@app.route('/api/market-pulse', methods=['GET'])
def get_market_pulse():
    indices = {
        '^GSPC': 'S&P 500',
        '^DJI': 'Dow Jones',
        '^IXIC': 'NASDAQ',
        '^RUT': 'Russell 2000'
    }
    sectors = {
        'XLK': 'Technology', 'XLF': 'Financials', 'XLV': 'Healthcare',
        'XLE': 'Energy', 'XLY': 'Consumer Disc.', 'XLP': 'Consumer Staples',
        'XLI': 'Industrials', 'XLU': 'Utilities', 'XLRE': 'Real Estate',
        'XLB': 'Materials', 'XLC': 'Communication'
    }
    top_movers_symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM', 'V', 'WMT']

    index_data = {}
    for symbol, name in indices.items():
        try:
            t = yf.Ticker(symbol)
            hist = t.history(period='5d')
            if not hist.empty and len(hist) >= 2:
                current = hist['Close'].iloc[-1]
                prev = hist['Close'].iloc[-2]
                change_pct = ((current - prev) / prev) * 100
                index_data[name] = {
                    'price': round(float(current), 2),
                    'change': round(float(change_pct), 2),
                    'prev_close': round(float(prev), 2)
                }
        except Exception as e:
            print(f"Error fetching {symbol}: {e}")

    sector_data = {}
    for symbol, name in sectors.items():
        try:
            t = yf.Ticker(symbol)
            hist = t.history(period='5d')
            if not hist.empty and len(hist) >= 2:
                current = hist['Close'].iloc[-1]
                prev = hist['Close'].iloc[-2]
                change_pct = ((current - prev) / prev) * 100
                sector_data[name] = {
                    'price': round(float(current), 2),
                    'change': round(float(change_pct), 2)
                }
        except Exception:
            pass

    movers = []
    for symbol in top_movers_symbols:
        try:
            t = yf.Ticker(symbol)
            hist = t.history(period='5d')
            if not hist.empty and len(hist) >= 2:
                current = hist['Close'].iloc[-1]
                prev = hist['Close'].iloc[-2]
                change_pct = ((current - prev) / prev) * 100
                movers.append({
                    'symbol': symbol,
                    'price': round(float(current), 2),
                    'change': round(float(change_pct), 2),
                    'volume': int(hist['Volume'].iloc[-1])
                })
        except Exception:
            pass

    movers.sort(key=lambda x: abs(x['change']), reverse=True)

    market_summary = f"Market Data:\n"
    for name, data in index_data.items():
        market_summary += f"- {name}: ${data['price']} ({data['change']:+.2f}%)\n"
    market_summary += f"\nSector Performance:\n"
    for name, data in sector_data.items():
        market_summary += f"- {name}: {data['change']:+.2f}%\n"
    market_summary += f"\nTop Movers:\n"
    for m in movers[:5]:
        market_summary += f"- {m['symbol']}: ${m['price']} ({m['change']:+.2f}%)\n"

    ai_prompt = f"""Analyze today's market data and provide:
1. **Market Overview** (2-3 sentences on overall market direction)
2. **Key Drivers** (what's driving today's moves)
3. **Sector Rotation** (which sectors are gaining/losing momentum and why)
4. **Top Movers Analysis** (why are the biggest movers moving)
5. **Outlook** (short-term outlook for next few days)

{market_summary}"""

    ai_commentary = call_grok(ai_prompt, max_tokens=1500)

    return jsonify({
        'indices': index_data,
        'sectors': sector_data,
        'movers': movers,
        'ai_commentary': ai_commentary,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })


@app.route('/api/what-if', methods=['POST'])
def what_if_analysis():
    data = request.get_json()
    current_portfolio = data.get('portfolio', [])
    action = data.get('action', '')

    portfolio_summary = "Current Portfolio:\n"
    for stock in current_portfolio:
        portfolio_summary += f"- {stock['symbol']}: {stock['quantity']} shares @ ${stock['currentPrice']} (Weight: {stock.get('weight', 0):.1f}%)\n"

    prompt = f"""{portfolio_summary}

User's Question: {action}

Analyze this "What If" scenario:
1. **Impact on Portfolio Risk** - How would VaR, volatility, and diversification change?
2. **Concentration Risk** - Would this increase or decrease sector/stock concentration?
3. **Expected Return Impact** - How might expected returns change?
4. **Recommendation** - Should the user proceed? What's the better alternative?

Be specific with numbers and percentages. Give a clear YES/NO recommendation with reasoning."""

    ai_response = call_grok(prompt, max_tokens=1200)

    if not ai_response:
        ai_response = "AI analysis is currently unavailable. Please check your Grok API key in the .env file."

    return jsonify({
        'analysis': ai_response,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })


@app.route('/api/generate-report', methods=['POST'])
def generate_report():
    data = request.get_json()
    portfolio = data.get('portfolio', [])
    risk_metrics = data.get('riskMetrics', {})
    confidence = data.get('confidenceLevel', '99')
    time_horizon = data.get('timeHorizon', '1')

    portfolio_summary = ""
    for stock in portfolio:
        portfolio_summary += f"- {stock['symbol']}: {stock['quantity']} shares @ ${stock['currentPrice']:.2f}, Weight: {stock.get('weight', 0):.1f}%, Daily Return: {stock.get('dailyReturn', 0)*100:.2f}%\n"

    prompt = f"""Generate a professional portfolio risk analysis report:

**Portfolio Holdings:**
{portfolio_summary}

**Risk Metrics (Confidence: {confidence}%, Horizon: {time_horizon} day(s)):**
- Value at Risk (VaR): ${risk_metrics.get('var', 0):.2f}
- Conditional VaR (CVaR): ${risk_metrics.get('cvar', 0):.2f}
- Portfolio Volatility: {risk_metrics.get('volatility', 0):.2f}%
- Total Portfolio Value: ${risk_metrics.get('portfolioValue', 0):,.2f}

Write a comprehensive report with these sections:
1. **Executive Summary** - Key findings in 3-4 sentences
2. **Portfolio Composition Analysis** - Holdings breakdown, concentration risks, sector exposure
3. **Risk Assessment** - Detailed interpretation of VaR, CVaR, volatility. What do these numbers mean?
4. **Stress Scenarios** - What happens in a market crash (-20%), moderate decline (-10%), sector rotation?
5. **Recommendations** - 4-5 specific, actionable steps to optimize the portfolio
6. **Conclusion** - Overall risk rating (Conservative/Moderate/Aggressive) and final thoughts

Use professional financial language. Be specific with numbers."""

    ai_report = call_grok(prompt, max_tokens=2000)

    if not ai_report:
        ai_report = "AI report generation is currently unavailable. Please check your Grok API key."

    return jsonify({
        'report': ai_report,
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'portfolio_summary': {
            'total_value': risk_metrics.get('portfolioValue', 0),
            'var': risk_metrics.get('var', 0),
            'cvar': risk_metrics.get('cvar', 0),
            'volatility': risk_metrics.get('volatility', 0),
            'confidence': confidence,
            'time_horizon': time_horizon,
            'holdings_count': len(portfolio)
        }
    })


if __name__ == '__main__':
    app.run()
