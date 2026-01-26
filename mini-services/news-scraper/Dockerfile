FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Create a non-root user for security
RUN useradd -m -u 1000 appuser
USER appuser

# Set the entrypoint to run the scraper directly
CMD ["python", "-u", "scraper.py"]