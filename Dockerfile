# Use Node.js LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install express
RUN npm install express

# Copy minimal server
COPY minimal-server.js ./

# Expose port
EXPOSE $PORT

# Start the application
CMD ["node", "minimal-server.js"]