import "dotenv/config";
import { defineConfig, env } from "prisma/config";

type Env = {
  DIRECT_URL: string;
};

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // マイグレーションはプーリングを経由しない直接接続 (DIRECT_URL) を使う。
    // アプリ実行時のプーリング接続 (DATABASE_URL) は lib/prisma.ts の adapter-neon が使う。
    url: env<Env>("DIRECT_URL"),
  },
});
