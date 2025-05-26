#!/bin/sh
echo "Migrating database..."
npx prisma migrate dev --name init

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Starting the application..."
exec "$@"