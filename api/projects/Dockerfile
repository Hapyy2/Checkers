FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=development

COPY package*.json ./
RUN npm install

RUN mkdir -p prisma
COPY prisma/schema.prisma ./prisma/schema.prisma 

RUN npx prisma generate

COPY . .

EXPOSE 3200 
CMD ["npm", "start"]