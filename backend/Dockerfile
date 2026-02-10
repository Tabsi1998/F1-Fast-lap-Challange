FROM python:3.11-slim

WORKDIR /app

# Install dependencies (use docker-specific requirements)
COPY requirements-docker.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY server.py .
COPY .env .

# Expose port
EXPOSE 8001

# Run server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
