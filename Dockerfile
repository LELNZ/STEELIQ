# syntax=docker/dockerfile:1

### Build stage
FROM node:20-bullseye-slim AS build
WORKDIR /app
# Install deps exactly as locked
COPY package*.json ./
RUN npm ci

# Build app
COPY . .
RUN npm run build

### Runtime stage
FROM node:20-bullseye-slim
ENV NODE_ENV=production
WORKDIR /app
# Only what we need to run
COPY"--from=build" /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
EXPOSE 5000
CMD ["node","dist/index.js"]
