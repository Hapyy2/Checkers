const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully.`);
  await prisma.$disconnect();
  console.log("Prisma Client disconnected.");
  process.exit(0);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

module.exports = prisma;
