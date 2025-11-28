# syntax=docker/dockerfile:1
FROM node:20-bullseye-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm i
COPY . .
RUN npm run build

FROM node:20-bullseye-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev || npm i --omit=dev
EXPOSE 5000
CMD ["node","dist/index.js"]
