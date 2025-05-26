FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=development

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

COPY . .

EXPOSE 3100

ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "start"]