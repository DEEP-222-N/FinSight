FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

# Upgrade pip + install packages with longer timeout
RUN pip install --upgrade pip
RUN pip install --no-cache-dir --default-timeout=100 -r requirements.txt

COPY . .

# Expose the port your Flask app runs on
EXPOSE 5000

# Start the app with Gunicorn
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
