import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client.js";

// Prisma 7 uses a driver adapter at runtime (the connection URL lives here and
// in prisma.config.ts for the CLI, no longer in schema.prisma). Paths are
// relative to the server working directory (npm run dev runs from server/).
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });
