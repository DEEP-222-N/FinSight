# FinSight - Financial Analysis and Prediction Tool

FinSight is a comprehensive financial analysis platform that provides stock market forecasting, portfolio risk assessment, and loan approval prediction capabilities. Built with Python and Flask, it leverages machine learning models to deliver intelligent financial insights.

## Features

- **Stock Price Prediction**: Forecast stock prices using a pre-trained LSTM model
- **Portfolio Risk Analysis**: Analyze and visualize risk metrics for investment portfolios
- **Loan Approval Prediction**: Predict loan approval likelihood based on applicant data
- **Real-time Market Data**: Fetch and display current stock market data using Yahoo Finance
- **Interactive Web Interface**: User-friendly web interface built with HTML, CSS, and JavaScript

## Prerequisites

- Python 3.7 or higher
- pip (Python package manager)
- Git (optional, for version control)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/FinSight.git
   cd FinSight
   ```

2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   Create a `.env` file in the root directory with the following content:
   ```
   FLASK_APP=app.py
   FLASK_ENV=development
   ```

## Usage

   ```

3. Use the web interface to:
   - View stock price predictions
   - Analyze portfolio risk
   - Get loan approval predictions

## Project Structure

```
FinSight/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── Dockerfile             # Container configuration
├── Procfile               # Heroku deployment configuration
├── .env                   # Environment variables
├── static/                # Static files (CSS, JS, images)
│   └── ...
├── templates/             # HTML templates
│   └── ...
├── stock_model_7day.h5    # Pre-trained stock prediction model
├── loan_approval_model_subset.pkl  # Loan approval model
└── scaler.pkl             # Feature scaler for the models
```

## Models

### Stock Prediction Model
- **Type**: LSTM Neural Network
- **Input**: Historical stock price data
- **Output**: 7-day price forecast
- **Features**: Open, High, Low, Close prices and Volume

### Loan Approval Model
- **Type**: Pre-trained classifier
- **Input**: Applicant financial information
- **Output**: Loan approval probability
- **Features**: Credit score, income, loan amount, etc.

## API Endpoints

- `GET /`: Home page
- `POST /get_stock_price`: Get current stock price
- `POST /get_stock_forecast`: Get stock price forecast
- `POST /portfolio_risk`: Analyze portfolio risk
- `POST /predict_loan`: Predict loan approval

## Deployment

### Local Deployment
1. Follow the installation steps above
2. Run `flask run`

### Docker Deployment
1. Build the Docker image:
   ```bash
   docker build -t finsight .
   ```
2. Run the container:
   ```bash
   docker run -p 5000:5000 finsight
   ```

### Heroku Deployment
1. Install the Heroku CLI
2. Login to your Heroku account
3. Create a new Heroku app
4. Push your code to Heroku:
   ```bash
   git push heroku main
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with Flask and TensorFlow
- Stock data provided by Yahoo Finance
- Machine learning models trained on historical financial data
