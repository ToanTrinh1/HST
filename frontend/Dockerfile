FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with clean install
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy all source code
COPY . .

EXPOSE 3000

# Use exec form to properly handle signals
CMD ["npm", "start"]
