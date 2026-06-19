const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const { migrateAddRoleColumn } = require('./migrations/addRoleColumn');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const operationRoutes = require('./routes/operationRoutes');
const masterDataRoutes = require('./routes/masterDataRoutes');
const saleRoutes = require('./routes/saleRoutes');
const managementReportRoutes = require('./routes/managementReportRoutes');

// Ejecutar migraciones
migrateAddRoleColumn();

const app = express();
const allowedOrigin = process.env.CLIENT_ORIGIN || /http:\/\/localhost:\d+/;
app.use(cors({ origin: allowedOrigin, credentials: true }));
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3001;

app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/master-data', masterDataRoutes);
app.use('/api/management-reports', managementReportRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API Express + SQL Server Express funcionando' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Error interno del servidor' });
});

function startServer(port = DEFAULT_PORT) {
  const server = app.listen(port, () => {
    console.log(`Servidor iniciado en http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Puerto ${port} en uso, probando el siguiente puerto...`);
      startServer(port + 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
}

startServer();
