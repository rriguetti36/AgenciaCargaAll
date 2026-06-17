import React, { useEffect, useState } from 'react'
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
  const toast = useToast()

  const loadAll = async () => {
    const result = {}
    for (const catalog of catalogs) {
      const res = await api.get(`/master-data/${catalog.type}`)
      result[catalog.type] = res.data
    }
    setData(result)
  }

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
    return (
      <FormControl key={field}>
        <FormLabel>{field === 'name' ? 'Nombre' : field === 'description' ? 'Descripcion' : field === 'concept' ? 'Concepto' : field === 'currency' ? 'Moneda' : field === 'code' ? 'Codigo' : field}</FormLabel>
        <Input value={form[field]} onChange={(e) => updateForm(catalog.type, field, ['currency', 'code'].includes(field) ? e.target.value.toUpperCase() : e.target.value)} />
      </FormControl>
    )
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
        </TabPanels>
      </Tabs>
    </Stack>
  )
}
