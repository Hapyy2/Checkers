# FROM node:20-alpine

# RUN apk add --no-cache openssl postgresql-client

# WORKDIR /app

# # Kopiuj package.json i package-lock.json
# COPY package*.json ./

# # Instaluj zależności (w tym devDependencies dla nodemon)
# RUN npm install

# # Kopiuj Prisma schema
# COPY prisma ./prisma/

# # Generuj Prisma Client
# RUN npx prisma generate

# # Kopiuj kod aplikacji
# COPY . .

# EXPOSE 3100

# # Używaj prosty inline command
# CMD ["sh", "-c", "sleep 10 && npx prisma migrate deploy && npm run devStart"]

FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD [ "npm", "start" ]