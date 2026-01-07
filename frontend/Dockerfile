FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with clean install
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy all source code
COPY . .

# Set environment variables to listen on all interfaces
ENV HOST=0.0.0.0
ENV PORT=3000
ENV BROWSER=none
ENV WDS_SOCKET_HOST=0.0.0.0
ENV WDS_SOCKET_PORT=3000
ENV DANGEROUSLY_DISABLE_HOST_CHECK=true

EXPOSE 3000

# Use exec form to properly handle signals
CMD ["npm", "start"]
