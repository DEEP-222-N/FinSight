from flask import Flask, request, jsonify, render_template
import requests
import numpy as np
import os
import pandas as pd
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

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/stock-price', methods=['GET'])
def get_stock_price():
    symbols = request.args.get('symbols')
    if not symbols:
        return jsonify({'error': 'No symbols provided'}), 400
    symbol_list = [s.strip().upper() for s in symbols.split(',')]
    prices = {}
    
    for symbol in symbol_list:
        try:
            # Get current price data
            params = {'symbol': symbol, 'token': FINNHUB_API_KEY}
            response = requests.get(FINNHUB_BASE_URL, params=params)
            
            if response.status_code == 200:
                data = response.json()
                current_price = data.get('c')
                
                # Get historical data for the past 5 days
                end_date = datetime.now()
                start_date = end_date - timedelta(days=10)  # Get extra days in case of weekends/holidays
                
                # Use yfinance to get historical data
                ticker = yf.Ticker(symbol)
                hist = ticker.history(start=start_date, end=end_date, interval='1d')
                
                if not hist.empty:
                    # Get the last 5 days of historical prices
                    hist = hist.tail(5)
                    historical_prices = hist['Close'].tolist()
                    
                    # If we don't have enough historical data, pad with the current price
                    while len(historical_prices) < 5:
                        historical_prices.insert(0, current_price)
                else:
                    # Fallback: create dummy historical data
                    historical_prices = [current_price * (1 - 0.01 * i) for i in range(4, -1, -1)]
                
                prices[symbol] = {
                    'current': current_price,
                    'high': data.get('h'),
                    'low': data.get('l'),
                    'open': data.get('o'),
                    'previous_close': data.get('pc'),
                    'historical_prices': historical_prices
                }
            else:
                prices[symbol] = {'error': 'Failed to fetch current price'}
                
        except Exception as e:
            print(f"Error fetching data for {symbol}: {str(e)}")
            prices[symbol] = {'error': f'Error fetching data: {str(e)}'}
    
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
    
    # Calculate weights and daily returns
    total_value = sum(stock['currentPrice'] * stock['quantity'] for stock in portfolio)
    
    for stock in portfolio:
        stock['value'] = stock['currentPrice'] * stock['quantity']
        stock['weight'] = (stock['value'] / total_value * 100) if total_value > 0 else 0
    
    # Portfolio variance (simplified, no correlation)
    portfolio_variance = 0
    for stock in portfolio:
        weight = stock['weight'] / 100
        daily_return = stock.get('dailyReturn', 0)
        portfolio_variance += (weight * daily_return) ** 2
    
    portfolio_volatility = np.sqrt(portfolio_variance) * np.sqrt(252)  # annualized
    portfolio_value = total_value
    
    # VaR
    z_score = 1.645 if confidence_level == '95' else 2.326
    daily_volatility = portfolio_volatility / np.sqrt(252)
    var_value = portfolio_value * z_score * daily_volatility * np.sqrt(time_horizon)
    
    # CVaR (simplified)
    cvar_value = var_value * 1.2
    
    return jsonify({
        'var': var_value,
        'cvar': cvar_value,
        'volatility': portfolio_volatility * 100,
        'portfolioValue': portfolio_value
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

if __name__ == '__main__':
    app.run(debug=True)
