# Lightweight production image for the Express API
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4000
CMD ["node", "server.js"]
