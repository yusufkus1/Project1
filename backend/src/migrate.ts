import { Pool } from "pg";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

async function main() {
  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id                  VARCHAR(36)  PRIMARY KEY,
      checksum            VARCHAR(64)  NOT NULL,
      finished_at         TIMESTAMPTZ,
      migration_name      VARCHAR(255) NOT NULL,
      logs                TEXT,
      rolled_back_at      TIMESTAMPTZ,
      started_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
      applied_steps_count INTEGER      NOT NULL DEFAULT 0
    )
  `);

  const migrDir = join(__dirname, "../prisma/migrations");
  if (!existsSync(migrDir)) {
    console.log("No migrations directory, skipping.");
    await pool.end();
    return;
  }

  const folders = readdirSync(migrDir)
    .filter((f) => statSync(join(migrDir, f)).isDirectory())
    .sort();

  for (const folder of folders) {
    const sqlFile = join(migrDir, folder, "migration.sql");
    if (!existsSync(sqlFile)) continue;

    const { rows } = await pool.query(
      `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      [folder]
    );
    if (rows.length > 0) {
      console.log(`skip: ${folder}`);
      continue;
    }

    const sql = readFileSync(sqlFile, "utf-8");
    console.log(`apply: ${folder}`);
    await pool.query(sql);
    await pool.query(
      `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
       VALUES ($1, $2, $3, now(), 1)`,
      [randomUUID(), "manual", folder]
    );
  }

  await pool.end();
  console.log("migrations done");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
