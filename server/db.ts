// Update your server/db.ts with correct SSL typing

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Log the database connection URL being used (masking sensitive parts)
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  const maskedUrl = databaseUrl.replace(/:(.*?)@/, ':****@');
  console.log('Database connection string being used:', maskedUrl);
} else {
  console.error('DATABASE_URL environment variable is not set.');
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Determine SSL configuration based on environment
const isProduction = process.env.NODE_ENV === 'production';

// Create connection pool with proper SSL configuration
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? {
    rejectUnauthorized: false  // This accepts self-signed certificates
  } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 10000, // How long to wait for a connection
});

// Add connection pool monitoring
pool.on('connect', (client) => {
  console.log('Connected to PostgreSQL database');
});

pool.on('acquire', (client) => {
  console.log('Client acquired from pool');
});

pool.on('remove', (client) => {
  console.log('Client removed from pool');
});

pool.on('error', (err, client) => {
  console.error('Error on idle client', err);
});

export const db = drizzle(pool, { schema });

console.log('Drizzle schema keys:', Object.keys(schema));

// Test the connection immediately with better error handling
pool.connect()
  .then(client => {
    console.log('✅ Database connection successful');
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    // Don't exit in production, let the app continue
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });