FROM node:22-alpine

ENV NODE_ENV=development

WORKDIR /app

COPY package*.json ./

RUN npm ci --quiet

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
