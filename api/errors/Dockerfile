FROM node:20-alpine

WORKDIR /app

# Kopiuj package.json i zainstaluj zależności
COPY package*.json ./

# Dodajemy Mongoose do package.json
RUN npm install mongoose && npm install

# Kopiuj resztę kodu aplikacji
COPY . .

EXPOSE 3400

# Prosta komenda startowa
CMD ["npm", "start"]