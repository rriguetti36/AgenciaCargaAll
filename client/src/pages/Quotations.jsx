import React, { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Select,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tooltip,
  Tr,
  useToast,
} from '@chakra-ui/react'
import { AddIcon, ArrowBackIcon, CheckCircleIcon, CheckIcon, CloseIcon, DeleteIcon, DownloadIcon, EditIcon, ViewIcon } from '@chakra-ui/icons'
import { useNavigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import api from '../services/api'
import { DataTable, ListCard, PageHeader, PrimaryActionButton } from '../components/ListPage'

const sections = [
  ['gastos_origen', 'GASTOS EN ORIGEN', null],
  ['gastos_destino', 'SERVICIOS Y GASTOS EN DESTINO', null],
]

const IGV_RATE = 0.18
const currencyOptions = ['USD', 'PEN']
const destinationQuickCharges = [
  'Flete internacional',
  'Seguro',
  'Servicio de aduanas',
  'Transporte local',
]

const defaultDocuments = [
  'Factura Comercial',
  'Packing List',
  'BL Original o Telex Release',
  'Certificados aplicables segun mercancia',
]

const emptyForm = {
  customerId: '',
  operationCatalogId: '',
  modalityCatalogId: '',
  serviceCatalogId: '',
  operationType: 'importacion',
  transportMode: 'maritima',
  origin: '',
  originCountryId: '',
  originPortId: '',
  destination: '',
  destinationCountryId: '',
  destinationPortId: '',
  commodityCatalogId: '',
  commodity: '',
  quantity: '',
  quantityUnitId: '',
  grossWeight: '',
  weightUnitId: '',
  volume: '',
  volumeUnitId: '',
  incoterm: '',
  transitTime: '',
  frequency: '',
  currency: 'USD',
  status: 'solicitada_pricing',
  notes: '',
  includesText: '',
  excludesText: '',
  requiredDocumentsText: defaultDocuments.join('\n'),
  charges: [],
}

const statusOptions = [
  ['solicitada_pricing', 'Solicitada a Pricing', 'orange'],
  ['pricing_completado', 'Pricing completado', 'purple'],
  ['enviada', 'Enviada al cliente', 'blue'],
  ['aceptada', 'Aprobada por cliente', 'green'],
  ['rechazada', 'Rechazada', 'red'],
  ['borrador', 'Borrador', 'gray'],
]

const statusLabel = (status) => statusOptions.find(([value]) => value === status)?.[1] || status
const statusColor = (status) => statusOptions.find(([value]) => value === status)?.[2] || 'gray'
const formatMeasure = (value, unitCode, decimals = 2) => {
  const number = Number(value || 0)
  if (!number) return '-'
  return `${number.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unitCode || ''}`.trim()
}
const cleanText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()
const splitLines = (value) => String(value || '').split('\n').map((line) => line.trim()).filter(Boolean)
const normalizeText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const assetUrl = (path) => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const apiBase = api.defaults.baseURL || 'http://localhost:3001/api'
  const assetBase = apiBase.replace(/\/api\/?$/, '')
  return `${assetBase}${path.startsWith('/') ? path : `/${path}`}`
}
const loadPdfLogo = async (preferredPath) => {
  const logoPaths = [
    ...(preferredPath ? [{ path: preferredPath, format: preferredPath.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG' }] : []),
    { path: '/imagenes/logo.png', format: 'PNG' },
    { path: '/imagenes/logo.jpg', format: 'JPEG' },
    { path: '/imagenes/logo.jpeg', format: 'JPEG' },
  ]
  for (const { path, format } of logoPaths) {
    try {
      const response = await fetch(assetUrl(path), { cache: 'no-store' })
      if (!response.ok) continue
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.toLowerCase().startsWith('image/')) continue
      const blob = await response.blob()
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
      return dataUrl ? { dataUrl, format } : null
    } catch {
      // Continue with the next possible logo extension.
    }
  }
  return null
}
const normalizeChargeSection = (value) => {
  const section = value || 'gastos_destino'
  return ['flete', 'seguro', 'aduana', 'flete_internacional', 'seguro_internacional', 'servicio_aduanas', 'transporte_local'].includes(section)
    ? 'gastos_destino'
    : section
}

function findPeruDefaults(masterData) {
  const peru = masterData.countries.find((country) => (
    String(country.code || '').toUpperCase() === 'PE'
    || normalizeText(country.name) === 'peru'
  ))
  const callao = masterData.ports.find((port) => (
    peru
    && String(port.countryId) === String(peru.id)
    && (normalizeText(port.name).includes('callao') || String(port.code || '').toUpperCase() === 'PECLL')
  ))

  return {
    countryId: peru ? String(peru.id) : '',
    portId: callao ? String(callao.id) : '',
  }
}

function findCatalogId(items, names = []) {
  const normalizedNames = names.map(normalizeText)
  const item = items.find((entry) => normalizedNames.includes(normalizeText(entry.name)))
  return item ? String(item.id) : ''
}

function buildDefaultForm(masterData, operationType = 'importacion') {
  const defaults = findPeruDefaults(masterData)
  const next = {
    ...emptyForm,
    operationType,
    transportMode: 'maritima',
    operationCatalogId: findCatalogId(masterData.operations, [operationType]),
    modalityCatalogId: findCatalogId(masterData.modalities, ['maritima']),
    serviceCatalogId: findCatalogId(masterData.services, ['puerto a puerto']) || (masterData.services[0]?.id ? String(masterData.services[0].id) : ''),
  }

  if (!defaults.countryId) return next

  if (operationType === 'exportacion') {
    return {
      ...next,
      originCountryId: defaults.countryId,
      originPortId: defaults.portId,
    }
  }

  return {
    ...next,
    destinationCountryId: defaults.countryId,
    destinationPortId: defaults.portId,
  }
}

export default function Quotations() {
  const [customers, setCustomers] = useState([])
  const [quotations, setQuotations] = useState([])
  const [master, setMaster] = useState({
    operations: [],
    modalities: [],
    services: [],
    commodities: [],
    countries: [],
    ports: [],
    tariffs: [],
    conditions: [],
    documents: [],
    units: [],
  })
  const [form, setForm] = useState(emptyForm)
  const [editingSection, setEditingSection] = useState('gastos_destino')
  const [editingQuotationId, setEditingQuotationId] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [tariffModal, setTariffModal] = useState({ isOpen: false, type: null })
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      return {}
    }
  }, [])
  const isPricing = currentUser?.role === 'pricing' || currentUser?.role === 'admin'
  const isAdvisor = currentUser?.role === 'asesor'
  const isCommercial = ['asesor', 'user', 'customer_service', 'admin'].includes(currentUser?.role)
  const canAccessOperations = !['asesor', 'pricing'].includes(currentUser?.role)
  const advisorCanEditRequest = isAdvisor && (!editingQuotationId || form.status === 'solicitada_pricing')
  const canEditCharges = isPricing || advisorCanEditRequest
  const canSubmitForm = isPricing || !isAdvisor || advisorCanEditRequest
  const advisorCanViewPricing = isAdvisor && editingQuotationId && form.status !== 'solicitada_pricing'
  const showPricingDetail = !isAdvisor || advisorCanEditRequest || advisorCanViewPricing
  const canEditOperationInfo = !isAdvisor || advisorCanEditRequest || isPricing

  const chargeQuantity = (charge) => Number(charge.quantity || 1)
  const chargeSaleSubtotal = (charge) => Number(charge.saleAmount || 0) * chargeQuantity(charge)
  const chargeCostSubtotal = (charge) => Number(charge.costAmount || 0) * chargeQuantity(charge)
  const chargeIgvAmount = (charge) => {
    if (charge.section !== 'gastos_destino') return 0
    const rate = Number(charge.igvRate ?? IGV_RATE)
    return chargeSaleSubtotal(charge) * rate
  }
  const chargeLineTotal = (charge) => chargeSaleSubtotal(charge) + chargeIgvAmount(charge)
  const totalQuoted = useMemo(() => {
    return form.charges.reduce((sum, charge) => sum + chargeLineTotal(charge), 0)
  }, [form.charges])
  const totalCost = useMemo(() => {
    return form.charges.reduce((sum, charge) => sum + chargeCostSubtotal(charge), 0)
  }, [form.charges])
  const totalSaleBeforeTax = useMemo(() => {
    return form.charges.reduce((sum, charge) => sum + chargeSaleSubtotal(charge), 0)
  }, [form.charges])
  const estimatedProfit = totalSaleBeforeTax - totalCost
  const estimatedMargin = totalSaleBeforeTax > 0 ? (estimatedProfit / totalSaleBeforeTax) * 100 : 0

  const portsByCountry = (countryId) => master.ports.filter((port) => String(port.countryId) === String(countryId))
  const findCountryName = (countryId) => master.countries.find((country) => String(country.id) === String(countryId))?.name || ''
  const findPortName = (portId) => master.ports.find((port) => String(port.id) === String(portId))?.name || ''
  const tariffsBySelection = (type) => {
    const selectedCountryId = type === 'origen' ? form.originCountryId : form.destinationCountryId
    const selectedPortId = type === 'origen' ? form.originPortId : form.destinationPortId

    if (!selectedCountryId) return []

    return master.tariffs.filter((tariff) => {
      if (tariff.tariffType !== type) return false
      if (String(tariff.countryId) !== String(selectedCountryId)) return false
      if (!selectedPortId) return true
      return !tariff.portId || String(tariff.portId) === String(selectedPortId)
    })
  }

  const loadData = async () => {
    const [
      customersRes,
      quotationsRes,
      operationsRes,
      modalitiesRes,
      servicesRes,
      commoditiesRes,
      countriesRes,
      portsRes,
      tariffsRes,
      conditionsRes,
      documentsRes,
      unitsRes,
    ] = await Promise.all([
      api.get('/customers'),
      api.get('/quotations'),
      api.get('/master-data/operations'),
      api.get('/master-data/modalities'),
      api.get('/master-data/services'),
      api.get('/master-data/commodities'),
      api.get('/master-data/countries'),
      api.get('/master-data/ports'),
      api.get('/master-data/tariffs'),
      api.get('/master-data/conditions'),
      api.get('/master-data/documents'),
      api.get('/master-data/units'),
    ])
    setCustomers(customersRes.data)
    setQuotations(quotationsRes.data)
    const nextMaster = {
      operations: operationsRes.data,
      modalities: modalitiesRes.data,
      services: servicesRes.data,
      commodities: commoditiesRes.data,
      countries: countriesRes.data,
      ports: portsRes.data,
      tariffs: tariffsRes.data,
      conditions: conditionsRes.data,
      documents: documentsRes.data,
      units: unitsRes.data,
    }
    setMaster(nextMaster)
    if (!editingQuotationId && viewMode !== 'form') {
      setForm(buildDefaultForm(nextMaster))
    }
  }

  useEffect(() => {
    loadData().catch((err) => toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' }))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => {
      if (name === 'operationCatalogId') {
        const selectedOperation = master.operations.find((item) => String(item.id) === String(value))
        const selectedName = normalizeText(selectedOperation?.name)
        const currentDefaults = findPeruDefaults(master)
        const baseUpdate = {
          ...prev,
          operationCatalogId: value,
          modalityCatalogId: prev.modalityCatalogId || findCatalogId(master.modalities, ['maritima']),
          serviceCatalogId: prev.serviceCatalogId || findCatalogId(master.services, ['puerto a puerto']) || (master.services[0]?.id ? String(master.services[0].id) : ''),
          transportMode: 'maritima',
        }

        if (selectedName.includes('importacion') || selectedName.includes('import')) {
          return {
            ...baseUpdate,
            operationType: 'importacion',
            destinationCountryId: currentDefaults.countryId || prev.destinationCountryId,
            destinationPortId: currentDefaults.portId || prev.destinationPortId,
          }
        }

        if (selectedName.includes('exportacion') || selectedName.includes('export')) {
          return {
            ...baseUpdate,
            operationType: 'exportacion',
            originCountryId: currentDefaults.countryId || prev.originCountryId,
            originPortId: currentDefaults.portId || prev.originPortId,
          }
        }

        return baseUpdate
      }
      if (name === 'operationType') {
        const currentDefaults = findPeruDefaults(master)
        const hasDefaultDestination = currentDefaults.countryId
          && String(prev.destinationCountryId) === currentDefaults.countryId
          && (!currentDefaults.portId || String(prev.destinationPortId) === currentDefaults.portId)
          && !prev.originCountryId
          && !prev.originPortId
        const hasDefaultOrigin = currentDefaults.countryId
          && String(prev.originCountryId) === currentDefaults.countryId
          && (!currentDefaults.portId || String(prev.originPortId) === currentDefaults.portId)
          && !prev.destinationCountryId
          && !prev.destinationPortId

        if (value === 'exportacion' && hasDefaultDestination) {
          return {
            ...prev,
            operationType: value,
            operationCatalogId: findCatalogId(master.operations, ['exportacion']),
            transportMode: 'maritima',
            modalityCatalogId: prev.modalityCatalogId || findCatalogId(master.modalities, ['maritima']),
            serviceCatalogId: prev.serviceCatalogId || findCatalogId(master.services, ['puerto a puerto']) || (master.services[0]?.id ? String(master.services[0].id) : ''),
            originCountryId: currentDefaults.countryId,
            originPortId: currentDefaults.portId,
            destinationCountryId: '',
            destinationPortId: '',
          }
        }
        if (value === 'importacion' && hasDefaultOrigin) {
          return {
            ...prev,
            operationType: value,
            operationCatalogId: findCatalogId(master.operations, ['importacion']),
            transportMode: 'maritima',
            modalityCatalogId: prev.modalityCatalogId || findCatalogId(master.modalities, ['maritima']),
            serviceCatalogId: prev.serviceCatalogId || findCatalogId(master.services, ['puerto a puerto']) || (master.services[0]?.id ? String(master.services[0].id) : ''),
            originCountryId: '',
            originPortId: '',
            destinationCountryId: currentDefaults.countryId,
            destinationPortId: currentDefaults.portId,
          }
        }
        return { ...prev, operationType: value }
      }
      if (name === 'originCountryId') return { ...prev, originCountryId: value, originPortId: '' }
      if (name === 'destinationCountryId') return { ...prev, destinationCountryId: value, destinationPortId: '' }
      if (name === 'commodityCatalogId') {
        const selectedCommodity = master.commodities.find((item) => String(item.id) === String(value))
        return { ...prev, commodityCatalogId: value, commodity: selectedCommodity?.name || '' }
      }
      return { ...prev, [name]: value }
    })
  }

  const updateCharge = (index, field, value) => {
    const numericFields = ['costAmount', 'saleAmount', 'quantity', 'igvRate']
    const nextValue = numericFields.includes(field) ? String(value).replace(',', '.') : value
    setForm((prev) => ({
      ...prev,
      charges: prev.charges.map((charge, i) => (i === index ? { ...charge, [field]: nextValue } : charge)),
    }))
  }

  const removeCharge = (index) => {
    setForm((prev) => ({
      ...prev,
      charges: prev.charges.filter((_, i) => i !== index),
    }))
  }

  const addCharge = (section) => {
    setEditingSection(section)
    setForm((prev) => ({
      ...prev,
      charges: [...prev.charges, { section, chargeType: section, description: '', currency: prev.currency || 'USD', quantity: 1, costAmount: 0, saleAmount: 0, igvRate: section === 'gastos_destino' ? IGV_RATE : 0 }],
    }))
  }

  const addQuickCharge = (section, description) => {
    setEditingSection(section)
    setForm((prev) => ({
      ...prev,
      charges: [
        ...prev.charges,
        {
          section,
          chargeType: section,
          description,
          currency: prev.currency || 'USD',
          quantity: 1,
          costAmount: 0,
          saleAmount: 0,
          igvRate: section === 'gastos_destino' ? IGV_RATE : 0,
        },
      ],
    }))
  }

  const addConceptCharge = (section, concept) => {
    if (!concept) return
    setEditingSection(section)
    setForm((prev) => ({
      ...prev,
      charges: [
        ...prev.charges,
        {
          section,
          chargeType: section,
          description: concept.name,
          currency: concept.currency || prev.currency || 'USD',
          quantity: 1,
          costAmount: Number(concept.amount || 0),
          saleAmount: Number(concept.amount || 0),
          igvRate: section === 'gastos_destino' ? IGV_RATE : 0,
        },
      ],
    }))
  }

  const applyTariff = (tariff) => {
    const section = tariff.tariffType === 'origen' ? 'gastos_origen' : 'gastos_destino'
    setForm((prev) => ({
      ...prev,
      charges: [
        ...prev.charges,
        {
          section,
          chargeType: section,
          description: tariff.concept,
          currency: tariff.currency,
          quantity: 1,
          costAmount: Number(tariff.amount || 0),
          saleAmount: Number(tariff.amount || 0),
          igvRate: section === 'gastos_destino' ? IGV_RATE : 0,
        },
      ],
    }))
    setEditingSection(section)
  }

  const applyAllTariffs = (type) => {
    const tariffs = tariffsBySelection(type)
    if (!tariffs.length) return
    const section = type === 'origen' ? 'gastos_origen' : 'gastos_destino'
    setForm((prev) => ({
      ...prev,
      charges: [
        ...prev.charges,
        ...tariffs.map((tariff) => ({
          section,
          chargeType: section,
          description: tariff.concept,
          currency: tariff.currency,
          quantity: 1,
          costAmount: Number(tariff.amount || 0),
          saleAmount: Number(tariff.amount || 0),
          igvRate: section === 'gastos_destino' ? IGV_RATE : 0,
        })),
      ],
    }))
    setEditingSection(section)
  }

  const applyCondition = (condition) => {
    const field = condition.conditionType === 'incluye' ? 'includesText' : 'excludesText'
    setForm((prev) => ({
      ...prev,
      [field]: [prev[field], condition.description].filter(Boolean).join('\n'),
    }))
  }

  const applyAllConditions = (conditionType) => {
    const field = conditionType === 'incluye' ? 'includesText' : 'excludesText'
    const descriptions = master.conditions
      .filter((item) => item.conditionType === conditionType)
      .map((item) => item.description)
      .filter(Boolean)
    if (!descriptions.length) return
    setForm((prev) => ({
      ...prev,
      [field]: [prev[field], ...descriptions].filter(Boolean).join('\n'),
    }))
  }

  const applyDocument = (document) => {
    setForm((prev) => ({
      ...prev,
      requiredDocumentsText: [prev.requiredDocumentsText, document.name].filter(Boolean).join('\n'),
    }))
  }

  const buildPayload = () => ({
        ...form,
        customerId: Number(form.customerId),
        origin: findPortName(form.originPortId) || findCountryName(form.originCountryId) || 'Origen pendiente',
        destination: findPortName(form.destinationPortId) || findCountryName(form.destinationCountryId) || 'Destino pendiente',
        operationCatalogId: form.operationCatalogId ? Number(form.operationCatalogId) : null,
        modalityCatalogId: form.modalityCatalogId ? Number(form.modalityCatalogId) : null,
        serviceCatalogId: form.serviceCatalogId ? Number(form.serviceCatalogId) : null,
        commodityCatalogId: form.commodityCatalogId ? Number(form.commodityCatalogId) : null,
        commodity: master.commodities.find((item) => String(item.id) === String(form.commodityCatalogId))?.name || form.commodity || '',
        originCountryId: form.originCountryId ? Number(form.originCountryId) : null,
        originPortId: form.originPortId ? Number(form.originPortId) : null,
        destinationCountryId: form.destinationCountryId ? Number(form.destinationCountryId) : null,
        destinationPortId: form.destinationPortId ? Number(form.destinationPortId) : null,
        quantity: form.quantity === '' ? 0 : Number(form.quantity),
        quantityUnitId: form.quantityUnitId ? Number(form.quantityUnitId) : null,
        grossWeight: form.grossWeight === '' ? 0 : Number(form.grossWeight),
        weightUnitId: form.weightUnitId ? Number(form.weightUnitId) : null,
        volume: form.volume === '' ? 0 : Number(form.volume),
        volumeUnitId: form.volumeUnitId ? Number(form.volumeUnitId) : null,
        charges: form.charges
          .filter((charge) => charge.description || Number(charge.saleAmount))
          .map((charge) => ({
            ...charge,
            quantity: Number(charge.quantity || 1),
            costAmount: Number(charge.costAmount || 0),
            saleAmount: Number(charge.saleAmount || 0),
            igvRate: charge.section === 'gastos_destino' ? Number(charge.igvRate ?? IGV_RATE) : 0,
            igvAmount: charge.section === 'gastos_destino'
              ? Number((Number(charge.saleAmount || 0) * Number(charge.quantity || 1) * Number(charge.igvRate ?? IGV_RATE)).toFixed(2))
              : 0,
          })),
  })

  const resetForm = () => {
    setForm(buildDefaultForm(master))
    setEditingQuotationId(null)
    setEditingSection('gastos_destino')
    setViewMode('list')
  }

  const startNewQuotation = () => {
    setForm(buildDefaultForm(master))
    setEditingQuotationId(null)
    setEditingSection('gastos_destino')
    setViewMode('form')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmitForm) {
      toast({ title: 'La cotizacion solo puede consultarse', status: 'info' })
      return
    }
    setLoading(true)
    try {
      if (editingQuotationId) {
        await api.put(`/quotations/${editingQuotationId}`, buildPayload())
        toast({ title: isAdvisor ? 'Solicitud actualizada' : 'Cotizacion actualizada', status: 'success' })
      } else {
        await api.post('/quotations', buildPayload())
        toast({ title: isAdvisor ? 'Solicitud enviada a Pricing' : 'Cotizacion creada', status: 'success' })
      }
      resetForm()
      await loadData()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const editQuotation = async (quotation) => {
    try {
      const { data } = await api.get(`/quotations/${quotation.id}`)
      setEditingQuotationId(data.id)
      setEditingSection('gastos_origen')
      setViewMode('form')
      setForm({
        ...emptyForm,
        customerId: data.customerId ? String(data.customerId) : '',
        operationCatalogId: data.operationCatalogId ? String(data.operationCatalogId) : '',
        modalityCatalogId: data.modalityCatalogId ? String(data.modalityCatalogId) : '',
        serviceCatalogId: data.serviceCatalogId ? String(data.serviceCatalogId) : '',
        operationType: data.operationType || 'importacion',
        transportMode: data.transportMode || 'maritima',
        origin: data.origin || '',
        originCountryId: data.originCountryId ? String(data.originCountryId) : '',
        originPortId: data.originPortId ? String(data.originPortId) : '',
        destination: data.destination || '',
        destinationCountryId: data.destinationCountryId ? String(data.destinationCountryId) : '',
        destinationPortId: data.destinationPortId ? String(data.destinationPortId) : '',
        commodityCatalogId: data.commodityCatalogId ? String(data.commodityCatalogId) : '',
        commodity: data.commodityName || data.commodity || '',
        quantity: data.quantity == null ? '' : String(data.quantity),
        quantityUnitId: data.quantityUnitId ? String(data.quantityUnitId) : '',
        grossWeight: data.grossWeight == null ? '' : String(data.grossWeight),
        weightUnitId: data.weightUnitId ? String(data.weightUnitId) : '',
        volume: data.volume == null ? '' : String(data.volume),
        volumeUnitId: data.volumeUnitId ? String(data.volumeUnitId) : '',
        incoterm: data.incoterm || '',
        transitTime: data.transitTime || '',
        frequency: data.frequency || '',
        currency: data.currency || 'USD',
        status: data.status || 'borrador',
        notes: data.notes || '',
        includesText: data.includesText || '',
        excludesText: data.excludesText || '',
        requiredDocumentsText: data.requiredDocumentsText || defaultDocuments.join('\n'),
        charges: (data.charges || []).map((charge) => ({
          id: charge.id,
          section: normalizeChargeSection(charge.section || charge.chargeType),
          chargeType: normalizeChargeSection(charge.chargeType || charge.section),
          description: charge.description || '',
          currency: charge.currency || data.currency || 'USD',
          quantity: Number(charge.quantity || 1),
          saleAmount: Number(charge.saleAmount || 0),
          costAmount: Number(charge.costAmount || 0),
          igvRate: Number(charge.igvRate ?? ((charge.section || charge.chargeType) === 'gastos_destino' ? IGV_RATE : 0)),
          igvAmount: Number(charge.igvAmount || 0),
        })),
      })
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    }
  }

  const approveQuotation = async (quotation) => {
    try {
      await api.patch(`/quotations/${quotation.id}/status`, { status: 'aceptada' })
      toast({ title: 'Cotizacion aprobada', status: 'success' })
      await loadData()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    }
  }

  const completePricing = async (quotation) => {
    try {
      await api.patch(`/quotations/${quotation.id}/status`, { status: 'pricing_completado' })
      toast({ title: 'Pricing completado', status: 'success' })
      await loadData()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    }
  }

  const sendToCustomer = async (quotation) => {
    try {
      await api.patch(`/quotations/${quotation.id}/status`, { status: 'enviada' })
      toast({ title: 'Cotizacion enviada al cliente', status: 'success' })
      await loadData()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    }
  }

  const convertToOperation = async (quotation) => {
    try {
      await api.post(`/quotations/${quotation.id}/convert`, {})
      toast({ title: 'Cotizacion enviada a operatividad', status: 'success' })
      await loadData()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    }
  }

  const openQuotationPdf = async (quotationId = editingQuotationId) => {
    if (!quotationId) return
    try {
      const [{ data }, configRes] = await Promise.all([
        api.get(`/quotations/${quotationId}`),
        api.get('/master-data/company-config').catch(() => ({ data: {} })),
      ])
      const companyConfig = configRes.data || {}
      const charges = data.charges || []
      const lineSaleSubtotal = (charge) => Number(charge.saleAmount || 0) * Number(charge.quantity || 1)
      const lineIgv = (charge) => normalizeChargeSection(charge.section || charge.chargeType) === 'gastos_destino'
        ? lineSaleSubtotal(charge) * Number(charge.igvRate ?? IGV_RATE)
        : 0
      const lineTotal = (charge) => lineSaleSubtotal(charge) + lineIgv(charge)
      const totalSale = charges.reduce((sum, charge) => sum + lineTotal(charge), 0)
      const formatCountryPort = (countryName, portName, fallback) => {
        const country = cleanText(countryName)
        const port = cleanText(portName)
        if (country && port) return `${country} / ${port}`
        if (country) return country
        if (port) return port
        return fallback || '-'
      }
      const originLabel = formatCountryPort(data.originCountryName, data.originPortName, data.origin)
      const destinationLabel = formatCountryPort(data.destinationCountryName, data.destinationPortName, data.destination)
      const companyAddress = [
        companyConfig.address,
        companyConfig.district,
        companyConfig.province,
        companyConfig.department,
      ].filter(Boolean).join(', ')
      const cargoSummary = [
        `Cantidad: ${formatMeasure(data.quantity, data.quantityUnitCode)}`,
        `Peso: ${formatMeasure(data.grossWeight, data.weightUnitCode)}`,
        `Volumen: ${formatMeasure(data.volume, data.volumeUnitCode)}`,
      ].join(' | ')
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 42
      const logo = await loadPdfLogo(companyConfig.logoPath)
      let y = 42

      const checkPage = (needed = 40) => {
        if (y + needed <= pageHeight - margin) return
        doc.addPage()
        y = margin
      }
      const addText = (text, x, options = {}) => {
        const size = options.size || 10
        const width = options.width || pageWidth - margin * 2
        const lineHeight = options.lineHeight || size + 4
        doc.setFont('helvetica', options.bold ? 'bold' : 'normal')
        doc.setFontSize(size)
        doc.setTextColor(...(options.color || [31, 41, 55]))
        const lines = doc.splitTextToSize(cleanText(text) || '-', width)
        checkPage(lines.length * lineHeight)
        doc.text(lines, x, y)
        y += lines.length * lineHeight
      }
      const addSectionTitle = (title) => {
        const topGap = 7
        const bottomGap = title === 'Informacion del cliente y servicio' ? 18 : 10
        checkPage(topGap + bottomGap + 9)
        y += topGap
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(15, 118, 110)
        doc.text(title.toUpperCase(), margin, y)
        y += bottomGap
      }
      const addInlineInfoRow = (items, options = {}) => {
        checkPage(18)
        const gap = 16
        const colW = (pageWidth - margin * 2 - gap * (items.length - 1)) / items.length
        const size = options.size || 8
        let rowHeight = size + 5
        items.forEach(([label, value], index) => {
          const x = margin + (colW + gap) * index
          const labelText = `${label}: `
          doc.setFontSize(size)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(75, 85, 99)
          doc.text(labelText, x, y)
          const labelWidth = doc.getTextWidth(labelText)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(31, 41, 55)
          const lines = doc.splitTextToSize(cleanText(value) || '-', colW - labelWidth)
          doc.text(lines, x + labelWidth, y)
          rowHeight = Math.max(rowHeight, lines.length * (size + 3))
        })
        y += rowHeight + 5
      }
      const addThreeColumnLists = (columns) => {
        checkPage(70)
        if (!columns.length) return
        const gap = 12
        const colW = (pageWidth - margin * 2 - gap * (columns.length - 1)) / columns.length
        const starts = columns.map((_, index) => margin + (colW + gap) * index)
        const titleHeight = 16
        const padding = 1
        const columnLines = columns.map((column) => (
          (column.items.length ? column.items : ['-']).map((item) => doc.splitTextToSize(`- ${cleanText(item) || '-'}`, colW))
        ))
        const columnHeights = columnLines.map((linesGroup) => (
          titleHeight + linesGroup.reduce((sum, lines) => sum + (lines.length * 9) + 4, 0) + 6
        ))
        const boxHeight = Math.max(46, ...columnHeights)
        if (boxHeight > pageHeight - margin * 2) {
          columns.forEach((column) => {
            checkPage(30)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(8)
            doc.setTextColor(15, 118, 110)
            doc.text(column.title, margin, y)
            y += 12
            const items = column.items.length ? column.items : ['-']
            items.forEach((item) => {
              const lines = doc.splitTextToSize(`- ${cleanText(item) || '-'}`, pageWidth - margin * 2)
              checkPage(lines.length * 9 + 4)
              doc.setFont('helvetica', 'normal')
              doc.setFontSize(7)
              doc.setTextColor(31, 41, 55)
              doc.text(lines, margin, y)
              y += lines.length * 9 + 4
            })
            y += 4
          })
          return
        }
        checkPage(boxHeight + 4)
        columns.forEach((column, index) => {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          doc.setTextColor(15, 118, 110)
          doc.text(column.title, starts[index] + padding, y + 14)
        })
        columns.forEach((column, index) => {
          let columnY = y + titleHeight + 10
          columnLines[index].forEach((lines) => {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(31, 41, 55)
            doc.text(lines, starts[index] + padding, columnY)
            columnY += lines.length * 9 + 4
          })
        })
        y += boxHeight + 8
      }
      const addFooterText = (text) => {
        const usableWidth = pageWidth - margin * 2
        const replaceFooterTokens = (value) => {
          const tokens = {
            CIA: companyConfig.companyName || companyConfig.businessName || '',
            NOMBRE_CIA: companyConfig.companyName || companyConfig.businessName || '',
            RAZON_SOCIAL: companyConfig.businessName || companyConfig.companyName || '',
            EMPRESA: data.customerName || '',
            CLIENTE: data.customerName || '',
          }
          return String(value || '').replace(/\[([A-Z_]+)\]/gi, (match, token) => tokens[token.toUpperCase()] || match)
        }
        const drawJustifiedLine = (line, isLastLine) => {
          const words = cleanText(line).split(/\s+/).filter(Boolean)
          if (isLastLine || words.length <= 1) {
            doc.text(words.join(' '), margin, y)
            return
          }
          const wordsWidth = words.reduce((sum, word) => sum + doc.getTextWidth(word), 0)
          const spaceWidth = (usableWidth - wordsWidth) / (words.length - 1)
          if (spaceWidth <= 0 || spaceWidth > 12) {
            doc.text(words.join(' '), margin, y)
            return
          }
          let x = margin
          words.forEach((word, index) => {
            doc.text(word, x, y)
            x += doc.getTextWidth(word) + (index === words.length - 1 ? 0 : spaceWidth)
          })
        }
        const paragraphs = replaceFooterTokens(text)
          .replace(/\r\n/g, '\n')
          .split(/\n\s*\n/)
          .map((paragraph) => cleanText(paragraph.replace(/\n+/g, ' ')))
          .filter(Boolean)
        if (!paragraphs.length) return
        checkPage(32)
        y += 8
        doc.setDrawColor(209, 213, 219)
        doc.line(margin, y, pageWidth - margin, y)
        y += 14
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(31, 41, 55)
        paragraphs.forEach((paragraph) => {
          const wrapped = doc.splitTextToSize(paragraph, usableWidth)
          checkPage(wrapped.length * 10 + 4)
          wrapped.forEach((line, index) => {
            drawJustifiedLine(line, index === wrapped.length - 1)
            y += 10
          })
          y += 4
        })
      }
      const addBankAccounts = (accounts) => {
        const activeAccounts = (accounts || []).filter((account) => account.estado !== false && (account.bankName || account.accountNumber || account.cci))
        if (!activeAccounts.length) return
        addSectionTitle('Cuentas bancarias')
        checkPage(20)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(75, 85, 99)
        doc.setFillColor(243, 244, 246)
        doc.rect(margin, y, pageWidth - margin * 2, 18, 'F')
        doc.text('Banco', margin + 6, y + 12)
        doc.text('Numero cta', margin + 190, y + 12)
        doc.text('CCI', margin + 350, y + 12)
        y += 18
        activeAccounts.forEach((account) => {
          const bankLines = doc.splitTextToSize(cleanText(account.bankName) || '-', 170)
          const accountLines = doc.splitTextToSize(cleanText(account.accountNumber) || '-', 140)
          const cciLines = doc.splitTextToSize(cleanText(account.cci) || '-', pageWidth - margin - (margin + 350) - 6)
          const rowHeight = Math.max(bankLines.length, accountLines.length, cciLines.length) * 9 + 7
          checkPage(rowHeight)
          doc.setDrawColor(229, 231, 235)
          doc.line(margin, y, pageWidth - margin, y)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.setTextColor(31, 41, 55)
          doc.text(bankLines, margin + 6, y + 11)
          doc.text(accountLines, margin + 190, y + 11)
          doc.text(cciLines, margin + 350, y + 11)
          y += rowHeight
        })
      }
      const addAdvisorInfo = () => {
        checkPage(70)
        y += 10
        const gap = 14
        const colW = (pageWidth - margin * 2 - gap * 2) / 3
        const advisorX = margin + (colW + gap) * 2
        let advisorY = y + 18
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(75, 85, 99)
        doc.text('Atentamente,', margin, y)
        const lines = [
          `Asesor: ${data.createdByName || '-'}`,
          `Telefono: ${data.createdByPhone || '-'}`,
          `Correo: ${data.createdByEmail || '-'}`,
          `Direccion: ${companyAddress || '-'}`,
        ]
        const wrappedLines = lines.map((line) => doc.splitTextToSize(line, colW))
        const blockHeight = wrappedLines.reduce((sum, wrapped) => sum + wrapped.length * 10 + 3, 0) - 3
        doc.setDrawColor(15, 118, 110)
        doc.setLineWidth(1.4)
        doc.line(advisorX - 10, advisorY - 8, advisorX - 10, advisorY + blockHeight - 2)
        doc.setDrawColor(153, 246, 228)
        doc.setLineWidth(1.4)
        doc.line(advisorX - 6, advisorY - 8, advisorX - 6, advisorY + blockHeight - 2)
        doc.setLineWidth(0.2)
        doc.setTextColor(75, 85, 99)
        wrappedLines.forEach((wrapped) => {
          doc.text(wrapped, advisorX, advisorY)
          advisorY += wrapped.length * 10 + 3
        })
        y = Math.max(y + 13, advisorY)
      }

      doc.setFillColor(15, 118, 110)
      doc.rect(0, 0, pageWidth, 10, 'F')
      doc.setDrawColor(209, 213, 219)
      if (logo) {
        doc.addImage(logo.dataUrl, logo.format, margin, y - 12, 130, 62, undefined, 'FAST')
      } else {
        doc.roundedRect(margin, y - 12, 130, 62, 4, 4)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(156, 163, 175)
        doc.text('Logo', margin + 65, y + 21, { align: 'center' })
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(31, 41, 55)
      doc.text(data.quotationNumber || '', pageWidth - margin, y, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(107, 114, 128)
      doc.text(`Fecha: ${new Date(data.createdAt || Date.now()).toLocaleDateString()}`, pageWidth - margin, y + 14, { align: 'right' })
      y += 58
      doc.setDrawColor(15, 118, 110)
      doc.line(margin, y, pageWidth - margin, y)
      y += 18

      addSectionTitle('Informacion del cliente y servicio')
      addInlineInfoRow([
        ['Cliente', data.customerName || '-'],
        ['Servicio', data.serviceName || data.transportMode || '-'],
        ['Mercaderia', data.commodity || '-'],
      ])
      addInlineInfoRow([
        ['Origen', originLabel],
        ['Destino', destinationLabel],
      ])
      addInlineInfoRow([
        ['Cantidad', formatMeasure(data.quantity, data.quantityUnitCode)],
        ['Peso', formatMeasure(data.grossWeight, data.weightUnitCode)],
        ['Volumen', formatMeasure(data.volume, data.volumeUnitCode)],
      ])
      addInlineInfoRow([
        ['Incoterm', data.incoterm || '-'],
        ['Tiempo transito', data.transitTime || '-'],
        ['Frecuencia', data.frequency || '-'],
      ])
      y += 4

      addSectionTitle('Detalle cotizado')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(75, 85, 99)
      doc.setFillColor(243, 244, 246)
      doc.rect(margin, y, pageWidth - margin * 2, 18, 'F')
      doc.text('Concepto', margin + 8, y + 12)
      doc.text('Cant.', pageWidth - 220, y + 12, { align: 'right' })
      doc.text('Moneda', pageWidth - 170, y + 12)
      doc.text('Venta', pageWidth - margin - 8, y + 12, { align: 'right' })
      y += 18

      sections.forEach(([section, label]) => {
        const sectionCharges = charges.filter((charge) => normalizeChargeSection(charge.section || charge.chargeType) === section)
        if (!sectionCharges.length) return
        checkPage(20)
        doc.setFillColor(204, 251, 241)
        doc.rect(margin, y, pageWidth - margin * 2, 17, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(15, 118, 110)
        doc.text(label, margin + 8, y + 11)
        y += 17
        sectionCharges.forEach((charge) => {
          const descriptionLines = doc.splitTextToSize(cleanText(charge.description || '-'), pageWidth - 270)
          const rowHeight = Math.max(17, descriptionLines.length * 8 + 7)
          checkPage(rowHeight)
          doc.setDrawColor(229, 231, 235)
          doc.line(margin, y, pageWidth - margin, y)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.setTextColor(31, 41, 55)
          doc.text(descriptionLines, margin + 8, y + 12)
          doc.text(Number(charge.quantity || 1).toFixed(3), pageWidth - 220, y + 12, { align: 'right' })
          doc.text(charge.currency || data.currency || 'USD', pageWidth - 170, y + 12)
          doc.text(lineTotal(charge).toFixed(2), pageWidth - margin - 8, y + 12, { align: 'right' })
          y += rowHeight
        })
        const subtotal = sectionCharges.reduce((sum, charge) => sum + lineTotal(charge), 0)
        checkPage(18)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.text('Subtotal', pageWidth - 180, y + 12)
        doc.text(`${data.currency || 'USD'} ${subtotal.toFixed(2)}`, pageWidth - margin - 8, y + 12, { align: 'right' })
        y += 19
      })

      checkPage(28)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(15, 118, 110)
      doc.text(`Total cotizado: ${data.currency || 'USD'} ${totalSale.toFixed(2)}`, pageWidth - margin, y + 14, { align: 'right' })
      y += 28

      const footerColumns = []
      if (companyConfig.showIncludesInPdf !== false) {
        const items = splitLines(data.includesText)
        footerColumns.push({ title: 'Incluye', items: items.length ? items : ['-'] })
      }
      if (companyConfig.showExcludesInPdf !== false) {
        const items = splitLines(data.excludesText)
        footerColumns.push({ title: 'No incluye', items: items.length ? items : ['-'] })
      }
      if (companyConfig.showDocumentsInPdf !== false) {
        const items = splitLines(data.requiredDocumentsText)
        footerColumns.push({ title: 'Documentos requeridos', items: items.length ? items : ['-'] })
      }
      if (footerColumns.length) {
        addSectionTitle('Condiciones')
        addThreeColumnLists(footerColumns)
      }
      if (companyConfig.showBankAccountsInPdf !== false) {
        addBankAccounts(companyConfig.bankAccounts)
      }
      if (companyConfig.showFooterTextInPdf !== false) {
        addFooterText(companyConfig.footerText)
      }
      addAdvisorInfo()

      doc.save(`${data.quotationNumber || 'cotizacion'}.pdf`)
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    }
  }

  const ActionButton = ({ label, icon, ...props }) => (
    <Tooltip label={label} hasArrow>
      <IconButton aria-label={label} icon={icon} {...props} />
    </Tooltip>
  )

  const selectedTariffType = tariffModal.type
  const selectedTariffs = selectedTariffType ? tariffsBySelection(selectedTariffType) : []
  const selectedTariffTitle = selectedTariffType === 'origen' ? 'Tarifario origen' : 'Tarifario destino'

  return (
    <Stack spacing={6}>
      <PageHeader
        title="Cotizaciones"
        description={viewMode === 'list' ? 'Flujo Comercial > Pricing > Cliente > Operaciones.' : 'Informacion operativa, costos, margen y resumen comercial.'}
      />

      {viewMode === 'form' && (
      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
        <form onSubmit={handleSubmit}>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md">{editingQuotationId ? 'Editar cotizacion' : 'Nueva cotizacion'}</Heading>
            <HStack>
              {editingQuotationId && showPricingDetail && (
                <ActionButton
                  size="sm"
                  variant="outline"
                  colorScheme="teal"
                  label="Generar PDF"
                  icon={<DownloadIcon />}
                  onClick={() => openQuotationPdf(editingQuotationId)}
                />
              )}
              <ActionButton
                size="sm"
                variant="outline"
                label="Volver al listado"
                icon={<ArrowBackIcon />}
                onClick={resetForm}
              />
              {editingQuotationId && (
                <ActionButton
                  size="sm"
                  variant="outline"
                  colorScheme="red"
                  label="Cancelar edicion"
                  icon={<CloseIcon />}
                  onClick={resetForm}
                />
              )}
            </HStack>
          </Flex>
          <Heading size="sm" mb={4}>{isAdvisor ? 'Solicitud de cotizacion' : '1. Informacion de la operacion'}</Heading>
          <Box as="fieldset" disabled={!canEditOperationInfo} border="0" p={0} m={0}>
          <Grid templateColumns={{ base: '1fr', xl: 'repeat(5, 1fr)' }} gap={4}>
            <FormControl isRequired>
              <FormLabel>Cliente</FormLabel>
              <Select name="customerId" value={form.customerId} onChange={handleChange}>
                <option value="">Seleccionar</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Operacion</FormLabel>
              <Select name="operationCatalogId" value={form.operationCatalogId} onChange={handleChange}>
                <option value="">Seleccionar</option>
                {master.operations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Modalidad</FormLabel>
              <Select name="modalityCatalogId" value={form.modalityCatalogId} onChange={handleChange}>
                <option value="">Seleccionar</option>
                {master.modalities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Servicio</FormLabel>
              <Select name="serviceCatalogId" value={form.serviceCatalogId} onChange={handleChange}>
                <option value="">Seleccionar</option>
                {master.services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Moneda base</FormLabel>
              <Select name="currency" value={form.currency} onChange={handleChange}>
                {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <Flex justify="space-between" align="center">
                <FormLabel>Pais origen</FormLabel>
                <ActionButton
                  label="Ver tarifario origen"
                  size="xs"
                  variant="ghost"
                  colorScheme="teal"
                  icon={<ViewIcon />}
                  onClick={() => setTariffModal({ isOpen: true, type: 'origen' })}
                />
              </Flex>
              <Select name="originCountryId" value={form.originCountryId} onChange={handleChange}>
                <option value="">Seleccionar</option>
                {master.countries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Puerto origen</FormLabel>
              <Select name="originPortId" value={form.originPortId} onChange={handleChange}>
                <option value="">Seleccionar</option>
                {portsByCountry(form.originCountryId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <Flex justify="space-between" align="center">
                <FormLabel>Pais destino</FormLabel>
                <ActionButton
                  label="Ver tarifario destino"
                  size="xs"
                  variant="ghost"
                  colorScheme="teal"
                  icon={<ViewIcon />}
                  onClick={() => setTariffModal({ isOpen: true, type: 'destino' })}
                />
              </Flex>
              <Select name="destinationCountryId" value={form.destinationCountryId} onChange={handleChange}>
                <option value="">Seleccionar</option>
                {master.countries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Puerto destino</FormLabel>
              <Select name="destinationPortId" value={form.destinationPortId} onChange={handleChange}>
                <option value="">Seleccionar</option>
                {portsByCountry(form.destinationCountryId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Mercaderia</FormLabel>
              <Select name="commodityCatalogId" value={form.commodityCatalogId} onChange={handleChange}>
                <option value="">Seleccionar</option>
                {master.commodities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </FormControl>
            <Box gridColumn={{ base: 'auto', xl: '1 / -1' }}>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(6, 1fr)' }} gap={4}>
                <FormControl>
                  <FormLabel>Cantidad</FormLabel>
                  <Input type="number" min={0} step="any" inputMode="decimal" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} />
                </FormControl>
                <FormControl>
                  <FormLabel>UM cantidad</FormLabel>
                  <Select name="quantityUnitId" value={form.quantityUnitId} onChange={handleChange}>
                    <option value="">Seleccionar</option>
                    {master.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>)}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Peso bruto</FormLabel>
                  <Input type="number" min={0} step="any" inputMode="decimal" value={form.grossWeight} onChange={(e) => setForm((prev) => ({ ...prev, grossWeight: e.target.value }))} />
                </FormControl>
                <FormControl>
                  <FormLabel>UM peso</FormLabel>
                  <Select name="weightUnitId" value={form.weightUnitId} onChange={handleChange}>
                    <option value="">Seleccionar</option>
                    {master.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>)}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Volumen</FormLabel>
                  <Input type="number" min={0} step="any" inputMode="decimal" value={form.volume} onChange={(e) => setForm((prev) => ({ ...prev, volume: e.target.value }))} />
                </FormControl>
                <FormControl>
                  <FormLabel>UM volumen</FormLabel>
                  <Select name="volumeUnitId" value={form.volumeUnitId} onChange={handleChange}>
                    <option value="">Seleccionar</option>
                    {master.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>)}
                  </Select>
                </FormControl>
              </Grid>
            </Box>
            <FormControl>
              <FormLabel>Incoterm</FormLabel>
              <Input name="incoterm" value={form.incoterm} onChange={handleChange} />
            </FormControl>
            <FormControl>
              <FormLabel>Tiempo transito</FormLabel>
              <Input name="transitTime" value={form.transitTime} onChange={handleChange} />
            </FormControl>
            <FormControl>
              <FormLabel>Frecuencia</FormLabel>
              <Input name="frequency" value={form.frequency} onChange={handleChange} />
            </FormControl>
            <FormControl>
              <FormLabel>Estado</FormLabel>
              <Select name="status" value={form.status} isDisabled>
                {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormControl>
          </Grid>
          </Box>

          {showPricingDetail && (
          <>
          <Heading size="md" mt={6} mb={4}>{isAdvisor && !advisorCanEditRequest ? 'Cotizacion preparada por Pricing' : 'Detalle de la cotizacion'}</Heading>
          <Stack spacing={4}>
            {sections.map(([section, label, masterKey]) => {
              const charges = form.charges.filter((charge) => charge.section === section)
              const sectionSubtotal = charges.reduce((sum, charge) => sum + chargeLineTotal(charge), 0)
              const tariffType = section === 'gastos_origen' ? 'origen' : section === 'gastos_destino' ? 'destino' : null
              return (
                <Box key={section} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
                  <Flex justify="space-between" align="center" mb={3}>
                    <Box>
                      <Heading size="sm">{label}</Heading>
                      <Box mt={2} display="inline-flex" alignItems="center" bg="teal.50" borderWidth="1px" borderColor="teal.200" borderRadius="md" px={3} py={1}>
                        <Text color="teal.700" fontSize="sm" fontWeight="800">
                          Subtotal: {form.currency} {sectionSubtotal.toFixed(2)}
                        </Text>
                      </Box>
                    </Box>
                    <HStack align="center">
                      {canEditCharges && masterKey && (
                        <Select
                          size="sm"
                          w="260px"
                          placeholder="Agregar concepto"
                          onChange={(e) => {
                            const concept = (master[masterKey] || []).find((item) => String(item.id) === e.target.value)
                            addConceptCharge(section, concept)
                            e.target.value = ''
                          }}
                        >
                          {(master[masterKey] || []).map((concept) => (
                            <option key={concept.id} value={concept.id}>
                              {concept.name} - {concept.currency} {Number(concept.amount || 0).toFixed(2)}
                            </option>
                          ))}
                        </Select>
                      )}
                      {canEditCharges && tariffType && (
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="teal"
                          leftIcon={<ViewIcon />}
                          onClick={() => setTariffModal({ isOpen: true, type: tariffType })}
                        >
                          Tarifa
                        </Button>
                      )}
                      {canEditCharges && <ActionButton size="sm" variant="outline" label="Editar seccion" icon={<EditIcon />} onClick={() => setEditingSection(section)} />}
                      {canEditCharges && editingSection === section && (
                        <ActionButton size="sm" colorScheme="green" label="Confirmar cambios" icon={<CheckIcon />} onClick={() => setEditingSection(null)} />
                      )}
                      {canEditCharges && <ActionButton size="sm" colorScheme="teal" label="Agregar item" icon={<AddIcon />} onClick={() => addCharge(section)} />}
                    </HStack>
                  </Flex>
                  {canEditCharges && section === 'gastos_destino' && (
                    <Box mb={3}>
                      <Text fontSize="xs" color="gray.500" fontWeight="700" mb={2}>
                        Agregar rapido
                      </Text>
                      <Flex gap={2} wrap="wrap">
                        {destinationQuickCharges.map((description) => (
                          <Button
                            key={description}
                            size="xs"
                            variant="outline"
                            colorScheme="teal"
                            leftIcon={<AddIcon />}
                            onClick={() => addQuickCharge(section, description)}
                          >
                            {description}
                          </Button>
                        ))}
                      </Flex>
                    </Box>
                  )}
                  <TableContainer overflowX="auto" w="100%" sx={{ WebkitOverflowScrolling: 'touch' }}>
                    <Table size="sm" minW={{ base: '980px', lg: '100%' }}>
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>Concepto</Th>
                          <Th>Moneda</Th>
                          <Th isNumeric>Cantidad</Th>
                          <Th isNumeric>Costo</Th>
                          <Th isNumeric>Costo final</Th>
                          {section === 'gastos_destino' && <Th isNumeric>IGV</Th>}
                          <Th isNumeric>Total</Th>
                          <Th isNumeric>Utilidad</Th>
                          <Th isNumeric>Margen</Th>
                          <Th>Accion</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {charges.map((charge) => {
                          const index = form.charges.indexOf(charge)
                          const editable = canEditCharges && editingSection === section
                          return (
                            <Tr key={`${section}-${index}`}>
                              <Td>
                                {editable ? <Input value={charge.description} onChange={(e) => updateCharge(index, 'description', e.target.value)} /> : charge.description || '-'}
                              </Td>
                              <Td>
                                {editable ? (
                                  <Select value={charge.currency || form.currency} onChange={(e) => updateCharge(index, 'currency', e.target.value)}>
                                    {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                                  </Select>
                                ) : charge.currency}
                              </Td>
                              <Td isNumeric>
                                {editable ? (
                                  <NumberInput value={charge.quantity ?? ''} min={0} step={0.001} onChange={(value) => updateCharge(index, 'quantity', value)}>
                                    <NumberInputField textAlign="right" />
                                  </NumberInput>
                                ) : Number(charge.quantity || 1).toFixed(3)}
                              </Td>
                              <Td isNumeric>
                                {editable ? (
                                  <NumberInput value={charge.costAmount ?? ''} min={0} step={0.01} onChange={(value) => updateCharge(index, 'costAmount', value)}>
                                    <NumberInputField textAlign="right" />
                                  </NumberInput>
                                ) : Number(charge.costAmount || 0).toFixed(2)}
                              </Td>
                              <Td isNumeric>
                                {editable ? (
                                  <NumberInput value={charge.saleAmount ?? ''} min={0} step={0.01} onChange={(value) => updateCharge(index, 'saleAmount', value)}>
                                    <NumberInputField textAlign="right" />
                                  </NumberInput>
                                ) : Number(charge.saleAmount || 0).toFixed(2)}
                              </Td>
                              {section === 'gastos_destino' && (
                                <Td isNumeric>{chargeIgvAmount(charge).toFixed(2)}</Td>
                              )}
                              <Td isNumeric fontWeight="700">
                                {chargeLineTotal(charge).toFixed(2)}
                              </Td>
                              <Td isNumeric color={chargeSaleSubtotal(charge) - chargeCostSubtotal(charge) >= 0 ? 'green.600' : 'red.600'} fontWeight="700">
                                {(chargeSaleSubtotal(charge) - chargeCostSubtotal(charge)).toFixed(2)}
                              </Td>
                              <Td isNumeric>
                                {chargeSaleSubtotal(charge) > 0 ? (((chargeSaleSubtotal(charge) - chargeCostSubtotal(charge)) / chargeSaleSubtotal(charge)) * 100).toFixed(2) : '0.00'}%
                              </Td>
                              <Td>
                                {canEditCharges && <ActionButton size="xs" colorScheme="red" variant="outline" label="Eliminar item" icon={<DeleteIcon />} onClick={() => removeCharge(index)} />}
                              </Td>
                            </Tr>
                          )
                        })}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>
              )
            })}
          </Stack>
          </>
          )}

          {showPricingDetail && (
          <Grid templateColumns={{ base: '1fr', xl: 'repeat(3, 1fr)' }} gap={4} mt={6}>
            <FormControl>
              <FormLabel>Incluye</FormLabel>
              <Textarea minH="140px" name="includesText" value={form.includesText} onChange={handleChange} />
              <HStack mt={2} wrap="wrap">
                <Button size="xs" colorScheme="teal" onClick={() => applyAllConditions('incluye')}>Todos</Button>
                {master.conditions.filter((item) => item.conditionType === 'incluye').map((item) => (
                  <Button key={item.id} size="xs" onClick={() => applyCondition(item)}>{item.description}</Button>
                ))}
              </HStack>
            </FormControl>
            <FormControl>
              <FormLabel>No incluye</FormLabel>
              <Textarea minH="140px" name="excludesText" value={form.excludesText} onChange={handleChange} />
              <HStack mt={2} wrap="wrap">
                <Button size="xs" colorScheme="teal" onClick={() => applyAllConditions('no_incluye')}>Todos</Button>
                {master.conditions.filter((item) => item.conditionType === 'no_incluye').map((item) => (
                  <Button key={item.id} size="xs" onClick={() => applyCondition(item)}>{item.description}</Button>
                ))}
              </HStack>
            </FormControl>
            <FormControl>
              <FormLabel>Documentos requeridos</FormLabel>
              <Textarea minH="140px" name="requiredDocumentsText" value={form.requiredDocumentsText} onChange={handleChange} />
              <HStack mt={2} wrap="wrap">
                {master.documents.map((item) => (
                  <Button key={item.id} size="xs" onClick={() => applyDocument(item)}>{item.name}</Button>
                ))}
              </HStack>
            </FormControl>
          </Grid>
          )}

          <Flex mt={6} justify="space-between" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={4}>
            <Box bg={showPricingDetail ? 'teal.50' : 'orange.50'} borderWidth="1px" borderColor={showPricingDetail ? 'teal.100' : 'orange.100'} borderRadius="md" p={4}>
              <Text color={showPricingDetail ? 'teal.700' : 'orange.700'} fontWeight="700">{showPricingDetail ? 'Total cotizado' : 'Solicitud pendiente de Pricing'}</Text>
              {showPricingDetail ? (
                <>
                  <Heading size="lg">{form.currency} {totalQuoted.toFixed(2)}</Heading>
                  <Text fontSize="sm" color="teal.700">Costo: {form.currency} {totalCost.toFixed(2)} | Utilidad: {form.currency} {estimatedProfit.toFixed(2)} | Margen: {estimatedMargin.toFixed(2)}%</Text>
                </>
              ) : (
                <Text color="orange.700" fontSize="sm">Pricing registrara gastos, venta y margen de esta solicitud.</Text>
              )}
            </Box>
            {canSubmitForm && (
              <ActionButton
                type="submit"
                colorScheme="teal"
                size="lg"
                isLoading={loading}
                label={isAdvisor ? (editingQuotationId ? 'Guardar solicitud' : 'Enviar solicitud') : (editingQuotationId ? 'Guardar cotizacion' : 'Crear cotizacion')}
                icon={<CheckCircleIcon />}
              />
            )}
          </Flex>
        </form>
      </Box>
      )}

      {viewMode === 'list' && (
      <ListCard
        title={isAdvisor ? 'Solicitudes de cotizacion' : 'Listado de cotizaciones'}
        description={isAdvisor ? 'Registra solicitudes y revisa la cotizacion preparada por Pricing.' : 'Gestiona pricing, envio al cliente, aprobaciones y conversion a operacion.'}
        action={(
          <PrimaryActionButton leftIcon={<AddIcon />} onClick={startNewQuotation}>
            {isAdvisor ? 'Nueva solicitud' : 'Agregar cotizacion'}
          </PrimaryActionButton>
        )}
      >
        <DataTable>
          <Thead bg="gray.50">
            <Tr>
              <Th>Numero</Th>
              <Th>Cliente</Th>
              <Th>Operacion</Th>
              <Th>Ruta</Th>
              <Th>Carga</Th>
              <Th>Estado</Th>
              <Th>Pricing</Th>
              <Th isNumeric>Total</Th>
              <Th isNumeric>Utilidad</Th>
              <Th>Acciones</Th>
            </Tr>
          </Thead>
          <Tbody>
            {quotations.map((quotation) => (
              <Tr key={quotation.id}>
                <Td fontWeight="700">{quotation.quotationNumber}</Td>
                <Td>{quotation.customerName}</Td>
                <Td>{quotation.operationName || quotation.operationType} / {quotation.modalityName || quotation.transportMode}</Td>
                <Td>{quotation.originPortName || quotation.origin} - {quotation.destinationPortName || quotation.destination}</Td>
                <Td>
                  <Text fontWeight="600">{quotation.commodity || '-'}</Text>
                  <Text color="gray.500" fontSize="sm">
                    Cant: {formatMeasure(quotation.quantity, quotation.quantityUnitCode)} | Peso: {formatMeasure(quotation.grossWeight, quotation.weightUnitCode)} | Vol: {formatMeasure(quotation.volume, quotation.volumeUnitCode)}
                  </Text>
                </Td>
                <Td><Badge colorScheme={quotation.operationId ? 'blue' : statusColor(quotation.status)}>{quotation.operationId ? 'En espera operativa' : statusLabel(quotation.status)}</Badge></Td>
                <Td>{quotation.pricingUserName || '-'}</Td>
                <Td isNumeric>{quotation.currency} {Number(quotation.totalSale || 0).toFixed(2)}</Td>
                <Td isNumeric color={Number(quotation.estimatedProfit || 0) >= 0 ? 'green.600' : 'red.600'} fontWeight="700">{quotation.currency} {Number(quotation.estimatedProfit || 0).toFixed(2)}</Td>
                <Td>
                  <HStack>
                    <ActionButton size="sm" variant="outline" label={isAdvisor && quotation.status !== 'solicitada_pricing' ? 'Ver cotizacion' : isAdvisor ? 'Editar solicitud' : 'Editar cotizacion'} icon={isAdvisor && quotation.status !== 'solicitada_pricing' ? <ViewIcon /> : <EditIcon />} onClick={() => editQuotation(quotation)} />
                    <ActionButton size="sm" variant="outline" colorScheme="teal" label="Generar PDF" icon={<DownloadIcon />} onClick={() => openQuotationPdf(quotation.id)} />
                    {isPricing && ['solicitada_pricing', 'pricing_completado'].includes(quotation.status) && (
                      <ActionButton size="sm" colorScheme="purple" label="Completar pricing" icon={<CheckIcon />} onClick={() => completePricing(quotation)} />
                    )}
                    {isCommercial && quotation.status === 'pricing_completado' && !quotation.operationId && (
                      <ActionButton size="sm" colorScheme="blue" label="Enviar al cliente" icon={<CheckCircleIcon />} onClick={() => sendToCustomer(quotation)} />
                    )}
                    {isCommercial && quotation.status === 'enviada' && !quotation.operationId && (
                      <ActionButton size="sm" colorScheme="green" label="Registrar aprobacion del cliente" icon={<CheckIcon />} onClick={() => approveQuotation(quotation)} />
                    )}
                    {quotation.operationId && canAccessOperations ? (
                      <ActionButton
                        size="sm"
                        colorScheme="blue"
                        label={`Ir a operatividad ${quotation.operationNumber || ''}`}
                        icon={<ViewIcon />}
                        onClick={() => navigate(`/operations/${quotation.operationId}`)}
                      />
                    ) : !quotation.operationId && quotation.status === 'aceptada' && (
                      <ActionButton size="sm" colorScheme="teal" label="Convertir en operacion" icon={<CheckCircleIcon />} onClick={() => convertToOperation(quotation)} />
                    )}
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      </ListCard>
      )}

      <Modal isOpen={tariffModal.isOpen} onClose={() => setTariffModal({ isOpen: false, type: null })} size="3xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedTariffTitle}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedTariffs.length === 0 ? (
              <Text color="gray.500">
                Selecciona pais y puerto de {selectedTariffType || 'origen/destino'} para ver tarifas aplicables.
              </Text>
            ) : (
              <TableContainer overflowX="auto" w="100%" sx={{ WebkitOverflowScrolling: 'touch' }}>
                <Table size="sm" minW={{ base: '560px', md: '100%' }}>
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Concepto</Th>
                      <Th>Moneda</Th>
                      <Th isNumeric>Monto</Th>
                      <Th>Accion</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {selectedTariffs.map((tariff) => (
                      <Tr key={tariff.id}>
                        <Td fontWeight="600">{tariff.concept}</Td>
                        <Td><Badge>{tariff.currency}</Badge></Td>
                        <Td isNumeric>{Number(tariff.amount || 0).toFixed(2)}</Td>
                        <Td>
                          <ActionButton
                            size="xs"
                            colorScheme="teal"
                            label="Agregar item"
                            icon={<AddIcon />}
                            onClick={() => applyTariff(tariff)}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </ModalBody>
          <ModalFooter gap={2}>
            <ActionButton
              colorScheme="teal"
              label="Agregar todos"
              icon={<AddIcon />}
              isDisabled={!selectedTariffs.length}
              onClick={() => applyAllTariffs(selectedTariffType)}
            />
            <Button variant="ghost" leftIcon={<CloseIcon />} onClick={() => setTariffModal({ isOpen: false, type: null })}>
              Salir
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  )
}


