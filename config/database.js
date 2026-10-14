const mysql = require('mysql');

function createDatabase() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'transportadora',
    charset: 'utf8mb4',
    connectionLimit: 10,
    connectTimeout: 5000
  });
  return {
    query(sql, values = []) {
      return new Promise((resolve, reject) => {
        pool.query(sql, values, (error, results) => error ? reject(error) : resolve(results));
      });
    },
    close() {
      return new Promise((resolve, reject) => pool.end(error => error ? reject(error) : resolve()));
    }
  };
}

module.exports = { createDatabase };
