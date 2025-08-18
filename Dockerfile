# Use Node.js LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files first
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./

# Expose port
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]