FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm install && cd server && npm install
COPY . .
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server/server.js"]
