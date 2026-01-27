FROM python:3.11-slim

# Install curl, used for installing Bun
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy all dependency files first for better caching
COPY package.json bun.lock requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Install Node.js dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Create a non-root user and switch to it
RUN useradd -m -u 1000 appuser
USER appuser

# Expose the port the server will listen on
EXPOSE 10000

# The command to start the web server
CMD ["bun", "run", "index.ts"]
