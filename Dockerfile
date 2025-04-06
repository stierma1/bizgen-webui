# Use Node.js 18 with Python 3
FROM node:18

# Install system dependencies and clean up
RUN apt-get update && apt-get install -y \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency files first for caching
COPY package*.json ./
COPY client/package*.json ./client/
COPY requirements.txt ./

# Install Python dependencies
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

COPY . .
# Install Node.js server dependencies
RUN npm i --production

# Build React client
WORKDIR /app/client
RUN npm ci && npm run build

WORKDIR /app
# Set runtime configuration
EXPOSE 3000
CMD ["node", "server.js"]