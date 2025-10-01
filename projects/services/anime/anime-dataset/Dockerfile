# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies using a clean install for reproducible builds
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source files
COPY . .

# Ensure runtime user exists and owns the dataset directory
RUN addgroup -S app && adduser -S -G app app \
    && mkdir -p dataset \
    && chown -R app:app /app

USER app

EXPOSE 3000

CMD ["npm", "run", "start"]
