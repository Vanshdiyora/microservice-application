# orchestration-service/Dockerfile
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5005
CMD ["node", "src/server.js"]
