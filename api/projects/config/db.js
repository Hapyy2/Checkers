const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function gracefulShutdown(signal) {
  console.log(
    `Received ${signal} in projects-api. Shutting down Prisma Client gracefully.`
  );
  await prisma.$disconnect();
  console.log("Prisma Client disconnected in projects-api.");
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

module.exports = prisma;
