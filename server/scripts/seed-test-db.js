import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'ci-admin@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin@1234';

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ensure lead code sequence exists
    await client.query(`CREATE SEQUENCE IF NOT EXISTS lead_code_seq START 1;`);

    // Ensure admin user exists
    const { rows } = await client.query('SELECT id FROM users WHERE email = $1 AND is_deleted = FALSE', [ADMIN_EMAIL]);

    if (rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(ADMIN_PASSWORD, salt);

      await client.query(
        `INSERT INTO users (full_name, email, password, role, is_active, is_deleted, email_verified, created_at, updated_at)
         VALUES ($1,$2,$3,$4, TRUE, FALSE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        ['CI Admin', ADMIN_EMAIL, hash, 'ADMIN']
      );

      console.log('Created test admin:', ADMIN_EMAIL);
    } else {
      console.log('Test admin already exists:', ADMIN_EMAIL);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
