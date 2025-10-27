# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm i
COPY . .
# Produces dist/ with server bundle + dist/public for client
RUN npm run build

# --- runtime stage ---
FROM node:20-alpine
ENV NODE_ENV=production PORT=5000
WORKDIR /app
# Only bring what we need to run
COPY --from=build /app/dist ./dist
COPY package*.json ./
# Install prod deps only
RUN npm i --omit=dev
EXPOSE 5000
CMD ["node","dist/index.js"]
