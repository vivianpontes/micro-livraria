FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY proto ./proto
COPY services ./services

CMD ["node", "services/controller/index.js"]