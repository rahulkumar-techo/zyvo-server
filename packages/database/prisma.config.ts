import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma",
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://zyvo:zyvo_secret@localhost:5432/zyvo",
  },
});
