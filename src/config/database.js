import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Configuration de la pool de connexions PostgreSQL
// const pool = new Pool({
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   database: process.env.DB_NAME,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   //max: 20, // Nombre maximum de connexions dans la pool
//   idleTimeoutMillis: 30000, // Temps avant fermeture d'une connexion inactive
//   connectionTimeoutMillis: 2000, // Temps d'attente pour une nouvelle connexion
// });

// Test de connexion
pool.on('connect', () => {
  console.log('✅ Nouvelle connexion PostgreSQL établie');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL:', err);
  process.exit(-1);
});

// Fonction pour tester la connexion
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('🔗 Connexion à PostgreSQL réussie:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion PostgreSQL:', error);
    return false;
  }
};

// Fonction pour exécuter une requête
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Requête exécutée:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erreur requête SQL:', error);
    throw error;
  }
};

// Fonction pour les transactions
export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default pool;