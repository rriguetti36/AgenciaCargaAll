import React, { useEffect, useMemo, useRef, useState } from 'react'
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
  Tabs,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react'
import { AddIcon, ArrowBackIcon, DeleteIcon, EditIcon, ViewIcon } from '@chakra-ui/icons'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'

const statusOptions = [
  ['CREATED', 'Creada'],
  ['ASSIGNED', 'Asignada'],
  ['BOOKING', 'Booking'],
  ['DOCS_PENDING', 'Docs pendientes'],
  ['DOCS_COMPLETE', 'Docs completos'],
  ['SHIPPED', 'Embarcada'],
  ['IN_TRANSIT', 'En transito'],
  ['ARRIVED', 'Arribada'],
  ['CUSTOMS', 'Aduanas'],
  ['RELEASED', 'Liberada'],
  ['DELIVERY_SCHEDULED', 'Entrega programada'],
  ['DELIVERED', 'Entregada'],
  ['INVOICED', 'Facturada'],
  ['CLOSED', 'Cerrada'],
  ['CANCELLED', 'Cancelada'],
]

const documentTypes = [
  ['commercial_invoice', 'Commercial Invoice'],
  ['packing_list', 'Packing List'],
  ['bl', 'BL'],
  ['awb', 'AWB'],
  ['certificate_origin', 'Certificado de Origen'],
  ['dam', 'DAM'],
  ['delivery_guide', 'Guia de entrega'],
  ['pod', 'POD'],
  ['other', 'Otros'],
]

const formatMeasure = (value, unitCode, decimals = 2) => {
  const number = Number(value || 0)
  if (!number) return '-'
  return `${number.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unitCode || ''}`.trim()
}

function SimpleTotals({ profitability, money }) {
  return (
    <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={3} mt={4}>
      <Box bg="gray.50" p={3} borderRadius="md">
        <Text fontSize="xs" color="gray.500" fontWeight="700">Venta total</Text>
        <Text fontWeight="800">{money(profitability.totalSale)}</Text>
      </Box>
      <Box bg="gray.50" p={3} borderRadius="md">
        <Text fontSize="xs" color="gray.500" fontWeight="700">Costo real</Text>
        <Text fontWeight="800">{money(profitability.totalRealCost)}</Text>
      </Box>
      <Box bg="gray.50" p={3} borderRadius="md">
        <Text fontSize="xs" color="gray.500" fontWeight="700">Utilidad real</Text>
        <Text fontWeight="800" color={Number(profitability.realProfit || 0) >= 0 ? 'green.600' : 'red.600'}>{money(profitability.realProfit)}</Text>
      </Box>
      <Box bg="gray.50" p={3} borderRadius="md">
        <Text fontSize="xs" color="gray.500" fontWeight="700">Margen</Text>
        <Text fontWeight="800">{Number(profitability.marginPercentage || 0).toFixed(2)}%</Text>
      </Box>
    </Grid>
  )
}

const emptyBooking = {
  bookingNumber: '',
  carrier: '',
  bookingDate: '',
  vessel: '',
  voyage: '',
  blNumber: '',
  awbNumber: '',
  mblNumber: '',
  hblNumber: '',
  mblIssueDate: '',
  mblShipper: '',
  mblConsignee: '',
  mblNotifyParty: '',
  containerNumber: '',
  cutOff: '',
  etd: '',
  eta: '',
  observations: '',
}

const emptyHbl = {
  id: null,
  hblNumber: '',
  customerName: '',
  weight: 0,
  volume: 0,
  status: 'PENDING',
  observations: '',
}

const hblStatusOptions = [
  ['PENDING', 'Pendiente'],
  ['ISSUED', 'Emitido'],
  ['RELEASED', 'Liberado'],
  ['CANCELLED', 'Cancelado'],
]

const emptyCustoms = {
  damNumber: '',
  channel: '',
  taxesAmount: 0,
  numberingDate: '',
  releaseDate: '',
  customsStatus: '',
  observations: '',
}

const emptyTransport = {
  carrierName: '',
  plateNumber: '',
  driverName: '',
  driverPhone: '',
  scheduledDate: '',
  deliveryDate: '',
  deliveryPlace: '',
  podFilePath: '',
  observations: '',
}

const emptyBilling = {
  billingStatus: 'PENDIENTE',
  invoiceNumber: '',
  invoiceDate: '',
  invoicedAmount: 0,
  currency: 'USD',
  observations: '',
}

const emptyCostForm = {
  costScope: 'BOOKING',
  bookingId: '',
  concept: '',
  provider: '',
  estimatedCost: 0,
  realCost: 0,
  saleAmount: 0,
  currency: 'USD',
  documentNumber: '',
  observations: '',
  status: 'PENDING',
  costResponsibility: 'COMPANY',
  customerPaymentStatus: 'UNPAID',
}

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '')
const toDateTimeInput = (value) => (value ? String(value).slice(0, 16) : '')

export default function OperationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [operations, setOperations] = useState([])
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assignmentForm, setAssignmentForm] = useState({ operativeUserId: '', observation: '' })
  const [datesForm, setDatesForm] = useState({ etd: '', eta: '', ata: '', estimatedDeliveryDate: '', realDeliveryDate: '' })
  const [selectedBookingId, setSelectedBookingId] = useState(null)
  const [bookingForm, setBookingForm] = useState(emptyBooking)
  const [hblForm, setHblForm] = useState(emptyHbl)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isCostModalOpen, setIsCostModalOpen] = useState(false)
  const [editingCostId, setEditingCostId] = useState(null)
  const [trackingForm, setTrackingForm] = useState({ status: 'IN_TRANSIT', observation: '' })
  const [documentForm, setDocumentForm] = useState({ documentType: 'commercial_invoice', file: null })
  const documentInputRef = useRef(null)
  const [costDrafts, setCostDrafts] = useState({})
  const [costForm, setCostForm] = useState(emptyCostForm)
  const [customsForm, setCustomsForm] = useState(emptyCustoms)
  const [transportForm, setTransportForm] = useState(emptyTransport)
  const [billingForm, setBillingForm] = useState(emptyBilling)
  const [closeObservation, setCloseObservation] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const statusLabel = (status) => statusOptions.find(([value]) => value === status)?.[1] || status

  const financeSummary = useMemo(() => {
    const items = selected?.finance || []
    const income = items.filter((item) => item.itemType === 'ingreso').reduce((sum, item) => sum + Number(item.realAmount || 0), 0)
    const cost = items.filter((item) => item.itemType === 'costo').reduce((sum, item) => sum + Number(item.realAmount || 0), 0)
    return { income, cost, profit: income - cost }
  }, [selected])

  const profitability = selected?.profitability || {}
  const money = (value, currency = 'USD') => `${currency} ${Number(value || 0).toFixed(2)}`
  const percentage = (value) => `${Number(value || 0).toFixed(2)}%`
  const bookings = useMemo(() => selected?.bookings || (selected?.booking ? [selected.booking] : []), [selected])
  const bookingLabel = (booking) => {
    if (!booking) return '-'
    return booking.bookingNumber || booking.blNumber || `Booking ${booking.id}`
  }
  const selectedBooking = useMemo(
    () => bookings.find((booking) => String(booking.id) === String(selectedBookingId)) || null,
    [bookings, selectedBookingId]
  )
  const selectedBookingTracking = useMemo(
    () => (selected?.tracking || []).filter((event) => String(event.bookingId || '') === String(selectedBookingId || '')),
    [selected?.tracking, selectedBookingId]
  )
  const selectedBookingHbls = useMemo(
    () => selectedBooking?.hbls || [],
    [selectedBooking]
  )
  const selectedBookingDocuments = useMemo(
    () => (selected?.documents || []).filter((document) => String(document.bookingId || '') === String(selectedBookingId || '')),
    [selected?.documents, selectedBookingId]
  )
  const selectedBookingCosts = useMemo(
    () => (selected?.costs || []).filter((cost) => cost.costScope === 'BOOKING' && String(cost.bookingId || '') === String(selectedBookingId || '')),
    [selected?.costs, selectedBookingId]
  )
  const operationCosts = useMemo(
    () => (selected?.costs || []).filter((cost) => cost.costScope !== 'BOOKING'),
    [selected?.costs]
  )
  const allCosts = useMemo(
    () => (selected?.costs || []).filter((cost) => cost.status !== 'CANCELLED'),
    [selected?.costs]
  )
  const bookingLiquidationCosts = useMemo(
    () => allCosts.filter((cost) => cost.costScope === 'BOOKING' && cost.costResponsibility !== 'CLIENT'),
    [allCosts]
  )
  const generalLiquidationCosts = useMemo(
    () => allCosts.filter((cost) => cost.costScope !== 'BOOKING' && cost.costResponsibility !== 'CLIENT'),
    [allCosts]
  )
  const otherLiquidationCosts = useMemo(
    () => allCosts.filter((cost) => cost.costResponsibility === 'CLIENT'),
    [allCosts]
  )
  const bookingCostsSubtotal = useMemo(
    () => (selected?.costs || []).filter((cost) => cost.costScope === 'BOOKING' && cost.costResponsibility !== 'CLIENT').reduce((sum, cost) => sum + Number(cost.realCost || 0), 0),
    [selected?.costs]
  )
  const operationCostsSubtotal = useMemo(
    () => operationCosts.filter((cost) => cost.costResponsibility !== 'CLIENT').reduce((sum, cost) => sum + Number(cost.realCost || 0), 0),
    [operationCosts]
  )
  const customerCreditAvailable = useMemo(
    () => Number(profitability.customerAvailableCreditBeforeOperation || 0),
    [profitability.customerAvailableCreditBeforeOperation]
  )
  const customerCreditAfterOperation = Number(profitability.customerAvailableCreditAfterOperation || 0)
  const customerCreditApplied = Number(profitability.customerCreditApplied || 0)
  const customerPendingAfterCredit = Number(profitability.customerPendingAfterCredit || 0)
  const selectedBookingCostSubtotal = useMemo(
    () => selectedBookingCosts.reduce((sum, cost) => sum + Number(cost.realCost || 0), 0),
    [selectedBookingCosts]
  )
  const selectedBookingCustoms = useMemo(
    () => (selected?.customsRecords || []).find((item) => String(item.bookingId || '') === String(selectedBookingId || '')) || null,
    [selected?.customsRecords, selectedBookingId]
  )
  const selectedBookingTransport = useMemo(
    () => (selected?.localTransports || []).find((item) => String(item.bookingId || '') === String(selectedBookingId || '')) || null,
    [selected?.localTransports, selectedBookingId]
  )

  const loadOperations = async () => {
    const params = {}
    if (search.trim()) params.search = search.trim()
    if (statusFilter) params.status = statusFilter
    const { data } = await api.get('/operations', { params })
    setOperations(data)
  }

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/users')
      setUsers(data)
    } catch {
      setUsers([])
    }
  }

  const loadOperation = async (id) => {
    const { data } = await api.get(`/operations/${id}`)
    setSelected(data)
    setAssignmentForm({ operativeUserId: data.operativeUserId ? String(data.operativeUserId) : '', observation: '' })
    setDatesForm({
      etd: toDateInput(data.etd),
      eta: toDateInput(data.eta),
      ata: toDateInput(data.ata),
      estimatedDeliveryDate: toDateInput(data.estimatedDeliveryDate),
      realDeliveryDate: toDateInput(data.realDeliveryDate),
    })
    setCustomsForm({
      ...emptyCustoms,
      ...(data.customs || {}),
      numberingDate: toDateInput(data.customs?.numberingDate),
      releaseDate: toDateInput(data.customs?.releaseDate),
    })
    setTransportForm({
      ...emptyTransport,
      ...(data.localTransport || {}),
      scheduledDate: toDateTimeInput(data.localTransport?.scheduledDate),
      deliveryDate: toDateTimeInput(data.localTransport?.deliveryDate),
    })
    setBillingForm({
      ...emptyBilling,
      ...(data.billing || {}),
      invoiceDate: toDateInput(data.billing?.invoiceDate),
      billingStatus: data.billing?.billingStatus || 'PENDIENTE',
    })
  }

  useEffect(() => {
    if (id) loadOperation(id).catch((err) => toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' }))
    loadUsers()
  }, [id])

  useEffect(() => {
    if (!bookings.length) {
      setSelectedBookingId('')
      return
    }
    if (selectedBookingId === null || (selectedBookingId && !bookings.some((booking) => String(booking.id) === String(selectedBookingId)))) {
      setSelectedBookingId(String(bookings[0].id))
    }
  }, [bookings, selectedBookingId])

  useEffect(() => {
    setCostForm((prev) => {
      if (prev.costScope !== 'BOOKING') return prev
      if (prev.bookingId && bookings.some((booking) => String(booking.id) === String(prev.bookingId))) return prev
      return { ...prev, bookingId: selectedBookingId || (bookings[0]?.id ? String(bookings[0].id) : '') }
    })
  }, [bookings, selectedBookingId])

  useEffect(() => {
    if (!selectedBooking) {
      setBookingForm(emptyBooking)
      return
    }
    setBookingForm({
      ...emptyBooking,
      ...selectedBooking,
      bookingDate: toDateInput(selectedBooking.bookingDate),
      cutOff: toDateTimeInput(selectedBooking.cutOff),
      etd: toDateInput(selectedBooking.etd),
      eta: toDateInput(selectedBooking.eta),
      mblIssueDate: toDateInput(selectedBooking.mblIssueDate),
    })
  }, [selectedBooking])

  useEffect(() => {
    setCustomsForm({
      ...emptyCustoms,
      ...(selectedBookingCustoms || {}),
      numberingDate: toDateInput(selectedBookingCustoms?.numberingDate),
      releaseDate: toDateInput(selectedBookingCustoms?.releaseDate),
    })
  }, [selectedBookingCustoms])

  useEffect(() => {
    setTransportForm({
      ...emptyTransport,
      ...(selectedBookingTransport || {}),
      scheduledDate: toDateTimeInput(selectedBookingTransport?.scheduledDate),
      deliveryDate: toDateTimeInput(selectedBookingTransport?.deliveryDate),
    })
  }, [selectedBookingTransport])

  useEffect(() => {
    const drafts = {}
    for (const cost of selected?.costs || []) {
      drafts[cost.id] = {
        provider: cost.provider || '',
        realCost: Number(cost.realCost || 0),
        saleAmount: Number(cost.saleAmount || 0),
        currency: cost.currency || 'USD',
      documentNumber: cost.documentNumber || '',
      observations: cost.observations || '',
      status: cost.status || 'PENDING',
      costResponsibility: cost.costResponsibility || 'COMPANY',
      customerPaymentStatus: cost.customerPaymentStatus || 'UNPAID',
    }
    }
    setCostDrafts(drafts)
  }, [selected?.id, selected?.costs])

  const refreshSelected = async () => {
    if (selected?.id) await loadOperation(selected.id)
  }

  const submitAction = async (callback, successTitle) => {
    setLoading(true)
    try {
      await callback()
      toast({ title: successTitle, status: 'success' })
      await refreshSelected()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const assignOperation = () => submitAction(
    () => api.patch(`/operations/${selected.id}/assign`, { ...assignmentForm, operativeUserId: Number(assignmentForm.operativeUserId) }),
    'Responsable asignado'
  )

  const saveDates = () => submitAction(
    () => api.patch(`/operations/${selected.id}/dates`, datesForm),
    'Fechas actualizadas'
  )

  const saveBooking = () => submitAction(
    async () => {
      await (selectedBookingId
        ? api.put(`/operations/${selected.id}/bookings/${selectedBookingId}`, bookingForm)
        : api.post(`/operations/${selected.id}/bookings`, bookingForm))
      setIsBookingModalOpen(false)
    },
    'Booking guardado'
  )

  const saveBookingHbl = () => {
    if (!selectedBookingId) {
      toast({ title: 'Selecciona un booking', status: 'warning' })
      return
    }
    return submitAction(
      async () => {
        const payload = {
          ...hblForm,
          weight: Number(hblForm.weight || 0),
          volume: Number(hblForm.volume || 0),
        }
        if (hblForm.id) {
          await api.put(`/operations/${selected.id}/bookings/${selectedBookingId}/hbls/${hblForm.id}`, payload)
        } else {
          await api.post(`/operations/${selected.id}/bookings/${selectedBookingId}/hbls`, payload)
        }
        setHblForm(emptyHbl)
      },
      'HBL guardado'
    )
  }

  const editHbl = (hbl) => setHblForm({
    ...emptyHbl,
    ...hbl,
    weight: Number(hbl.weight || 0),
    volume: Number(hbl.volume || 0),
  })

  const addTracking = () => submitAction(
    () => api.post(`/operations/${selected.id}/tracking`, { ...trackingForm, bookingId: Number(selectedBookingId) }),
    'Tracking registrado'
  )

  const newBooking = () => {
    setSelectedBookingId('')
    setBookingForm(emptyBooking)
    setIsBookingModalOpen(true)
  }

  const openBookingModal = (booking) => {
    setSelectedBookingId(String(booking.id))
    setBookingForm({
      ...emptyBooking,
      ...booking,
      bookingDate: toDateInput(booking.bookingDate),
      cutOff: toDateTimeInput(booking.cutOff),
      etd: toDateInput(booking.etd),
      eta: toDateInput(booking.eta),
      mblIssueDate: toDateInput(booking.mblIssueDate),
    })
    setIsBookingModalOpen(true)
  }

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

  const addDocument = async () => {
    if (!documentForm.file) {
      toast({ title: 'Selecciona un archivo', status: 'warning' })
      return
    }

    const file = documentForm.file
    const contentBase64 = await fileToBase64(file)
    await submitAction(
      () => api.post(`/operations/${selected.id}/documents`, {
        bookingId: selectedBookingId ? Number(selectedBookingId) : null,
        documentType: documentForm.documentType,
        fileName: file.name,
        mimeType: file.type || '',
        contentBase64,
      }),
      'Documento registrado'
    )
    setDocumentForm({ documentType: 'commercial_invoice', file: null })
    if (documentInputRef.current) documentInputRef.current.value = ''
  }

  const saveCustoms = () => submitAction(
    () => api.put(`/operations/${selected.id}/customs`, { ...customsForm, bookingId: Number(selectedBookingId) }),
    'Aduanas guardado'
  )

  const saveTransport = () => submitAction(
    () => api.put(`/operations/${selected.id}/local-transport`, { ...transportForm, bookingId: Number(selectedBookingId) }),
    'Transporte local guardado'
  )

  const saveBilling = () => submitAction(
    () => api.put(`/operations/${selected.id}/billing`, billingForm),
    'Facturacion guardada'
  )

  const updateCostDraft = (costId, patch) => {
    setCostDrafts((prev) => ({ ...prev, [costId]: { ...prev[costId], ...patch } }))
  }

  const openNewCostModal = () => {
    setEditingCostId(null)
    setCostForm({
      ...emptyCostForm,
      bookingId: selectedBookingId || (bookings[0]?.id ? String(bookings[0].id) : ''),
    })
    setIsCostModalOpen(true)
  }

  const openEditCostModal = (cost) => {
    setEditingCostId(cost.id)
    setCostForm({
      costScope: cost.costScope === 'BOOKING' ? 'BOOKING' : 'OPERATION',
      bookingId: cost.bookingId ? String(cost.bookingId) : '',
      concept: cost.concept || '',
      provider: cost.provider || '',
      estimatedCost: Number(cost.estimatedCost || 0),
      realCost: Number(cost.realCost || 0),
      saleAmount: Number(cost.saleAmount || 0),
      currency: cost.currency || 'USD',
      documentNumber: cost.documentNumber || '',
      observations: cost.observations || '',
      status: cost.status || 'PENDING',
      costResponsibility: cost.costResponsibility || 'COMPANY',
      customerPaymentStatus: cost.customerPaymentStatus || 'UNPAID',
    })
    setIsCostModalOpen(true)
  }

  const closeCostModal = () => {
    setIsCostModalOpen(false)
    setEditingCostId(null)
  }

  const createCost = async () => {
    if (!costForm.concept.trim()) {
      toast({ title: 'Ingresa el concepto del costo', status: 'warning' })
      return
    }
    if (costForm.costScope === 'BOOKING' && !costForm.bookingId) {
      toast({ title: 'Selecciona un booking', status: 'warning' })
      return
    }

    await submitAction(
      () => api.post(`/operations/${selected.id}/costs`, {
        ...costForm,
        bookingId: costForm.costScope === 'BOOKING' ? Number(costForm.bookingId) : null,
        estimatedCost: Number(costForm.estimatedCost || 0),
        realCost: Number(costForm.realCost || 0),
        saleAmount: Number(costForm.saleAmount || 0),
        currency: (costForm.currency || 'USD').toUpperCase(),
        costResponsibility: costForm.costResponsibility || 'COMPANY',
        customerPaymentStatus: costForm.costResponsibility === 'CLIENT' ? costForm.customerPaymentStatus : 'UNPAID',
      }),
      'Costo agregado'
    )
    setCostForm({
      ...emptyCostForm,
      bookingId: costForm.costScope === 'BOOKING' ? costForm.bookingId : '',
      costScope: costForm.costScope,
    })
    closeCostModal()
  }

  const updateCost = async () => {
    if (!costForm.concept.trim()) {
      toast({ title: 'Ingresa el concepto del costo', status: 'warning' })
      return
    }
    if (costForm.costScope === 'BOOKING' && !costForm.bookingId) {
      toast({ title: 'Selecciona un booking', status: 'warning' })
      return
    }

    await submitAction(
      () => api.put(`/operations/costs/${editingCostId}`, {
        ...costForm,
        bookingId: costForm.costScope === 'BOOKING' ? Number(costForm.bookingId) : null,
        estimatedCost: Number(costForm.estimatedCost || 0),
        realCost: Number(costForm.realCost || 0),
        saleAmount: Number(costForm.saleAmount || 0),
        currency: (costForm.currency || 'USD').toUpperCase(),
        costResponsibility: costForm.costResponsibility || 'COMPANY',
        customerPaymentStatus: costForm.costResponsibility === 'CLIENT' ? costForm.customerPaymentStatus : 'UNPAID',
      }),
      'Costo actualizado'
    )
    closeCostModal()
  }

  const updateCommissionStatus = (commissionId, status) => submitAction(
    () => api.patch(`/operations/commissions/${commissionId}/status`, { status }),
    'Comision actualizada'
  )

  const closeOperation = () => submitAction(
    () => api.patch(`/operations/${selected.id}/close`, { closeObservation }),
    'Operacion cerrada'
  )

  const deleteCost = (cost) => {
    if (!window.confirm(`Eliminar el costo "${cost.concept}"?`)) return
    submitAction(
      () => api.delete(`/operations/costs/${cost.id}`),
      'Costo eliminado'
    )
  }

  const renderCostTable = (costs, emptyMessage, options = {}) => (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead><Tr><Th>Ambito</Th><Th>Booking</Th><Th>Concepto</Th><Th>Responsable</Th><Th>Pago cliente</Th><Th isNumeric>Real</Th><Th isNumeric>Venta</Th><Th isNumeric>Utilidad real</Th><Th>Estado</Th><Th>Accion</Th></Tr></Thead>
        <Tbody>
          {costs.map((cost) => {
            const realProfit = Number(cost.saleAmount || 0) - Number(cost.realCost || 0)
            const rowBooking = bookings.find((booking) => String(booking.id) === String(cost.bookingId || ''))
            return (
              <Tr key={cost.id}>
                <Td><Badge colorScheme={cost.costScope === 'BOOKING' ? 'blue' : 'purple'}>{cost.costScope === 'BOOKING' ? 'Booking' : 'General'}</Badge></Td>
                <Td minW="140px">{cost.costScope === 'BOOKING' ? bookingLabel(rowBooking) : '-'}</Td>
                <Td minW="180px">{cost.concept}</Td>
                <Td><Badge colorScheme={cost.costResponsibility === 'CLIENT' ? 'cyan' : 'gray'}>{cost.costResponsibility === 'CLIENT' ? 'Cliente' : 'CIA'}</Badge></Td>
                <Td><Badge colorScheme={cost.costResponsibility === 'CLIENT' && cost.customerPaymentStatus === 'UNPAID' ? 'red' : 'green'}>{cost.costResponsibility === 'CLIENT' ? (cost.customerPaymentStatus === 'PAID' ? 'Pago' : 'No pago') : '-'}</Badge></Td>
                <Td isNumeric>{money(cost.realCost, cost.currency)}</Td>
                <Td isNumeric>{money(cost.saleAmount, cost.currency)}</Td>
                <Td isNumeric color={realProfit >= 0 ? 'green.600' : 'red.600'} fontWeight="700">{money(realProfit, cost.currency)}</Td>
                <Td><Badge colorScheme={cost.status === 'PAID' ? 'green' : cost.status === 'CANCELLED' ? 'red' : 'orange'}>{cost.status}</Badge></Td>
                <Td>
                  <HStack spacing={2}>
                    <IconButton
                      aria-label="Editar costo"
                      icon={<EditIcon />}
                      size="sm"
                      variant="outline"
                      onClick={() => openEditCostModal(cost)}
                    />
                    {options.allowDelete && (
                      <IconButton
                        aria-label="Eliminar costo"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        variant="outline"
                        onClick={() => deleteCost(cost)}
                      />
                    )}
                  </HStack>
                </Td>
              </Tr>
            )
          })}
        </Tbody>
      </Table>
      {!costs.length && <Text mt={3} color="gray.500">{emptyMessage}</Text>}
    </Box>
  )

  return (
    <Stack spacing={6}>
      <Flex justify="space-between" align={{ base: 'start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3}>
        <Box>
          <Heading size="lg">Operatividad</Heading>
          <Text color="gray.600" mt={2}>Expediente operativo de la operacion seleccionada.</Text>
        </Box>
        <Button leftIcon={<ArrowBackIcon />} variant="outline" onClick={() => navigate('/operations')}>
          Volver al listado
        </Button>
      </Flex>

      {!selected ? (
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
          <Text color="gray.600">Cargando operacion...</Text>
        </Box>
      ) : (
          <Stack spacing={4}>
            <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
              <Flex justify="space-between" align={{ base: 'start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3}>
                <Box>
                  <Heading size="md">{selected.operationNumber}</Heading>
                  <Text color="gray.600">{selected.customerName} | {selected.origin || '-'} - {selected.destination || '-'}</Text>
                  <Text color="gray.500" fontSize="sm">Cotizacion: {selected.quotationNumber || '-'}</Text>
                </Box>
                <Badge colorScheme="teal" fontSize="sm" px={3} py={1}>{statusLabel(selected.status)}</Badge>
              </Flex>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={3} mt={4}>
                <Box bg="gray.50" p={3} borderRadius="md">
                  <Text fontSize="xs" color="gray.500" fontWeight="700">Comercial</Text>
                  <Text>{selected.commercialName || '-'}</Text>
                </Box>
                <Box bg="gray.50" p={3} borderRadius="md">
                  <Text fontSize="xs" color="gray.500" fontWeight="700">Operativo</Text>
                  <Text>{selected.operativeName || '-'}</Text>
                </Box>
                <Box bg="gray.50" p={3} borderRadius="md">
                  <Text fontSize="xs" color="gray.500" fontWeight="700">Facturacion</Text>
                  <Text>{selected.billing?.billingStatus || 'PENDIENTE'}</Text>
                </Box>
                <Box bg="gray.50" p={3} borderRadius="md">
                  <Text fontSize="xs" color="gray.500" fontWeight="700">Mercaderia</Text>
                  <Text>{selected.commodity || selected.cargoType || '-'}</Text>
                </Box>
                <Box bg="gray.50" p={3} borderRadius="md">
                  <Text fontSize="xs" color="gray.500" fontWeight="700">Cantidad</Text>
                  <Text>{formatMeasure(selected.quantity, selected.quantityUnitCode)}</Text>
                </Box>
                <Box bg="gray.50" p={3} borderRadius="md">
                  <Text fontSize="xs" color="gray.500" fontWeight="700">Peso / Volumen</Text>
                  <Text>{formatMeasure(selected.grossWeight, selected.weightUnitCode)} / {formatMeasure(selected.volume, selected.volumeUnitCode)}</Text>
                </Box>
              </Grid>
            </Box>

            <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md">
              <Tabs colorScheme="teal" isLazy>
                <TabList overflowX="auto">
                  <Tab>Resumen</Tab>
                  <Tab>Bookings</Tab>
                  <Tab>Facturacion</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <Stack spacing={5}>
                      <Box>
                        <Heading size="sm" mb={3}>Asignacion operativa</Heading>
                        <Grid templateColumns={{ base: '1fr', md: '1fr 2fr auto' }} gap={3} alignItems="end">
                          <FormControl>
                            <FormLabel>Responsable operativo</FormLabel>
                            <Select value={assignmentForm.operativeUserId} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, operativeUserId: e.target.value }))}>
                              <option value="">Seleccionar</option>
                              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                            </Select>
                          </FormControl>
                          <FormControl>
                            <FormLabel>Observacion</FormLabel>
                            <Input value={assignmentForm.observation} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, observation: e.target.value }))} />
                          </FormControl>
                          <Button colorScheme="teal" onClick={assignOperation} isLoading={loading}>Asignar</Button>
                        </Grid>
                      </Box>

                      <Box>
                        <Heading size="sm" mb={3}>Fechas clave</Heading>
                        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={3}>
                          <FormControl><FormLabel>ETD</FormLabel><Input type="date" value={datesForm.etd} onChange={(e) => setDatesForm((prev) => ({ ...prev, etd: e.target.value }))} /></FormControl>
                          <FormControl><FormLabel>ETA</FormLabel><Input type="date" value={datesForm.eta} onChange={(e) => setDatesForm((prev) => ({ ...prev, eta: e.target.value }))} /></FormControl>
                          <FormControl><FormLabel>ATA</FormLabel><Input type="date" value={datesForm.ata} onChange={(e) => setDatesForm((prev) => ({ ...prev, ata: e.target.value }))} /></FormControl>
                          <FormControl><FormLabel>Entrega estimada</FormLabel><Input type="date" value={datesForm.estimatedDeliveryDate} onChange={(e) => setDatesForm((prev) => ({ ...prev, estimatedDeliveryDate: e.target.value }))} /></FormControl>
                          <FormControl><FormLabel>Entrega real</FormLabel><Input type="date" value={datesForm.realDeliveryDate} onChange={(e) => setDatesForm((prev) => ({ ...prev, realDeliveryDate: e.target.value }))} /></FormControl>
                        </Grid>
                        <Button mt={3} colorScheme="teal" size="sm" onClick={saveDates} isLoading={loading}>Guardar fechas</Button>
                      </Box>
                    </Stack>
                  </TabPanel>

                  <TabPanel>
                    <Flex justify="flex-end" align="center" mb={4}>
                      <Button leftIcon={<AddIcon />} variant="outline" onClick={newBooking}>Nuevo booking</Button>
                    </Flex>
                    {!!bookings.length && (
                      <Box overflowX="auto" mb={4}>
                        <Table size="sm">
                          <Thead>
                            <Tr>
                              <Th>Booking</Th>
                              <Th>Carrier</Th>
                              <Th>MBL</Th>
                              <Th>HBL</Th>
                              <Th>ETD</Th>
                              <Th>ETA</Th>
                              <Th>Accion</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {bookings.map((booking) => (
                              <Tr
                                key={booking.id}
                                cursor="pointer"
                                bg={String(booking.id) === String(selectedBookingId) ? 'teal.50' : 'transparent'}
                                _hover={{ bg: 'gray.50' }}
                                onClick={() => setSelectedBookingId(String(booking.id))}
                              >
                                <Td fontWeight="700">{booking.bookingNumber || '-'}</Td>
                                <Td>{booking.carrier || '-'}</Td>
                                <Td>{booking.mblNumber || booking.blNumber || '-'}</Td>
                                <Td>{booking.hblNumber || (booking.hbls?.length ? `${booking.hbls.length} HBL` : '-')}</Td>
                                <Td>{toDateInput(booking.etd) || '-'}</Td>
                                <Td>{toDateInput(booking.eta) || '-'}</Td>
                                <Td>
                                  <IconButton
                                    aria-label="Abrir booking"
                                    icon={<ViewIcon />}
                                    size="sm"
                                    variant="outline"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      openBookingModal(booking)
                                    }}
                                  />
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    )}
                    <Tabs colorScheme="teal" variant="enclosed" isLazy>
                      <TabList overflowX="auto">
                        <Tab>Datos Booking</Tab>
                        <Tab>MBL</Tab>
                        <Tab>HBL</Tab>
                        <Tab>Tracking</Tab>
                        <Tab>Documentos</Tab>
                        <Tab>Aduanas</Tab>
                        <Tab>Transporte</Tab>
                      </TabList>
                      <TabPanels>
                                                <TabPanel px={0}>
                          {selectedBooking ? (
                            <Stack spacing={4}>
                              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={3}>
                                <Box bg="gray.50" p={3} borderRadius="md"><Text fontSize="xs" color="gray.500" fontWeight="700">Booking</Text><Text>{selectedBooking.bookingNumber || '-'}</Text></Box>
                                <Box bg="gray.50" p={3} borderRadius="md"><Text fontSize="xs" color="gray.500" fontWeight="700">Carrier</Text><Text>{selectedBooking.carrier || '-'}</Text></Box>
                                <Box bg="gray.50" p={3} borderRadius="md"><Text fontSize="xs" color="gray.500" fontWeight="700">Fechas</Text><Text>ETD {toDateInput(selectedBooking.etd) || '-'} / ETA {toDateInput(selectedBooking.eta) || '-'}</Text></Box>
                                <Box bg="gray.50" p={3} borderRadius="md"><Text fontSize="xs" color="gray.500" fontWeight="700">Vessel / Voyage</Text><Text>{selectedBooking.vessel || '-'} / {selectedBooking.voyage || '-'}</Text></Box>
                                <Box bg="gray.50" p={3} borderRadius="md"><Text fontSize="xs" color="gray.500" fontWeight="700">Contenedor</Text><Text>{selectedBooking.containerNumber || '-'}</Text></Box>
                                <Box bg="gray.50" p={3} borderRadius="md"><Text fontSize="xs" color="gray.500" fontWeight="700">Cut off</Text><Text>{selectedBooking.cutOff ? new Date(selectedBooking.cutOff).toLocaleString() : '-'}</Text></Box>
                              </Grid>
                              <FormControl>
                                <FormLabel>Observaciones</FormLabel>
                                <Textarea value={selectedBooking.observations || ''} isReadOnly />
                              </FormControl>
                              <Button alignSelf="flex-start" leftIcon={<EditIcon />} variant="outline" onClick={() => openBookingModal(selectedBooking)}>Editar datos booking</Button>
                            </Stack>
                          ) : <Text color="gray.500">Selecciona o crea un booking.</Text>}
                        </TabPanel>
                        <TabPanel px={0}>
                          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                            <FormControl><FormLabel>MBL Number</FormLabel><Input value={bookingForm.mblNumber || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, mblNumber: e.target.value }))} isDisabled={!selectedBookingId} /></FormControl>
                            <FormControl><FormLabel>Fecha Emision</FormLabel><Input type="date" value={bookingForm.mblIssueDate || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, mblIssueDate: e.target.value }))} isDisabled={!selectedBookingId} /></FormControl>
                            <FormControl><FormLabel>HBL Number</FormLabel><Input value={bookingForm.hblNumber || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, hblNumber: e.target.value }))} isDisabled={!selectedBookingId} /></FormControl>
                            <FormControl><FormLabel>Shipper</FormLabel><Input value={bookingForm.mblShipper || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, mblShipper: e.target.value }))} isDisabled={!selectedBookingId} /></FormControl>
                            <FormControl><FormLabel>Consignee</FormLabel><Input value={bookingForm.mblConsignee || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, mblConsignee: e.target.value }))} isDisabled={!selectedBookingId} /></FormControl>
                            <FormControl gridColumn={{ base: 'auto', md: '1 / span 2' }}><FormLabel>Notify Party</FormLabel><Input value={bookingForm.mblNotifyParty || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, mblNotifyParty: e.target.value }))} isDisabled={!selectedBookingId} /></FormControl>
                          </Grid>
                          <Button mt={3} colorScheme="teal" onClick={saveBooking} isLoading={loading} isDisabled={!selectedBookingId}>Guardar MBL</Button>
                        </TabPanel>
                        <TabPanel px={0}>
                          <Grid templateColumns={{ base: '1fr', md: '1.2fr 1.5fr repeat(3, 1fr) auto' }} gap={3} alignItems="end">
                            <FormControl><FormLabel>HBL</FormLabel><Input value={hblForm.hblNumber} onChange={(e) => setHblForm((prev) => ({ ...prev, hblNumber: e.target.value }))} isDisabled={!selectedBookingId} /></FormControl>
                            <FormControl><FormLabel>Cliente</FormLabel><Input value={hblForm.customerName} onChange={(e) => setHblForm((prev) => ({ ...prev, customerName: e.target.value }))} isDisabled={!selectedBookingId} /></FormControl>
                            <FormControl><FormLabel>Peso</FormLabel><NumberInput value={hblForm.weight} precision={3} onChange={(value) => setHblForm((prev) => ({ ...prev, weight: value }))} isDisabled={!selectedBookingId}><NumberInputField /></NumberInput></FormControl>
                            <FormControl><FormLabel>Volumen</FormLabel><NumberInput value={hblForm.volume} precision={3} onChange={(value) => setHblForm((prev) => ({ ...prev, volume: value }))} isDisabled={!selectedBookingId}><NumberInputField /></NumberInput></FormControl>
                            <FormControl><FormLabel>Estado</FormLabel><Select value={hblForm.status} onChange={(e) => setHblForm((prev) => ({ ...prev, status: e.target.value }))} isDisabled={!selectedBookingId}>{hblStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></FormControl>
                            <Button colorScheme="teal" onClick={saveBookingHbl} isLoading={loading} isDisabled={!selectedBookingId}>{hblForm.id ? 'Actualizar' : 'Agregar'}</Button>
                          </Grid>
                          {hblForm.id && <Button mt={2} size="sm" variant="ghost" onClick={() => setHblForm(emptyHbl)}>Nuevo HBL</Button>}
                          <Box overflowX="auto" mt={4}>
                            <Table size="sm">
                              <Thead><Tr><Th>HBL</Th><Th>Cliente</Th><Th isNumeric>Peso</Th><Th isNumeric>Volumen</Th><Th>Estado</Th><Th>Accion</Th></Tr></Thead>
                              <Tbody>
                                {selectedBookingHbls.map((hbl) => (
                                  <Tr key={hbl.id}>
                                    <Td fontWeight="700">{hbl.hblNumber}</Td>
                                    <Td>{hbl.customerName || '-'}</Td>
                                    <Td isNumeric>{Number(hbl.weight || 0).toFixed(3)}</Td>
                                    <Td isNumeric>{Number(hbl.volume || 0).toFixed(3)}</Td>
                                    <Td><Badge>{hblStatusOptions.find(([value]) => value === hbl.status)?.[1] || hbl.status}</Badge></Td>
                                    <Td><IconButton aria-label="Editar HBL" icon={<EditIcon />} size="sm" variant="outline" onClick={() => editHbl(hbl)} /></Td>
                                  </Tr>
                                ))}
                              </Tbody>
                            </Table>
                            {!selectedBookingHbls.length && <Text mt={3} color="gray.500">Sin HBL registrados para este booking.</Text>}
                          </Box>
                        </TabPanel>
                        <TabPanel px={0}>
                          <Grid templateColumns={{ base: '1fr', md: '1fr 2fr auto' }} gap={3} alignItems="end">
                            <FormControl>
                              <FormLabel>Estado</FormLabel>
                              <Select value={trackingForm.status} onChange={(e) => setTrackingForm((prev) => ({ ...prev, status: e.target.value }))}>
                                {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </Select>
                            </FormControl>
                            <FormControl><FormLabel>Observacion</FormLabel><Input value={trackingForm.observation} onChange={(e) => setTrackingForm((prev) => ({ ...prev, observation: e.target.value }))} /></FormControl>
                            <Button colorScheme="teal" onClick={addTracking} isLoading={loading} isDisabled={!selectedBookingId}>Registrar</Button>
                          </Grid>
                          <Stack mt={4} spacing={2} maxH="420px" overflowY="auto" pr={2}>
                            {selectedBookingTracking.map((event) => (
                              <Box key={event.id} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
                                <HStack justify="space-between">
                                  <Badge>{statusLabel(event.status)}</Badge>
                                  <Text fontSize="xs" color="gray.500">{new Date(event.eventDate).toLocaleString()}</Text>
                                </HStack>
                                <Text mt={2}>{event.observation || '-'}</Text>
                                <Text fontSize="xs" color="gray.500">{event.userName || 'Sistema'}</Text>
                              </Box>
                            ))}
                            {selectedBookingId && !selectedBookingTracking.length && <Text color="gray.500">Sin tracking registrado para este booking.</Text>}
                          </Stack>
                        </TabPanel>
                        <TabPanel px={0}>
                          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                            <FormControl>
                              <FormLabel>Tipo documento</FormLabel>
                              <Select value={documentForm.documentType} onChange={(e) => setDocumentForm((prev) => ({ ...prev, documentType: e.target.value }))}>
                                {documentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </Select>
                            </FormControl>
                            <FormControl>
                              <FormLabel>Archivo</FormLabel>
                              <Input ref={documentInputRef} type="file" p={1} onChange={(e) => setDocumentForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} />
                            </FormControl>
                          </Grid>
                          {documentForm.file && <Text mt={2} fontSize="sm" color="gray.600">{documentForm.file.name} | {documentForm.file.type || 'tipo automatico al guardar'}</Text>}
                          <Button mt={3} colorScheme="teal" onClick={addDocument} isLoading={loading} isDisabled={!selectedBookingId}>Agregar documento</Button>
                          <Table size="sm" mt={4}>
                            <Thead><Tr><Th>Tipo</Th><Th>Archivo</Th><Th>Usuario</Th><Th>Fecha</Th></Tr></Thead>
                            <Tbody>
                              {selectedBookingDocuments.map((document) => (
                                <Tr key={document.id}>
                                  <Td>{documentTypes.find(([value]) => value === document.documentType)?.[1] || document.documentType}</Td>
                                  <Td>{document.fileName}</Td>
                                  <Td>{document.uploadedByName || '-'}</Td>
                                  <Td>{new Date(document.uploadedAt).toLocaleDateString()}</Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </TabPanel>
                        <TabPanel px={0}>
                          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                            <FormControl><FormLabel>DAM</FormLabel><Input value={customsForm.damNumber || ''} onChange={(e) => setCustomsForm((prev) => ({ ...prev, damNumber: e.target.value }))} /></FormControl>
                            <FormControl><FormLabel>Canal</FormLabel><Select value={customsForm.channel || ''} onChange={(e) => setCustomsForm((prev) => ({ ...prev, channel: e.target.value }))}><option value="">Seleccionar</option><option value="VERDE">VERDE</option><option value="NARANJA">NARANJA</option><option value="ROJO">ROJO</option></Select></FormControl>
                            <FormControl><FormLabel>Tributos</FormLabel><NumberInput value={customsForm.taxesAmount || 0} onChange={(value) => setCustomsForm((prev) => ({ ...prev, taxesAmount: Number(value || 0) }))}><NumberInputField /></NumberInput></FormControl>
                            <FormControl><FormLabel>Fecha numeracion</FormLabel><Input type="date" value={customsForm.numberingDate || ''} onChange={(e) => setCustomsForm((prev) => ({ ...prev, numberingDate: e.target.value }))} /></FormControl>
                            <FormControl><FormLabel>Fecha levante</FormLabel><Input type="date" value={customsForm.releaseDate || ''} onChange={(e) => setCustomsForm((prev) => ({ ...prev, releaseDate: e.target.value }))} /></FormControl>
                            <FormControl><FormLabel>Estado aduanero</FormLabel><Input value={customsForm.customsStatus || ''} onChange={(e) => setCustomsForm((prev) => ({ ...prev, customsStatus: e.target.value }))} /></FormControl>
                          </Grid>
                          <FormControl mt={3}><FormLabel>Observaciones</FormLabel><Textarea value={customsForm.observations || ''} onChange={(e) => setCustomsForm((prev) => ({ ...prev, observations: e.target.value }))} /></FormControl>
                          <Button mt={3} colorScheme="teal" onClick={saveCustoms} isLoading={loading} isDisabled={!selectedBookingId}>Guardar aduanas</Button>
                        </TabPanel>
                        <TabPanel px={0}>
                          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                            <FormControl><FormLabel>Transportista</FormLabel><Input value={transportForm.carrierName || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, carrierName: e.target.value }))} /></FormControl>
                            <FormControl><FormLabel>Placa</FormLabel><Input value={transportForm.plateNumber || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, plateNumber: e.target.value }))} /></FormControl>
                            <FormControl><FormLabel>Chofer</FormLabel><Input value={transportForm.driverName || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, driverName: e.target.value }))} /></FormControl>
                            <FormControl><FormLabel>Telefono chofer</FormLabel><Input value={transportForm.driverPhone || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, driverPhone: e.target.value }))} /></FormControl>
                            <FormControl><FormLabel>Fecha programacion</FormLabel><Input type="datetime-local" value={transportForm.scheduledDate || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, scheduledDate: e.target.value }))} /></FormControl>
                            <FormControl><FormLabel>Fecha entrega</FormLabel><Input type="datetime-local" value={transportForm.deliveryDate || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, deliveryDate: e.target.value }))} /></FormControl>
                            <FormControl><FormLabel>Lugar entrega</FormLabel><Input value={transportForm.deliveryPlace || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, deliveryPlace: e.target.value }))} /></FormControl>
                            <FormControl><FormLabel>POD / cargo entrega</FormLabel><Input value={transportForm.podFilePath || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, podFilePath: e.target.value }))} /></FormControl>
                          </Grid>
                          <FormControl mt={3}><FormLabel>Observaciones</FormLabel><Textarea value={transportForm.observations || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, observations: e.target.value }))} /></FormControl>
                          <Button mt={3} colorScheme="teal" onClick={saveTransport} isLoading={loading} isDisabled={!selectedBookingId}>Guardar transporte</Button>
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                  </TabPanel>

                  {false && (<TabPanel>
                    <Stack spacing={5}>
                      <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={3}>
                        <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Venta total</Text><Text fontWeight="800">{money(profitability.totalSale)}</Text></Box>
                        <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Costo booking subtotal</Text><Text fontWeight="800">{money(bookingCostsSubtotal)}</Text></Box>
                        <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Costos generales</Text><Text fontWeight="800">{money(operationCostsSubtotal)}</Text></Box>
                        <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Costo real total</Text><Text fontWeight="800">{money(profitability.totalRealCost)}</Text></Box>
                        <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Utilidad real</Text><Text fontWeight="800" color={Number(profitability.realProfit || 0) >= 0 ? 'green.600' : 'red.600'}>{money(profitability.realProfit)}</Text></Box>
                        <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Margen</Text><Text fontWeight="800">{percentage(profitability.marginPercentage)}</Text></Box>
                        <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Cliente pagado</Text><Text fontWeight="800">{money(profitability.customerPaidCostTotal)}</Text></Box>
                        <Box bg="gray.50" p={4} borderRadius="md">
                          <Text fontSize="sm" color="gray.500">Cliente no pago</Text>
                          <Text fontWeight="800">{money(profitability.customerUnpaidCostTotal)}</Text>
                          {customerCreditApplied > 0 && <Text fontSize="xs" color="green.600">Credito aplicado: {money(customerCreditApplied, selected.creditCurrency || 'USD')}</Text>}
                        </Box>
                        <Box bg="gray.50" p={4} borderRadius="md">
                          <Text fontSize="sm" color="gray.500">Saldo pendiente cliente</Text>
                          <Text fontWeight="800" color={customerPendingAfterCredit > 0 ? 'red.600' : 'gray.800'}>{money(customerPendingAfterCredit, selected.creditCurrency || 'USD')}</Text>
                        </Box>
                        <Box bg="gray.50" p={4} borderRadius="md">
                          <Text fontSize="sm" color="gray.500">Linea credito</Text>
                          <Text fontWeight="800">{selected.creditEnabled ? `${selected.creditCurrency || 'USD'} ${Number(selected.creditLimit || 0).toFixed(2)}` : 'Sin credito'}</Text>
                          {selected.creditEnabled && <Text fontSize="xs" color="gray.500">Disponible antes de op.: {money(customerCreditAvailable, selected.creditCurrency || 'USD')}</Text>}
                          {selected.creditEnabled && <Text fontSize="xs" color={customerCreditAfterOperation > 0 ? 'gray.500' : 'red.600'}>Disponible despues de op.: {money(customerCreditAfterOperation, selected.creditCurrency || 'USD')}</Text>}
                        </Box>
                      </Grid>

                      <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3}>
                        <Heading size="sm">Costos liquidados</Heading>
                        <Button leftIcon={<AddIcon />} colorScheme="teal" onClick={openNewCostModal}>
                          Agregar costo
                        </Button>
                      </Flex>

                      <Tabs colorScheme="teal" variant="enclosed" isLazy>
                        <TabList overflowX="auto">
                          <Tab>Booking</Tab>
                          <Tab>Generales</Tab>
                          <Tab>Otros costos</Tab>
                        </TabList>
                        <TabPanels>
                          <TabPanel px={0}>{renderCostTable(bookingLiquidationCosts, 'Sin costos de booking registrados.')}</TabPanel>
                          <TabPanel px={0}>{renderCostTable(generalLiquidationCosts, 'Sin costos generales registrados.')}</TabPanel>
                          <TabPanel px={0}>{renderCostTable(otherLiquidationCosts, 'Sin otros costos a cargo del cliente.', { allowDelete: true })}</TabPanel>
                        </TabPanels>
                      </Tabs>
                    </Stack>
                  </TabPanel>)}

                  <TabPanel>
                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                      <FormControl><FormLabel>Estado facturacion</FormLabel><Select value={billingForm.billingStatus || 'PENDIENTE'} onChange={(e) => setBillingForm((prev) => ({ ...prev, billingStatus: e.target.value }))}><option value="PENDIENTE">PENDIENTE</option><option value="PARCIAL">PARCIAL</option><option value="FACTURADO">FACTURADO</option></Select></FormControl>
                      <FormControl><FormLabel>Numero factura</FormLabel><Input value={billingForm.invoiceNumber || ''} onChange={(e) => setBillingForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>Fecha factura</FormLabel><Input type="date" value={billingForm.invoiceDate || ''} onChange={(e) => setBillingForm((prev) => ({ ...prev, invoiceDate: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>Monto facturado</FormLabel><NumberInput value={billingForm.invoicedAmount || 0} onChange={(value) => setBillingForm((prev) => ({ ...prev, invoicedAmount: Number(value || 0) }))}><NumberInputField /></NumberInput></FormControl>
                      <FormControl><FormLabel>Moneda</FormLabel><Input maxLength={3} value={billingForm.currency || 'USD'} onChange={(e) => setBillingForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} /></FormControl>
                    </Grid>
                    <FormControl mt={3}><FormLabel>Observaciones</FormLabel><Textarea value={billingForm.observations || ''} onChange={(e) => setBillingForm((prev) => ({ ...prev, observations: e.target.value }))} /></FormControl>
                    <Button mt={3} colorScheme="teal" onClick={saveBilling} isLoading={loading}>Guardar facturacion</Button>
                    <Text mt={4} color="gray.600">Utilidad real referencial: <strong>{Number(profitability.realProfit || 0).toFixed(2)}</strong></Text>
                  </TabPanel>

                  {false && (<TabPanel>
                    <Table size="sm">
                      <Thead><Tr><Th>Comercial</Th><Th isNumeric>%</Th><Th isNumeric>Utilidad base</Th><Th isNumeric>Comision</Th><Th>Estado</Th><Th></Th></Tr></Thead>
                      <Tbody>
                        {(selected.commissions || []).map((commission) => (
                          <Tr key={commission.id}>
                            <Td>{commission.commercialName || selected.commercialName || '-'}</Td>
                            <Td isNumeric>{percentage(commission.commissionPercentage)}</Td>
                            <Td isNumeric>{money(commission.baseProfit)}</Td>
                            <Td isNumeric fontWeight="800">{money(commission.commissionAmount)}</Td>
                            <Td><Badge colorScheme={commission.status === 'PAID' ? 'green' : 'orange'}>{commission.status}</Badge></Td>
                            <Td>
                              <Select size="sm" value={commission.status} onChange={(e) => updateCommissionStatus(commission.id, e.target.value)} isDisabled={loading}>
                                <option value="PENDING">PENDING</option>
                                <option value="APPROVED">APPROVED</option>
                                <option value="PAID">PAID</option>
                                <option value="CANCELLED">CANCELLED</option>
                              </Select>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                    {!(selected.commissions || []).length && <Text color="gray.500">La comision se genera automaticamente al cerrar la operacion.</Text>}
                  </TabPanel>)}

                  {false && (<TabPanel>
                    <Stack spacing={3}>
                      <Text color="gray.600">Para cerrar, la operacion debe estar entregada y con facturacion en estado FACTURADO.</Text>
                      <FormControl>
                        <FormLabel>Observacion de cierre</FormLabel>
                        <Textarea value={closeObservation} onChange={(e) => setCloseObservation(e.target.value)} />
                      </FormControl>
                      <Button colorScheme="green" onClick={closeOperation} isLoading={loading} isDisabled={selected.status === 'CLOSED'}>
                        Cerrar operacion
                      </Button>
                    </Stack>
                  </TabPanel>)}

                  {false && (<>
                  <TabPanel>
                    <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 2fr auto' }} gap={3} alignItems="end">
                      <FormControl isRequired>
                        <FormLabel>Booking</FormLabel>
                        <Select value={selectedBookingId} onChange={(e) => setSelectedBookingId(e.target.value)}>
                          <option value="">Seleccionar</option>
                          {bookings.map((booking) => (
                            <option key={booking.id} value={booking.id}>{booking.bookingNumber || `Booking ${booking.id}`}</option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Estado</FormLabel>
                        <Select value={trackingForm.status} onChange={(e) => setTrackingForm((prev) => ({ ...prev, status: e.target.value }))}>
                          {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </Select>
                      </FormControl>
                      <FormControl><FormLabel>Observacion</FormLabel><Input value={trackingForm.observation} onChange={(e) => setTrackingForm((prev) => ({ ...prev, observation: e.target.value }))} /></FormControl>
                      <Button colorScheme="teal" onClick={addTracking} isLoading={loading} isDisabled={!selectedBookingId}>Registrar</Button>
                    </Grid>
                    {!bookings.length && (
                      <Text mt={3} color="gray.500">Crea un booking antes de registrar tracking.</Text>
                    )}
                    <Stack mt={4} spacing={2} maxH="420px" overflowY="auto" pr={2}>
                      {selectedBookingTracking.map((event) => (
                        <Box key={event.id} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
                          <HStack justify="space-between">
                            <Badge>{statusLabel(event.status)}</Badge>
                            <Text fontSize="xs" color="gray.500">{new Date(event.eventDate).toLocaleString()}</Text>
                          </HStack>
                          <Text mt={2}>{event.observation || '-'}</Text>
                          <Text fontSize="xs" color="gray.500">{event.userName || 'Sistema'}</Text>
                        </Box>
                      ))}
                      {selectedBookingId && !selectedBookingTracking.length && (
                        <Text color="gray.500">Sin tracking registrado para este booking.</Text>
                      )}
                    </Stack>
                  </TabPanel>

                  <TabPanel>
                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                      <FormControl>
                        <FormLabel>Tipo documento</FormLabel>
                        <Select value={documentForm.documentType} onChange={(e) => setDocumentForm((prev) => ({ ...prev, documentType: e.target.value }))}>
                          {documentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Archivo</FormLabel>
                        <Input
                          ref={documentInputRef}
                          type="file"
                          p={1}
                          onChange={(e) => setDocumentForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                        />
                      </FormControl>
                    </Grid>
                    {documentForm.file && (
                      <Text mt={2} fontSize="sm" color="gray.600">
                        {documentForm.file.name} | {documentForm.file.type || 'tipo automatico al guardar'}
                      </Text>
                    )}
                    <Button mt={3} colorScheme="teal" onClick={addDocument} isLoading={loading}>Agregar documento</Button>
                    <Table size="sm" mt={4}>
                      <Thead><Tr><Th>Tipo</Th><Th>Archivo</Th><Th>Usuario</Th><Th>Fecha</Th></Tr></Thead>
                      <Tbody>
                        {(selected.documents || []).map((document) => (
                          <Tr key={document.id}>
                            <Td>{documentTypes.find(([value]) => value === document.documentType)?.[1] || document.documentType}</Td>
                            <Td>{document.fileName}</Td>
                            <Td>{document.uploadedByName || '-'}</Td>
                            <Td>{new Date(document.uploadedAt).toLocaleDateString()}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TabPanel>

                  <TabPanel>
                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                      <FormControl><FormLabel>DAM</FormLabel><Input value={customsForm.damNumber || ''} onChange={(e) => setCustomsForm((prev) => ({ ...prev, damNumber: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>Canal</FormLabel><Select value={customsForm.channel || ''} onChange={(e) => setCustomsForm((prev) => ({ ...prev, channel: e.target.value }))}><option value="">Seleccionar</option><option value="VERDE">VERDE</option><option value="NARANJA">NARANJA</option><option value="ROJO">ROJO</option></Select></FormControl>
                      <FormControl><FormLabel>Tributos</FormLabel><NumberInput value={customsForm.taxesAmount || 0} onChange={(value) => setCustomsForm((prev) => ({ ...prev, taxesAmount: Number(value || 0) }))}><NumberInputField /></NumberInput></FormControl>
                      <FormControl><FormLabel>Fecha numeracion</FormLabel><Input type="date" value={customsForm.numberingDate || ''} onChange={(e) => setCustomsForm((prev) => ({ ...prev, numberingDate: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>Fecha levante</FormLabel><Input type="date" value={customsForm.releaseDate || ''} onChange={(e) => setCustomsForm((prev) => ({ ...prev, releaseDate: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>Estado aduanero</FormLabel><Input value={customsForm.customsStatus || ''} onChange={(e) => setCustomsForm((prev) => ({ ...prev, customsStatus: e.target.value }))} /></FormControl>
                    </Grid>
                    <FormControl mt={3}><FormLabel>Observaciones</FormLabel><Textarea value={customsForm.observations || ''} onChange={(e) => setCustomsForm((prev) => ({ ...prev, observations: e.target.value }))} /></FormControl>
                    <Button mt={3} colorScheme="teal" onClick={saveCustoms} isLoading={loading}>Guardar aduanas</Button>
                  </TabPanel>

                  <TabPanel>
                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                      <FormControl><FormLabel>Transportista</FormLabel><Input value={transportForm.carrierName || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, carrierName: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>Placa</FormLabel><Input value={transportForm.plateNumber || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, plateNumber: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>Chofer</FormLabel><Input value={transportForm.driverName || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, driverName: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>Telefono chofer</FormLabel><Input value={transportForm.driverPhone || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, driverPhone: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>Fecha programacion</FormLabel><Input type="datetime-local" value={transportForm.scheduledDate || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, scheduledDate: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>Fecha entrega</FormLabel><Input type="datetime-local" value={transportForm.deliveryDate || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, deliveryDate: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>Lugar entrega</FormLabel><Input value={transportForm.deliveryPlace || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, deliveryPlace: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>POD / cargo entrega</FormLabel><Input value={transportForm.podFilePath || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, podFilePath: e.target.value }))} /></FormControl>
                    </Grid>
                    <FormControl mt={3}><FormLabel>Observaciones</FormLabel><Textarea value={transportForm.observations || ''} onChange={(e) => setTransportForm((prev) => ({ ...prev, observations: e.target.value }))} /></FormControl>
                    <Button mt={3} colorScheme="teal" onClick={saveTransport} isLoading={loading}>Guardar transporte</Button>
                  </TabPanel>

                  <TabPanel>
                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                      <FormControl><FormLabel>Estado facturacion</FormLabel><Select value={billingForm.billingStatus || 'PENDIENTE'} onChange={(e) => setBillingForm((prev) => ({ ...prev, billingStatus: e.target.value }))}><option value="PENDIENTE">PENDIENTE</option><option value="PARCIAL">PARCIAL</option><option value="FACTURADO">FACTURADO</option></Select></FormControl>
                      <FormControl><FormLabel>Numero factura</FormLabel><Input value={billingForm.invoiceNumber || ''} onChange={(e) => setBillingForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>Fecha factura</FormLabel><Input type="date" value={billingForm.invoiceDate || ''} onChange={(e) => setBillingForm((prev) => ({ ...prev, invoiceDate: e.target.value }))} /></FormControl>
                      <FormControl><FormLabel>Monto facturado</FormLabel><NumberInput value={billingForm.invoicedAmount || 0} onChange={(value) => setBillingForm((prev) => ({ ...prev, invoicedAmount: Number(value || 0) }))}><NumberInputField /></NumberInput></FormControl>
                      <FormControl><FormLabel>Moneda</FormLabel><Input maxLength={3} value={billingForm.currency || 'USD'} onChange={(e) => setBillingForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} /></FormControl>
                    </Grid>
                    <FormControl mt={3}><FormLabel>Observaciones</FormLabel><Textarea value={billingForm.observations || ''} onChange={(e) => setBillingForm((prev) => ({ ...prev, observations: e.target.value }))} /></FormControl>
                    <Button mt={3} colorScheme="teal" onClick={saveBilling} isLoading={loading}>Guardar facturacion</Button>
                    <Text mt={4} color="gray.600">Utilidad real referencial: <strong>{financeSummary.profit.toFixed(2)}</strong></Text>
                  </TabPanel>

                  <TabPanel>
                    <Stack spacing={3}>
                      <Text color="gray.600">Para cerrar, la operacion debe estar entregada y con facturacion en estado FACTURADO.</Text>
                      <FormControl>
                        <FormLabel>Observacion de cierre</FormLabel>
                        <Textarea value={closeObservation} onChange={(e) => setCloseObservation(e.target.value)} />
                      </FormControl>
                      <Button colorScheme="green" onClick={closeOperation} isLoading={loading} isDisabled={selected.status === 'CLOSED'}>
                        Cerrar operacion
                      </Button>
                    </Stack>
                  </TabPanel>

                  <TabPanel>
                    <Box overflowX="auto">
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Concepto</Th>
                            <Th>Proveedor</Th>
                            <Th isNumeric>Estimado</Th>
                            <Th isNumeric>Real</Th>
                            <Th isNumeric>Venta</Th>
                            <Th isNumeric>Utilidad real</Th>
                            <Th>Moneda</Th>
                            <Th>Documento</Th>
                            <Th>Estado</Th>
                            <Th></Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {(selected.costs || []).map((cost) => {
                            const draft = costDrafts[cost.id] || {}
                            const realProfit = Number(draft.saleAmount || 0) - Number(draft.realCost || 0)
                            return (
                              <Tr key={cost.id}>
                                <Td minW="180px">{cost.concept}</Td>
                                <Td minW="170px"><Input size="sm" value={draft.provider || ''} onChange={(e) => updateCostDraft(cost.id, { provider: e.target.value })} /></Td>
                                <Td isNumeric>{money(cost.estimatedCost, cost.currency)}</Td>
                                <Td minW="120px"><Input size="sm" type="number" value={draft.realCost ?? 0} onChange={(e) => updateCostDraft(cost.id, { realCost: Number(e.target.value || 0) })} /></Td>
                                <Td minW="120px"><Input size="sm" type="number" value={draft.saleAmount ?? 0} onChange={(e) => updateCostDraft(cost.id, { saleAmount: Number(e.target.value || 0) })} /></Td>
                                <Td isNumeric color={realProfit >= 0 ? 'green.600' : 'red.600'} fontWeight="700">{money(realProfit, draft.currency)}</Td>
                                <Td minW="90px"><Input size="sm" maxLength={3} value={draft.currency || 'USD'} onChange={(e) => updateCostDraft(cost.id, { currency: e.target.value.toUpperCase() })} /></Td>
                                <Td minW="140px"><Input size="sm" value={draft.documentNumber || ''} onChange={(e) => updateCostDraft(cost.id, { documentNumber: e.target.value })} /></Td>
                                <Td minW="130px">
                                  <Select size="sm" value={draft.status || 'PENDING'} onChange={(e) => updateCostDraft(cost.id, { status: e.target.value })}>
                                    <option value="PENDING">PENDING</option>
                                    <option value="APPROVED">APPROVED</option>
                                    <option value="PAID">PAID</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                  </Select>
                                </Td>
                                <Td><Button size="sm" colorScheme="teal" onClick={() => saveCost(cost.id)} isLoading={loading}>Guardar</Button></Td>
                              </Tr>
                            )
                          })}
                        </Tbody>
                      </Table>
                    </Box>
                    <SimpleTotals profitability={profitability} money={money} />
                  </TabPanel>

                  <TabPanel>
                    <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={3}>
                      <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Venta total</Text><Text fontWeight="800">{money(profitability.totalSale)}</Text></Box>
                      <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Costo estimado</Text><Text fontWeight="800">{money(profitability.totalEstimatedCost)}</Text></Box>
                      <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Costo real</Text><Text fontWeight="800">{money(profitability.totalRealCost)}</Text></Box>
                      <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Utilidad estimada</Text><Text fontWeight="800">{money(profitability.estimatedProfit)}</Text></Box>
                      <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Utilidad real</Text><Text fontWeight="800" color={Number(profitability.realProfit || 0) >= 0 ? 'green.600' : 'red.600'}>{money(profitability.realProfit)}</Text></Box>
                      <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Margen</Text><Text fontWeight="800">{percentage(profitability.marginPercentage)}</Text></Box>
                    </Grid>
                  </TabPanel>

                  <TabPanel>
                    <Table size="sm">
                      <Thead><Tr><Th>Comercial</Th><Th isNumeric>%</Th><Th isNumeric>Utilidad base</Th><Th isNumeric>Comision</Th><Th>Estado</Th><Th></Th></Tr></Thead>
                      <Tbody>
                        {(selected.commissions || []).map((commission) => (
                          <Tr key={commission.id}>
                            <Td>{commission.commercialName || selected.commercialName || '-'}</Td>
                            <Td isNumeric>{percentage(commission.commissionPercentage)}</Td>
                            <Td isNumeric>{money(commission.baseProfit)}</Td>
                            <Td isNumeric fontWeight="800">{money(commission.commissionAmount)}</Td>
                            <Td><Badge colorScheme={commission.status === 'PAID' ? 'green' : 'orange'}>{commission.status}</Badge></Td>
                            <Td>
                              <Select size="sm" value={commission.status} onChange={(e) => updateCommissionStatus(commission.id, e.target.value)} isDisabled={loading}>
                                <option value="PENDING">PENDING</option>
                                <option value="APPROVED">APPROVED</option>
                                <option value="PAID">PAID</option>
                                <option value="CANCELLED">CANCELLED</option>
                              </Select>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                    {!(selected.commissions || []).length && (
                      <Text color="gray.500">La comision se genera automaticamente al cerrar la operacion.</Text>
                    )}
                  </TabPanel>
                  </>)}
                </TabPanels>
              </Tabs>
            </Box>
          </Stack>
        )}
      <Modal isOpen={isCostModalOpen} onClose={closeCostModal} size="5xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingCostId ? 'Editar costo' : 'Agregar costo'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={3}>
              <FormControl>
                <FormLabel>Ambito</FormLabel>
                <Select
                  value={costForm.costScope}
                  onChange={(e) => setCostForm((prev) => ({ ...prev, costScope: e.target.value, bookingId: e.target.value === 'BOOKING' ? (prev.bookingId || selectedBookingId || '') : '' }))}
                >
                  <option value="BOOKING">Booking</option>
                  <option value="OPERATION">General operacion</option>
                </Select>
              </FormControl>
              <FormControl isDisabled={costForm.costScope !== 'BOOKING'} isRequired={costForm.costScope === 'BOOKING'}>
                <FormLabel>Booking</FormLabel>
                <Select value={costForm.bookingId} onChange={(e) => setCostForm((prev) => ({ ...prev, bookingId: e.target.value }))}>
                  <option value="">Seleccionar</option>
                  {bookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>{bookingLabel(booking)}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Concepto</FormLabel>
                <Input value={costForm.concept} onChange={(e) => setCostForm((prev) => ({ ...prev, concept: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel>Proveedor</FormLabel>
                <Input value={costForm.provider} onChange={(e) => setCostForm((prev) => ({ ...prev, provider: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel>Costo estimado</FormLabel>
                <NumberInput value={costForm.estimatedCost} onChange={(value) => setCostForm((prev) => ({ ...prev, estimatedCost: Number(value || 0) }))}><NumberInputField /></NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Costo real</FormLabel>
                <NumberInput value={costForm.realCost} onChange={(value) => setCostForm((prev) => ({ ...prev, realCost: Number(value || 0) }))}><NumberInputField /></NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Venta</FormLabel>
                <NumberInput value={costForm.saleAmount} onChange={(value) => setCostForm((prev) => ({ ...prev, saleAmount: Number(value || 0) }))}><NumberInputField /></NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Moneda</FormLabel>
                <Input maxLength={3} value={costForm.currency} onChange={(e) => setCostForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} />
              </FormControl>
              <FormControl>
                <FormLabel>Documento</FormLabel>
                <Input value={costForm.documentNumber} onChange={(e) => setCostForm((prev) => ({ ...prev, documentNumber: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel>Estado</FormLabel>
                <Select value={costForm.status} onChange={(e) => setCostForm((prev) => ({ ...prev, status: e.target.value }))}>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="PAID">PAID</option>
                  <option value="CANCELLED">CANCELLED</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Responsable del costo</FormLabel>
                <Select
                  value={costForm.costResponsibility}
                  onChange={(e) => setCostForm((prev) => ({ ...prev, costResponsibility: e.target.value, customerPaymentStatus: e.target.value === 'CLIENT' ? prev.customerPaymentStatus : 'UNPAID' }))}
                >
                  <option value="COMPANY">CIA</option>
                  <option value="CLIENT">Cliente</option>
                </Select>
              </FormControl>
              <FormControl isDisabled={costForm.costResponsibility !== 'CLIENT'}>
                <FormLabel>Pago cliente</FormLabel>
                <Select value={costForm.customerPaymentStatus} onChange={(e) => setCostForm((prev) => ({ ...prev, customerPaymentStatus: e.target.value }))}>
                  <option value="UNPAID">No pago</option>
                  <option value="PAID">Pago</option>
                </Select>
              </FormControl>
              <FormControl gridColumn={{ base: 'auto', md: 'span 2' }}>
                <FormLabel>Observaciones</FormLabel>
                <Input value={costForm.observations} onChange={(e) => setCostForm((prev) => ({ ...prev, observations: e.target.value }))} />
              </FormControl>
            </Grid>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={closeCostModal}>Cancelar</Button>
            <Button colorScheme="teal" onClick={editingCostId ? updateCost : createCost} isLoading={loading}>
              {editingCostId ? 'Actualizar costo' : 'Guardar costo'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedBookingId ? 'Datos del booking' : 'Nuevo booking'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
              <FormControl><FormLabel>Booking number</FormLabel><Input value={bookingForm.bookingNumber || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, bookingNumber: e.target.value }))} /></FormControl>
              <FormControl><FormLabel>Carrier / naviera / aerolinea</FormLabel><Input value={bookingForm.carrier || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, carrier: e.target.value }))} /></FormControl>
              <FormControl><FormLabel>Fecha booking</FormLabel><Input type="date" value={bookingForm.bookingDate || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, bookingDate: e.target.value }))} /></FormControl>
              <FormControl><FormLabel>Vessel</FormLabel><Input value={bookingForm.vessel || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, vessel: e.target.value }))} /></FormControl>
              <FormControl><FormLabel>Voyage</FormLabel><Input value={bookingForm.voyage || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, voyage: e.target.value }))} /></FormControl>
              <FormControl><FormLabel>BL number</FormLabel><Input value={bookingForm.blNumber || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, blNumber: e.target.value }))} /></FormControl>
              <FormControl><FormLabel>AWB number</FormLabel><Input value={bookingForm.awbNumber || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, awbNumber: e.target.value }))} /></FormControl>
              <FormControl><FormLabel>Container number</FormLabel><Input value={bookingForm.containerNumber || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, containerNumber: e.target.value }))} /></FormControl>
              <FormControl><FormLabel>Cut off</FormLabel><Input type="datetime-local" value={bookingForm.cutOff || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, cutOff: e.target.value }))} /></FormControl>
              <FormControl><FormLabel>ETD</FormLabel><Input type="date" value={bookingForm.etd || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, etd: e.target.value }))} /></FormControl>
              <FormControl><FormLabel>ETA</FormLabel><Input type="date" value={bookingForm.eta || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, eta: e.target.value }))} /></FormControl>
            </Grid>
            <FormControl mt={3}><FormLabel>Observaciones</FormLabel><Textarea value={bookingForm.observations || ''} onChange={(e) => setBookingForm((prev) => ({ ...prev, observations: e.target.value }))} /></FormControl>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={() => setIsBookingModalOpen(false)}>Cancelar</Button>
            <Button colorScheme="teal" onClick={saveBooking} isLoading={loading}>{selectedBookingId ? 'Actualizar booking' : 'Crear booking'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  )
}





