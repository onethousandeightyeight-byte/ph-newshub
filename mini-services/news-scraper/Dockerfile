FROM python:3.11-slim

# Install dependencies for Bun installation
RUN apt-get update && apt-get install -y curl unzip && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements first for better caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Bun globally (to /usr/local/bin so it's available to all users)
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun/bin/bun /usr/local/bin/bun && \
    chmod +x /usr/local/bin/bun

# Copy package files for Node.js dependencies
COPY package.json bun.lock ./

# Install Node.js dependencies (before switching to non-root user)
RUN bun install

# Copy the rest of the application files
COPY . .

# Expose the port Render will use
EXPOSE 10000

# Start the web server which launches the Python scraper
CMD ["bun", "run", "index.ts"]
