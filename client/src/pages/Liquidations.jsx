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
import { AddIcon, DeleteIcon, EditIcon, ViewIcon } from '@chakra-ui/icons'
import api from '../services/api'
import { DataTable, ListCard, ListToolbar, PageHeader, PrimaryActionButton } from '../components/ListPage'

const emptyCost = {
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

export default function Liquidations() {
  const [operations, setOperations] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [isCostModalOpen, setIsCostModalOpen] = useState(false)
  const [editingCostId, setEditingCostId] = useState(null)
  const [costForm, setCostForm] = useState(emptyCost)
  const [closeObservation, setCloseObservation] = useState('')
  const toast = useToast()

  const money = (value, currency = 'USD') => `${currency} ${Number(value || 0).toFixed(2)}`
  const percentage = (value) => `${Number(value || 0).toFixed(2)}%`
  const profitability = selected?.profitability || {}
  const bookings = selected?.bookings || []
  const activeCosts = useMemo(() => (selected?.costs || []).filter((cost) => cost.status !== 'CANCELLED'), [selected?.costs])
  const bookingCosts = useMemo(() => activeCosts.filter((cost) => cost.costScope === 'BOOKING' && cost.costResponsibility !== 'CLIENT'), [activeCosts])
  const generalCosts = useMemo(() => activeCosts.filter((cost) => cost.costScope !== 'BOOKING' && cost.costResponsibility !== 'CLIENT'), [activeCosts])
  const otherCosts = useMemo(() => activeCosts.filter((cost) => cost.costResponsibility === 'CLIENT'), [activeCosts])

  const loadOperations = async () => {
    const params = {}
    if (search.trim()) params.search = search.trim()
    const { data } = await api.get('/operations', { params })
    setOperations(data)
  }

  const loadOperation = async (operationId) => {
    const { data } = await api.get(`/operations/${operationId}`)
    setSelected(data)
  }

  useEffect(() => {
    loadOperations().catch((err) => toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' }))
  }, [])

  const submitAction = async (callback, successTitle) => {
    setLoading(true)
    try {
      await callback()
      toast({ title: successTitle, status: 'success' })
      if (selected?.id) await loadOperation(selected.id)
      await loadOperations()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const bookingLabel = (booking) => booking?.bookingNumber || booking?.blNumber || `Booking ${booking?.id}`

  const openNewCostModal = () => {
    setEditingCostId(null)
    setCostForm({ ...emptyCost, bookingId: bookings[0]?.id ? String(bookings[0].id) : '' })
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

  const saveCost = async () => {
    if (!costForm.concept.trim()) {
      toast({ title: 'Ingresa el concepto del costo', status: 'warning' })
      return
    }
    if (costForm.costScope === 'BOOKING' && !costForm.bookingId) {
      toast({ title: 'Selecciona un booking', status: 'warning' })
      return
    }
    const payload = {
      ...costForm,
      bookingId: costForm.costScope === 'BOOKING' ? Number(costForm.bookingId) : null,
      estimatedCost: Number(costForm.estimatedCost || 0),
      realCost: Number(costForm.realCost || 0),
      saleAmount: Number(costForm.saleAmount || 0),
      currency: (costForm.currency || 'USD').toUpperCase(),
      customerPaymentStatus: costForm.costResponsibility === 'CLIENT' ? costForm.customerPaymentStatus : 'UNPAID',
    }
    await submitAction(
      () => editingCostId ? api.put(`/operations/costs/${editingCostId}`, payload) : api.post(`/operations/${selected.id}/costs`, payload),
      editingCostId ? 'Costo actualizado' : 'Costo agregado'
    )
    closeCostModal()
  }

  const deleteCost = (cost) => {
    if (!window.confirm(`Eliminar el costo "${cost.concept}"?`)) return
    submitAction(() => api.delete(`/operations/costs/${cost.id}`), 'Costo eliminado')
  }

  const updateCommissionStatus = (commissionId, status) => submitAction(
    () => api.patch(`/operations/commissions/${commissionId}/status`, { status }),
    'Comision actualizada'
  )

  const closeOperation = () => submitAction(
    () => api.patch(`/operations/${selected.id}/close`, { closeObservation }),
    'Operacion cerrada'
  )

  const renderCostTable = (costs, emptyMessage, allowDelete = false) => (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead>
          <Tr><Th>Ambito</Th><Th>Booking</Th><Th>Concepto</Th><Th>Responsable</Th><Th>Pago cliente</Th><Th isNumeric>Real</Th><Th isNumeric>Venta</Th><Th isNumeric>Utilidad</Th><Th>Estado</Th><Th>Accion</Th></Tr>
        </Thead>
        <Tbody>
          {costs.map((cost) => {
            const realProfit = Number(cost.saleAmount || 0) - Number(cost.realCost || 0)
            const rowBooking = bookings.find((booking) => String(booking.id) === String(cost.bookingId || ''))
            return (
              <Tr key={cost.id}>
                <Td><Badge colorScheme={cost.costScope === 'BOOKING' ? 'blue' : 'purple'}>{cost.costScope === 'BOOKING' ? 'Booking' : 'General'}</Badge></Td>
                <Td>{cost.costScope === 'BOOKING' ? bookingLabel(rowBooking) : '-'}</Td>
                <Td>{cost.concept}</Td>
                <Td><Badge colorScheme={cost.costResponsibility === 'CLIENT' ? 'cyan' : 'gray'}>{cost.costResponsibility === 'CLIENT' ? 'Cliente' : 'CIA'}</Badge></Td>
                <Td><Badge colorScheme={cost.costResponsibility === 'CLIENT' && cost.customerPaymentStatus === 'UNPAID' ? 'red' : 'green'}>{cost.costResponsibility === 'CLIENT' ? (cost.customerPaymentStatus === 'PAID' ? 'Pago' : 'No pago') : '-'}</Badge></Td>
                <Td isNumeric>{money(cost.realCost, cost.currency)}</Td>
                <Td isNumeric>{money(cost.saleAmount, cost.currency)}</Td>
                <Td isNumeric color={realProfit >= 0 ? 'green.600' : 'red.600'} fontWeight="700">{money(realProfit, cost.currency)}</Td>
                <Td><Badge colorScheme={cost.status === 'PAID' ? 'green' : 'orange'}>{cost.status}</Badge></Td>
                <Td>
                  <HStack>
                    <IconButton aria-label="Editar costo" icon={<EditIcon />} size="sm" variant="outline" onClick={() => openEditCostModal(cost)} />
                    {allowDelete && <IconButton aria-label="Eliminar costo" icon={<DeleteIcon />} size="sm" colorScheme="red" variant="outline" onClick={() => deleteCost(cost)} />}
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
      <PageHeader
        title="Liquidaciones"
        description="Proceso financiero de operaciones: costos reales, comisiones y cierre."
      />

      <ListToolbar>
        <Flex gap={3} direction={{ base: 'column', md: 'row' }}>
          <Input placeholder="Buscar operacion, cliente, origen o destino" value={search} onChange={(e) => setSearch(e.target.value)} />
          <PrimaryActionButton onClick={() => loadOperations()} isLoading={loading}>Buscar</PrimaryActionButton>
        </Flex>
      </ListToolbar>

      <ListCard>
        <DataTable>
          <Thead bg="gray.50"><Tr><Th>Operacion</Th><Th>Cliente</Th><Th>Ruta</Th><Th>Estado</Th><Th isNumeric>Utilidad real</Th><Th></Th></Tr></Thead>
          <Tbody>
            {operations.map((operation) => (
              <Tr key={operation.id} bg={selected?.id === operation.id ? 'teal.50' : 'transparent'}>
                <Td fontWeight="700">{operation.operationNumber}</Td>
                <Td>{operation.customerName}</Td>
                <Td>{operation.origin || '-'} - {operation.destination || '-'}</Td>
                <Td><Badge>{operation.status}</Badge></Td>
                <Td isNumeric>{operation.billingCurrency || 'USD'} {Number(operation.realProfit || 0).toFixed(2)}</Td>
                <Td><IconButton aria-label="Ver liquidacion" icon={<ViewIcon />} size="sm" variant="outline" onClick={() => loadOperation(operation.id)} /></Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      </ListCard>

      {selected && (
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
          <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3} mb={4}>
            <Box>
              <Heading size="md">{selected.operationNumber}</Heading>
              <Text color="gray.600">{selected.customerName} | {selected.origin || '-'} - {selected.destination || '-'}</Text>
            </Box>
            <Badge alignSelf={{ base: 'flex-start', md: 'center' }}>{selected.status}</Badge>
          </Flex>

          <Tabs colorScheme="teal" isLazy>
            <TabList overflowX="auto">
              <Tab>Liquidaciones</Tab>
              <Tab>Comisiones</Tab>
              <Tab>Cierre</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <Stack spacing={5}>
                  <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={3}>
                    <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Venta total</Text><Text fontWeight="800">{money(profitability.totalSale)}</Text></Box>
                    <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Costo real</Text><Text fontWeight="800">{money(profitability.totalRealCost)}</Text></Box>
                    <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Utilidad real</Text><Text fontWeight="800" color={Number(profitability.realProfit || 0) >= 0 ? 'green.600' : 'red.600'}>{money(profitability.realProfit)}</Text></Box>
                    <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Margen</Text><Text fontWeight="800">{percentage(profitability.marginPercentage)}</Text></Box>
                    <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Cliente no pago</Text><Text fontWeight="800">{money(profitability.customerUnpaidCostTotal)}</Text></Box>
                    <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Credito aplicado</Text><Text fontWeight="800" color="green.600">{money(profitability.customerCreditApplied, selected.creditCurrency || 'USD')}</Text></Box>
                    <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Saldo pendiente cliente</Text><Text fontWeight="800" color={Number(profitability.customerPendingAfterCredit || 0) > 0 ? 'red.600' : 'gray.800'}>{money(profitability.customerPendingAfterCredit, selected.creditCurrency || 'USD')}</Text></Box>
                    <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Credito disponible final</Text><Text fontWeight="800">{money(profitability.customerAvailableCreditAfterOperation, selected.creditCurrency || 'USD')}</Text></Box>
                  </Grid>

                  <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3}>
                    <Heading size="sm">Costos liquidados</Heading>
                    <Button leftIcon={<AddIcon />} colorScheme="teal" onClick={openNewCostModal}>Agregar costo</Button>
                  </Flex>

                  <Tabs colorScheme="teal" variant="enclosed" isLazy>
                    <TabList overflowX="auto"><Tab>Booking</Tab><Tab>Generales</Tab><Tab>Otros costos</Tab></TabList>
                    <TabPanels>
                      <TabPanel px={0}>{renderCostTable(bookingCosts, 'Sin costos de booking registrados.')}</TabPanel>
                      <TabPanel px={0}>{renderCostTable(generalCosts, 'Sin costos generales registrados.')}</TabPanel>
                      <TabPanel px={0}>{renderCostTable(otherCosts, 'Sin otros costos a cargo del cliente.', true)}</TabPanel>
                    </TabPanels>
                  </Tabs>
                </Stack>
              </TabPanel>

              <TabPanel px={0}>
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
              </TabPanel>

              <TabPanel px={0}>
                <Stack spacing={3}>
                  <Text color="gray.600">Para cerrar, la operacion debe estar entregada y con facturacion en estado FACTURADO.</Text>
                  <FormControl>
                    <FormLabel>Observacion de cierre</FormLabel>
                    <Textarea value={closeObservation} onChange={(e) => setCloseObservation(e.target.value)} />
                  </FormControl>
                  <Button colorScheme="green" onClick={closeOperation} isLoading={loading} isDisabled={selected.status === 'CLOSED'}>Cerrar operacion</Button>
                </Stack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      )}

      <Modal isOpen={isCostModalOpen} onClose={closeCostModal} size="5xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingCostId ? 'Editar costo' : 'Agregar costo'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={3}>
              <FormControl><FormLabel>Ambito</FormLabel><Select value={costForm.costScope} onChange={(e) => setCostForm((prev) => ({ ...prev, costScope: e.target.value, bookingId: e.target.value === 'BOOKING' ? (prev.bookingId || bookings[0]?.id || '') : '' }))}><option value="BOOKING">Booking</option><option value="OPERATION">General operacion</option></Select></FormControl>
              <FormControl isDisabled={costForm.costScope !== 'BOOKING'}><FormLabel>Booking</FormLabel><Select value={costForm.bookingId} onChange={(e) => setCostForm((prev) => ({ ...prev, bookingId: e.target.value }))}><option value="">Seleccionar</option>{bookings.map((booking) => <option key={booking.id} value={booking.id}>{bookingLabel(booking)}</option>)}</Select></FormControl>
              <FormControl isRequired><FormLabel>Concepto</FormLabel><Input value={costForm.concept} onChange={(e) => setCostForm((prev) => ({ ...prev, concept: e.target.value }))} /></FormControl>
              <FormControl><FormLabel>Proveedor</FormLabel><Input value={costForm.provider} onChange={(e) => setCostForm((prev) => ({ ...prev, provider: e.target.value }))} /></FormControl>
              <FormControl><FormLabel>Costo estimado</FormLabel><NumberInput value={costForm.estimatedCost} onChange={(value) => setCostForm((prev) => ({ ...prev, estimatedCost: Number(value || 0) }))}><NumberInputField /></NumberInput></FormControl>
              <FormControl><FormLabel>Costo real</FormLabel><NumberInput value={costForm.realCost} onChange={(value) => setCostForm((prev) => ({ ...prev, realCost: Number(value || 0) }))}><NumberInputField /></NumberInput></FormControl>
              <FormControl><FormLabel>Venta</FormLabel><NumberInput value={costForm.saleAmount} onChange={(value) => setCostForm((prev) => ({ ...prev, saleAmount: Number(value || 0) }))}><NumberInputField /></NumberInput></FormControl>
              <FormControl><FormLabel>Moneda</FormLabel><Input maxLength={3} value={costForm.currency} onChange={(e) => setCostForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} /></FormControl>
              <FormControl><FormLabel>Documento</FormLabel><Input value={costForm.documentNumber} onChange={(e) => setCostForm((prev) => ({ ...prev, documentNumber: e.target.value }))} /></FormControl>
              <FormControl><FormLabel>Estado</FormLabel><Select value={costForm.status} onChange={(e) => setCostForm((prev) => ({ ...prev, status: e.target.value }))}><option value="PENDING">PENDING</option><option value="APPROVED">APPROVED</option><option value="PAID">PAID</option><option value="CANCELLED">CANCELLED</option></Select></FormControl>
              <FormControl><FormLabel>Responsable</FormLabel><Select value={costForm.costResponsibility} onChange={(e) => setCostForm((prev) => ({ ...prev, costResponsibility: e.target.value, customerPaymentStatus: e.target.value === 'CLIENT' ? prev.customerPaymentStatus : 'UNPAID' }))}><option value="COMPANY">CIA</option><option value="CLIENT">Cliente</option></Select></FormControl>
              <FormControl isDisabled={costForm.costResponsibility !== 'CLIENT'}><FormLabel>Pago cliente</FormLabel><Select value={costForm.customerPaymentStatus} onChange={(e) => setCostForm((prev) => ({ ...prev, customerPaymentStatus: e.target.value }))}><option value="UNPAID">No pago</option><option value="PAID">Pago</option></Select></FormControl>
              <FormControl gridColumn={{ base: 'auto', md: 'span 2' }}><FormLabel>Observaciones</FormLabel><Input value={costForm.observations} onChange={(e) => setCostForm((prev) => ({ ...prev, observations: e.target.value }))} /></FormControl>
            </Grid>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={closeCostModal}>Cancelar</Button>
            <Button colorScheme="teal" onClick={saveCost} isLoading={loading}>{editingCostId ? 'Actualizar costo' : 'Guardar costo'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  )
}
