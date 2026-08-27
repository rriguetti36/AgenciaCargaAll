import React, { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  Input,
  NumberInput,
  NumberInputField,
  Select,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  Tabs,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react'
import api from '../services/api'
import { DataTable, ListCard, PageHeader } from '../components/ListPage'

const catalogs = [
  { type: 'operations', label: 'Operacion', fields: ['name'] },
  { type: 'modalities', label: 'Modalidad', fields: ['name'] },
  { type: 'services', label: 'Servicio', fields: ['name'] },
  { type: 'commodities', label: 'Mercaderias', fields: ['name'] },
  { type: 'countries', label: 'Paises', fields: ['name', 'code'] },
  { type: 'ports', label: 'Puertos', fields: ['countryId', 'name', 'code', 'portType'] },
  { type: 'conditions', label: 'Condiciones comerciales', fields: ['conditionType', 'description'] },
  { type: 'documents', label: 'Documentos requeridos', fields: ['name'] },
  { type: 'tariffs', label: 'Tarifarios', fields: ['tariffType', 'concept', 'countryId', 'portId', 'currency', 'amount'] },
  { type: 'internationalFreight', label: 'Flete internacional', fields: ['name', 'currency', 'amount'] },
  { type: 'internationalInsurance', label: 'Seguro internacional', fields: ['name', 'currency', 'amount'] },
  { type: 'customsService', label: 'Servicio de aduanas', fields: ['name', 'currency', 'amount'] },
  { type: 'localTransport', label: 'Transporte local', fields: ['name', 'currency', 'amount'] },
  { type: 'units', label: 'Unidades de medida', fields: ['code', 'name'] },
]

function emptyForm(fields) {
  return fields.reduce((acc, field) => ({ ...acc, [field]: field === 'currency' ? 'USD' : '' }), {})
}

export default function MasterData() {
  const [data, setData] = useState({})
  const [forms, setForms] = useState(() => Object.fromEntries(catalogs.map((catalog) => [catalog.type, emptyForm(catalog.fields)])))
  const [companyConfig, setCompanyConfig] = useState({})
  const [logoFile, setLogoFile] = useState(null)
  const toast = useToast()

  const loadAll = async () => {
    const result = {}
    for (const catalog of catalogs) {
      const res = await api.get(`/master-data/${catalog.type}`)
      result[catalog.type] = res.data
    }
    const [locationsRes, companyConfigRes] = await Promise.all([
      api.get('/master-data/locations'),
      api.get('/master-data/company-config'),
    ])
    result.locations = locationsRes.data
    setData(result)
    setCompanyConfig(companyConfigRes.data || {})
  }

  const activeLocations = useMemo(() => (data.locations || []).filter((item) => item.estado !== false), [data.locations])
  const departments = useMemo(() => [...new Set(activeLocations.map((item) => item.department))], [activeLocations])
  const provinces = useMemo(() => (
    [...new Set(activeLocations.filter((item) => item.department === companyConfig.department).map((item) => item.province))]
  ), [activeLocations, companyConfig.department])
  const districts = useMemo(() => (
    activeLocations
      .filter((item) => item.department === companyConfig.department && item.province === companyConfig.province)
      .map((item) => item.district)
  ), [activeLocations, companyConfig.department, companyConfig.province])

  useEffect(() => {
    loadAll().catch((err) => toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' }))
  }, [])

  const updateForm = (type, field, value) => {
    setForms((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
        ...(field === 'countryId' ? { portId: '' } : {}),
      },
    }))
  }

  const updateCompanyConfig = (field, value) => {
    setCompanyConfig((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'department' ? { province: '', district: '' } : {}),
      ...(field === 'province' ? { district: '' } : {}),
    }))
  }

  const createItem = async (catalog) => {
    try {
      const payload = { ...forms[catalog.type] }
      for (const key of ['countryId', 'portId']) {
        if (payload[key]) payload[key] = Number(payload[key])
      }
      if (payload.amount) payload.amount = Number(payload.amount)
      await api.post(`/master-data/${catalog.type}`, payload)
      setForms((prev) => ({ ...prev, [catalog.type]: emptyForm(catalog.fields) }))
      await loadAll()
      toast({ title: 'Registro agregado', status: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    }
  }

  const saveCompanyConfig = async () => {
    try {
      const payload = {
        ...companyConfig,
        showIncludesInPdf: Boolean(Number(companyConfig.showIncludesInPdf)),
        showExcludesInPdf: Boolean(Number(companyConfig.showExcludesInPdf)),
        showDocumentsInPdf: Boolean(Number(companyConfig.showDocumentsInPdf)),
        showFooterTextInPdf: Boolean(Number(companyConfig.showFooterTextInPdf)),
        showBankAccountsInPdf: Boolean(Number(companyConfig.showBankAccountsInPdf)),
        bankAccounts: (companyConfig.bankAccounts || []).filter((account) => account.bankName || account.accountNumber || account.cci),
      }
      const { data: saved } = await api.put('/master-data/company-config', payload)
      setCompanyConfig(saved || {})
      toast({ title: 'Configuracion guardada', status: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    }
  }

  const uploadLogo = async () => {
    if (!logoFile) {
      toast({ title: 'Selecciona un logo PNG o JPG', status: 'info' })
      return
    }
    try {
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(logoFile)
      })
      const { data: saved } = await api.post('/master-data/company-config/logo', { fileData })
      setCompanyConfig(saved || {})
      setLogoFile(null)
      toast({ title: 'Logo actualizado', status: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    }
  }

  const renderField = (catalog, field) => {
    const form = forms[catalog.type]
    if (field === 'countryId') {
      return (
        <FormControl key={field}>
          <FormLabel>Pais</FormLabel>
          <Select value={form[field]} onChange={(e) => updateForm(catalog.type, field, e.target.value)}>
            <option value="">Seleccionar</option>
            {(data.countries || []).map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
          </Select>
        </FormControl>
      )
    }
    if (field === 'portId') {
      const availablePorts = form.countryId
        ? (data.ports || []).filter((port) => String(port.countryId) === String(form.countryId))
        : data.ports || []

      return (
        <FormControl key={field}>
          <FormLabel>Puerto</FormLabel>
          <Select value={form[field]} onChange={(e) => updateForm(catalog.type, field, e.target.value)}>
            <option value="">Seleccionar</option>
            {availablePorts.map((port) => <option key={port.id} value={port.id}>{port.name}</option>)}
          </Select>
        </FormControl>
      )
    }
    if (field === 'conditionType') {
      return (
        <FormControl key={field}>
          <FormLabel>Tipo</FormLabel>
          <Select value={form[field]} onChange={(e) => updateForm(catalog.type, field, e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="incluye">Incluye</option>
            <option value="no_incluye">No incluye</option>
          </Select>
        </FormControl>
      )
    }
    if (field === 'tariffType') {
      return (
        <FormControl key={field}>
          <FormLabel>Tipo tarifario</FormLabel>
          <Select value={form[field]} onChange={(e) => updateForm(catalog.type, field, e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="origen">Origen</option>
            <option value="destino">Destino</option>
          </Select>
        </FormControl>
      )
    }
    if (field === 'amount') {
      return (
        <FormControl key={field}>
          <FormLabel>Monto</FormLabel>
          <NumberInput value={form[field]} min={0} onChange={(value) => updateForm(catalog.type, field, value)}>
            <NumberInputField />
          </NumberInput>
        </FormControl>
      )
    }
    if (field === 'currency') {
      return (
        <FormControl key={field}>
          <FormLabel>Moneda</FormLabel>
          <Select value={form[field]} onChange={(e) => updateForm(catalog.type, field, e.target.value)}>
            <option value="USD">USD</option>
            <option value="PEN">PEN</option>
          </Select>
        </FormControl>
      )
    }
    return (
      <FormControl key={field}>
        <FormLabel>{field === 'name' ? 'Nombre' : field === 'description' ? 'Descripcion' : field === 'concept' ? 'Concepto' : field === 'currency' ? 'Moneda' : field === 'code' ? 'Codigo' : field}</FormLabel>
        <Input value={form[field]} onChange={(e) => updateForm(catalog.type, field, ['currency', 'code'].includes(field) ? e.target.value.toUpperCase() : e.target.value)} />
      </FormControl>
    )
  }

  const renderBooleanSelect = (field, label) => (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <Select value={Number(companyConfig[field] ?? 1)} onChange={(e) => updateCompanyConfig(field, e.target.value)}>
        <option value={1}>Si</option>
        <option value={0}>No</option>
      </Select>
    </FormControl>
  )

  const addBankAccount = () => {
    setCompanyConfig((prev) => ({
      ...prev,
      bankAccounts: [
        ...(prev.bankAccounts || []),
        { bankName: '', accountNumber: '', cci: '', estado: true },
      ],
    }))
  }

  const updateBankAccount = (index, field, value) => {
    setCompanyConfig((prev) => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).map((account, accountIndex) => (
        accountIndex === index ? { ...account, [field]: value } : account
      )),
    }))
  }

  const removeBankAccount = (index) => {
    setCompanyConfig((prev) => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).filter((_, accountIndex) => accountIndex !== index),
    }))
  }

  return (
    <Stack spacing={6}>
      <PageHeader
        title="Tablas maestras"
        description="Operacion, modalidad, servicio, paises, puertos, condiciones, documentos y tarifarios."
      />

      <Tabs variant="enclosed" colorScheme="teal">
        <TabList overflowX="auto" overflowY="hidden">
          {catalogs.map((catalog) => <Tab key={catalog.type}>{catalog.label}</Tab>)}
          <Tab>Configura CIA</Tab>
        </TabList>
        <TabPanels>
          {catalogs.map((catalog) => (
            <TabPanel key={catalog.type} px={0}>
              <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5} mb={5}>
                <Grid templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }} gap={4}>
                  {catalog.fields.map((field) => renderField(catalog, field))}
                </Grid>
                <Button mt={4} colorScheme="teal" onClick={() => createItem(catalog)}>Agregar</Button>
              </Box>

              <ListCard>
                <DataTable>
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Registro</Th>
                      <Th>Detalle</Th>
                      <Th>Estado</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {(data[catalog.type] || []).map((item) => (
                      <Tr key={item.id}>
                        <Td fontWeight="700">{item.name || item.concept || item.description}</Td>
                        <Td>
                          {item.countryName || item.portName || item.code || item.conditionType || item.tariffType || '-'}
                          {item.amount !== undefined ? ` / ${item.currency} ${Number(item.amount).toFixed(2)}` : ''}
                        </Td>
                        <Td><Badge colorScheme={item.estado === false ? 'gray' : 'green'}>{item.estado === false ? 'Inactivo' : 'Activo'}</Badge></Td>
                      </Tr>
                    ))}
                  </Tbody>
                </DataTable>
              </ListCard>
            </TabPanel>
          ))}
          <TabPanel px={0}>
            <Stack spacing={5}>
              <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
                <Heading size="sm" mb={4}>Datos de la compania</Heading>
                <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={4}>
                  <FormControl>
                    <FormLabel>Nombre comercial</FormLabel>
                    <Input value={companyConfig.companyName || ''} onChange={(e) => updateCompanyConfig('companyName', e.target.value)} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Razon social</FormLabel>
                    <Input value={companyConfig.businessName || ''} onChange={(e) => updateCompanyConfig('businessName', e.target.value)} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>RUC</FormLabel>
                    <Input value={companyConfig.ruc || ''} onChange={(e) => updateCompanyConfig('ruc', e.target.value)} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Nombre apoderado</FormLabel>
                    <Input value={companyConfig.legalRepresentative || ''} onChange={(e) => updateCompanyConfig('legalRepresentative', e.target.value)} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Direccion</FormLabel>
                    <Input value={companyConfig.address || ''} onChange={(e) => updateCompanyConfig('address', e.target.value)} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Departamento</FormLabel>
                    <Select value={companyConfig.department || ''} onChange={(e) => updateCompanyConfig('department', e.target.value)}>
                      <option value="">Seleccionar</option>
                      {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Provincia</FormLabel>
                    <Select value={companyConfig.province || ''} onChange={(e) => updateCompanyConfig('province', e.target.value)}>
                      <option value="">Seleccionar</option>
                      {provinces.map((province) => <option key={province} value={province}>{province}</option>)}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Distrito</FormLabel>
                    <Select value={companyConfig.district || ''} onChange={(e) => updateCompanyConfig('district', e.target.value)}>
                      <option value="">Seleccionar</option>
                      {districts.map((district) => <option key={district} value={district}>{district}</option>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Box>

              <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
                <Heading size="sm" mb={4}>Logo y redes</Heading>
                <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={4}>
                  <FormControl>
                    <FormLabel>Facebook</FormLabel>
                    <Input value={companyConfig.facebookUrl || ''} onChange={(e) => updateCompanyConfig('facebookUrl', e.target.value)} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Instagram</FormLabel>
                    <Input value={companyConfig.instagramUrl || ''} onChange={(e) => updateCompanyConfig('instagramUrl', e.target.value)} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Pagina web</FormLabel>
                    <Input value={companyConfig.websiteUrl || ''} onChange={(e) => updateCompanyConfig('websiteUrl', e.target.value)} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Logo actual</FormLabel>
                    <Text fontSize="sm" color="gray.600">{companyConfig.logoPath || 'Sin logo registrado'}</Text>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Nuevo logo</FormLabel>
                    <Input type="file" accept="image/png,image/jpeg" pt={1} onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                  </FormControl>
                  <Box alignSelf="end">
                    <Button colorScheme="teal" variant="outline" onClick={uploadLogo}>Actualizar logo</Button>
                  </Box>
                </Grid>
              </Box>

              <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
                <Heading size="sm" mb={4}>Pie de cotizacion PDF</Heading>
                <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={4} mb={4}>
                  {renderBooleanSelect('showIncludesInPdf', 'Mostrar Incluye')}
                  {renderBooleanSelect('showExcludesInPdf', 'Mostrar No incluye')}
                  {renderBooleanSelect('showDocumentsInPdf', 'Mostrar Documentos')}
                  {renderBooleanSelect('showFooterTextInPdf', 'Mostrar Pie de pagina')}
                  {renderBooleanSelect('showBankAccountsInPdf', 'Mostrar Cuentas bancarias')}
                </Grid>
                <FormControl mt={4}>
                  <FormLabel>Pie de pagina</FormLabel>
                  <Textarea
                    minH="220px"
                    value={companyConfig.footerText || ''}
                    onChange={(e) => updateCompanyConfig('footerText', e.target.value)}
                  />
                  <Text mt={2} fontSize="sm" color="gray.500">
                    Variables disponibles: [CIA], [NOMBRE_CIA], [RAZON_SOCIAL], [EMPRESA], [CLIENTE].
                  </Text>
                </FormControl>
              </Box>

              <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
                <Heading size="sm" mb={4}>Cuentas bancarias</Heading>
                <Stack spacing={3}>
                  {(companyConfig.bankAccounts || []).map((account, index) => (
                    <Grid key={account.id || index} templateColumns={{ base: '1fr', lg: '1fr 1fr 1fr auto' }} gap={3} alignItems="end">
                      <FormControl>
                        <FormLabel>Banco</FormLabel>
                        <Input value={account.bankName || ''} onChange={(e) => updateBankAccount(index, 'bankName', e.target.value)} />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Numero cta</FormLabel>
                        <Input value={account.accountNumber || ''} onChange={(e) => updateBankAccount(index, 'accountNumber', e.target.value)} />
                      </FormControl>
                      <FormControl>
                        <FormLabel>CCI</FormLabel>
                        <Input value={account.cci || ''} onChange={(e) => updateBankAccount(index, 'cci', e.target.value)} />
                      </FormControl>
                      <Button colorScheme="red" variant="outline" onClick={() => removeBankAccount(index)}>Quitar</Button>
                    </Grid>
                  ))}
                  <Box>
                    <Button colorScheme="teal" variant="outline" onClick={addBankAccount}>Agregar cuenta</Button>
                  </Box>
                </Stack>
                <Button mt={4} colorScheme="teal" onClick={saveCompanyConfig}>Guardar configuracion</Button>
              </Box>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  )
}
