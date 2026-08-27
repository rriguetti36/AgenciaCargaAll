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
  commodities: {
    table: 'dbo.CommodityCatalog',
    fields: ['name', 'estado'],
    select: 'SELECT id, name, estado FROM dbo.CommodityCatalog ORDER BY name',
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
  locations: {
    table: 'dbo.LocationDistricts',
    fields: ['department', 'province', 'district', 'estado'],
    select: 'SELECT id, department, province, district, estado FROM dbo.LocationDistricts ORDER BY department, province, district',
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

  static async getCompanyConfig() {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP 1 *
      FROM dbo.CompanyConfiguration
      WHERE id = 1
    `);
    const config = result.recordset[0] || null;
    if (!config) return null;

    const accounts = await pool.request().query(`
      SELECT id, bankName, accountNumber, cci, estado, sortOrder
      FROM dbo.CompanyBankAccounts
      WHERE companyConfigId = 1
      ORDER BY sortOrder, id
    `);

    return {
      ...config,
      bankAccounts: accounts.recordset,
    };
  }

  static async updateCompanyConfig(data) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction)
      .input('id', sql.Int, 1)
      .input('companyName', sql.NVarChar(150), data.companyName || null)
      .input('businessName', sql.NVarChar(180), data.businessName || null)
      .input('legalRepresentative', sql.NVarChar(150), data.legalRepresentative || null)
      .input('ruc', sql.NVarChar(20), data.ruc || null)
      .input('address', sql.NVarChar(250), data.address || null)
      .input('department', sql.NVarChar(100), data.department || null)
      .input('province', sql.NVarChar(100), data.province || null)
      .input('district', sql.NVarChar(100), data.district || null)
      .input('facebookUrl', sql.NVarChar(250), data.facebookUrl || null)
      .input('instagramUrl', sql.NVarChar(250), data.instagramUrl || null)
      .input('websiteUrl', sql.NVarChar(250), data.websiteUrl || null)
      .input('logoPath', sql.NVarChar(250), data.logoPath || null)
      .input('showIncludesInPdf', sql.Bit, data.showIncludesInPdf ?? 1)
      .input('showExcludesInPdf', sql.Bit, data.showExcludesInPdf ?? 1)
      .input('showDocumentsInPdf', sql.Bit, data.showDocumentsInPdf ?? 1)
      .input('showFooterTextInPdf', sql.Bit, data.showFooterTextInPdf ?? 1)
      .input('showBankAccountsInPdf', sql.Bit, data.showBankAccountsInPdf ?? 1)
      .input('defaultIncludesText', sql.NVarChar(sql.MAX), data.defaultIncludesText || null)
      .input('defaultExcludesText', sql.NVarChar(sql.MAX), data.defaultExcludesText || null)
      .input('defaultDocumentsText', sql.NVarChar(sql.MAX), data.defaultDocumentsText || null)
      .input('footerText', sql.NVarChar(sql.MAX), data.footerText || null);

      await request.query(`
      UPDATE dbo.CompanyConfiguration
      SET companyName = @companyName,
          businessName = @businessName,
          legalRepresentative = @legalRepresentative,
          ruc = @ruc,
          address = @address,
          department = @department,
          province = @province,
          district = @district,
          facebookUrl = @facebookUrl,
          instagramUrl = @instagramUrl,
          websiteUrl = @websiteUrl,
          logoPath = @logoPath,
          showIncludesInPdf = @showIncludesInPdf,
          showExcludesInPdf = @showExcludesInPdf,
          showDocumentsInPdf = @showDocumentsInPdf,
          showFooterTextInPdf = @showFooterTextInPdf,
          showBankAccountsInPdf = @showBankAccountsInPdf,
          defaultIncludesText = @defaultIncludesText,
          defaultExcludesText = @defaultExcludesText,
          defaultDocumentsText = @defaultDocumentsText,
          footerText = @footerText,
          updatedAt = SYSUTCDATETIME()
      WHERE id = @id;
    `);

      await new sql.Request(transaction)
        .input('companyConfigId', sql.Int, 1)
        .query('DELETE FROM dbo.CompanyBankAccounts WHERE companyConfigId = @companyConfigId;');

      const bankAccounts = Array.isArray(data.bankAccounts) ? data.bankAccounts : [];
      for (let index = 0; index < bankAccounts.length; index++) {
        const account = bankAccounts[index] || {};
        if (!account.bankName && !account.accountNumber && !account.cci) continue;
        await new sql.Request(transaction)
          .input('companyConfigId', sql.Int, 1)
          .input('bankName', sql.NVarChar(120), account.bankName || null)
          .input('accountNumber', sql.NVarChar(80), account.accountNumber || null)
          .input('cci', sql.NVarChar(80), account.cci || null)
          .input('estado', sql.Bit, account.estado ?? 1)
          .input('sortOrder', sql.Int, index + 1)
          .query(`
            INSERT INTO dbo.CompanyBankAccounts (companyConfigId, bankName, accountNumber, cci, estado, sortOrder)
            VALUES (@companyConfigId, @bankName, @accountNumber, @cci, @estado, @sortOrder);
          `);
      }

      await transaction.commit();

      return MasterDataModel.getCompanyConfig();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = MasterDataModel;
