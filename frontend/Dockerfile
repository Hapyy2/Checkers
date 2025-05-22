# ETAP 1: Budowanie aplikacji Next.js
FROM node:23-slim AS build

# Ustawiamy katalog roboczy
WORKDIR /app

# Kopiujemy plik package.json z zależnościami
COPY package*.json ./

# Instalujemy zależności
RUN npm ci

# Kopiujemy cały kod źródłowy
COPY . .

# Budujemy aplikację - Next.js tworzy folder .next
RUN npm run build

# ETAP 2: Tworzenie kontenera produkcyjnego
FROM node:23-slim

WORKDIR /app

# Kopiujemy pliki potrzebne do uruchomienia aplikacji
COPY --from=build /app/package*.json ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Uruchamiamy Next.js w trybie produkcyjnym
CMD ["npm", "run", "start"]