FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=development

COPY package*.json ./

RUN npm install

COPY prisma ./prisma/

RUN npx prisma generate

COPY . .

EXPOSE 3100

CMD ["npm", "start"]