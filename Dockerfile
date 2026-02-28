# Use a slim Node.js image
FROM node:20-slim

# Install Google Chrome and necessary libraries for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set the environment variable so Puppeteer knows where Chrome is
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Create and define the application directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Start the bot
CMD [ "node", "index.js" ]