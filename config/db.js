const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => {
    console.log('Conectado a SQL Server');
    console.log('Conexión a la Base de datos correcta!');
    return pool;
  })
  .catch((err) => {
    console.error('Error de conexión SQL Server:', err);
    throw err;
  });

module.exports = {
  sql,
  poolPromise
};
