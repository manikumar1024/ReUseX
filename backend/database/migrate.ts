import { query } from '../src/config/database';
import fs from 'fs';
import path from 'path';

async function migrate() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await query(schema);
    console.log('✅ Database migration complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
