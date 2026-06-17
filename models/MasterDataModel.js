const { poolPromise, sql } = require('../config/db');

const tableMap = {
  operations: {
    table: 'dbo.OperationCatalog',
    fields: ['name', 'estado'],
    select: 'SELECT id, name, estado FROM dbo.OperationCatalog ORDER BY name',
  },
  modalities: {
    table: 'dbo.ModalityCatalog',
    fields: ['name', 'estado'],
    select: 'SELECT id, name, estado FROM dbo.ModalityCatalog ORDER BY name',
  },
  services: {
    table: 'dbo.ServiceCatalog',
    fields: ['name', 'estado'],
    select: 'SELECT id, name, estado FROM dbo.ServiceCatalog ORDER BY name',
  },
  countries: {
    table: 'dbo.Countries',
    fields: ['name', 'code', 'estado'],
    select: 'SELECT id, name, code, estado FROM dbo.Countries ORDER BY name',
  },
  ports: {
    table: 'dbo.Ports',
    fields: ['countryId', 'name', 'code', 'portType', 'estado'],
    select: `
      SELECT p.id, p.countryId, c.name AS countryName, p.name, p.code, p.portType, p.estado
      FROM dbo.Ports AS p
      INNER JOIN dbo.Countries AS c ON c.id = p.countryId
      ORDER BY c.name, p.name
    `,
  },
  conditions: {
    table: 'dbo.CommercialConditions',
    fields: ['conditionType', 'description', 'estado'],
    select: 'SELECT id, conditionType, description, estado FROM dbo.CommercialConditions ORDER BY conditionType, description',
  },
  documents: {
    table: 'dbo.RequiredDocumentCatalog',
    fields: ['name', 'estado'],
    select: 'SELECT id, name, estado FROM dbo.RequiredDocumentCatalog ORDER BY name',
  },
  tariffs: {
    table: 'dbo.Tariffs',
    fields: ['tariffType', 'concept', 'countryId', 'portId', 'currency', 'amount', 'estado'],
    select: `
      SELECT t.id, t.tariffType, t.concept, t.countryId, c.name AS countryName, t.portId, p.name AS portName,
             t.currency, t.amount, t.estado, t.createdAt
      FROM dbo.Tariffs AS t
      LEFT JOIN dbo.Countries AS c ON c.id = t.countryId
      LEFT JOIN dbo.Ports AS p ON p.id = t.portId
      ORDER BY t.tariffType, t.concept
    `,
  },
  internationalFreight: {
    table: 'dbo.InternationalFreightConcepts',
    fields: ['name', 'currency', 'amount', 'estado'],
    select: 'SELECT id, name, currency, amount, estado, createdAt FROM dbo.InternationalFreightConcepts ORDER BY name',
  },
  internationalInsurance: {
    table: 'dbo.InternationalInsuranceConcepts',
    fields: ['name', 'currency', 'amount', 'estado'],
    select: 'SELECT id, name, currency, amount, estado, createdAt FROM dbo.InternationalInsuranceConcepts ORDER BY name',
  },
  customsService: {
    table: 'dbo.CustomsServiceConcepts',
    fields: ['name', 'currency', 'amount', 'estado'],
    select: 'SELECT id, name, currency, amount, estado, createdAt FROM dbo.CustomsServiceConcepts ORDER BY name',
  },
  localTransport: {
    table: 'dbo.LocalTransportConcepts',
    fields: ['name', 'currency', 'amount', 'estado'],
    select: 'SELECT id, name, currency, amount, estado, createdAt FROM dbo.LocalTransportConcepts ORDER BY name',
  },
  units: {
    table: 'dbo.MeasurementUnits',
    fields: ['code', 'name', 'estado'],
    select: 'SELECT id, code, name, estado FROM dbo.MeasurementUnits ORDER BY code',
  },
};

function getConfig(type) {
  const config = tableMap[type];
  if (!config) {
    const error = new Error('Tabla maestra no soportada');
    error.status = 404;
    throw error;
  }
  return config;
}

function inputRequest(request, field, value) {
  if (field.endsWith('Id')) return request.input(field, sql.Int, value || null);
  if (field === 'estado') return request.input(field, sql.Bit, value ?? 1);
  if (field === 'amount') return request.input(field, sql.Decimal(18, 2), value ?? 0);
  return request.input(field, sql.NVarChar(sql.MAX), value || null);
}

class MasterDataModel {
  static async list(type) {
    const pool = await poolPromise;
    const config = getConfig(type);
    const result = await pool.request().query(config.select);
    return result.recordset;
  }

  static async create(type, data) {
    const pool = await poolPromise;
    const config = getConfig(type);
    const request = pool.request();

    for (const field of config.fields) {
      inputRequest(request, field, data[field]);
    }

    const fields = config.fields.join(', ');
    const values = config.fields.map((field) => `@${field}`).join(', ');
    const result = await request.query(`
      INSERT INTO ${config.table} (${fields})
      OUTPUT INSERTED.*
      VALUES (${values})
    `);
    return result.recordset[0];
  }
}

module.exports = MasterDataModel;
