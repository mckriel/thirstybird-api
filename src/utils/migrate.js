import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrations_path = path.join(__dirname, '../../database/migrations');
const seeds_path = path.join(__dirname, '../../database/seeds');

export const run_migrations = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version varchar(255) PRIMARY KEY,
        applied_at timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const applied_migrations = await db.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const applied_set = new Set(applied_migrations.rows.map(row => row.version));

    const migration_files = fs.readdirSync(migrations_path)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migration_files) {
      const version = path.basename(file, '.sql');
      
      if (applied_set.has(version)) {
        console.log(`Migration ${version} already applied`);
        continue;
      }

      console.log(`Running migration ${version}...`);
      const sql = fs.readFileSync(path.join(migrations_path, file), 'utf8');
      
      await db.query('BEGIN');
      try {
        await db.query(sql);
        await db.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        );
        await db.query('COMMIT');
        console.log(`Migration ${version} completed`);
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

export const run_seeds = async () => {
  try {
    const seed_files = fs.readdirSync(seeds_path)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of seed_files) {
      console.log(`Running seed ${file}...`);
      const sql = fs.readFileSync(path.join(seeds_path, file), 'utf8');
      await db.query(sql);
      console.log(`Seed ${file} completed`);
    }

    console.log('All seeds completed successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
};

const command = process.argv[2];

if (command === 'migrate') {
  run_migrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

if (command === 'seed') {
  run_seeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}