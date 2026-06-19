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
  Input,
  Select,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react'
import { ViewIcon } from '@chakra-ui/icons'
import api from '../services/api'
import { DataTable, ListCard, ListToolbar, PageHeader, PrimaryActionButton } from '../components/ListPage'

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

const statusLabel = (status) => statusOptions.find(([value]) => value === status)?.[1] || status
const formatDate = (value) => value ? new Date(value).toLocaleDateString('es-PE') : '-'
const formatDateTime = (value) => value ? new Date(value).toLocaleString('es-PE') : '-'

export default function OperationalTracking() {
  const [operations, setOperations] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      return {}
    }
  }, [])

  const visibleOperations = useMemo(() => {
    if (currentUser?.role !== 'asesor') return operations
    return operations.filter((operation) => String(operation.commercialUserId || '') === String(currentUser.id || ''))
  }, [operations, currentUser])

  const loadOperations = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/operations', { params })
      setOperations(data)
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadOperation = async (operationId) => {
    setLoading(true)
    try {
      const { data } = await api.get(`/operations/${operationId}`)
      setSelected(data)
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOperations()
  }, [])

  return (
    <Stack spacing={6}>
      <PageHeader
        title="Consulta operativa"
        description="Seguimiento de etapa, booking y tracking de cargas convertidas a operacion."
      />

      <ListToolbar>
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr auto' }} gap={3} alignItems="end">
          <FormControl>
            <FormLabel>Buscar carga</FormLabel>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="OP, cliente, booking, BL, AWB, origen o destino" />
          </FormControl>
          <FormControl>
            <FormLabel>Estado</FormLabel>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </FormControl>
          <PrimaryActionButton onClick={loadOperations} isLoading={loading}>Buscar</PrimaryActionButton>
        </Grid>
      </ListToolbar>

      <ListCard title="Cargas en operacion" description="Consulta de solo lectura para el asesor.">
        <DataTable>
          <Thead bg="gray.50">
            <Tr>
              <Th>Operacion</Th>
              <Th>Cliente</Th>
              <Th>Ruta</Th>
              <Th>Booking</Th>
              <Th>Fechas</Th>
              <Th>Estado</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {visibleOperations.map((operation) => (
              <Tr key={operation.id} bg={selected?.id === operation.id ? 'teal.50' : 'transparent'}>
                <Td fontWeight="800">{operation.operationNumber}</Td>
                <Td>{operation.customerName}</Td>
                <Td>{operation.origin || '-'} - {operation.destination || '-'}</Td>
                <Td>{operation.bookingCount > 1 ? `${operation.bookingCount} bookings` : (operation.bookingNumber || operation.blNumber || operation.awbNumber || '-')}</Td>
                <Td>
                  <Text fontSize="sm">ETD: {formatDate(operation.etd)}</Text>
                  <Text fontSize="sm" color="gray.500">ETA: {formatDate(operation.eta)}</Text>
                </Td>
                <Td><Badge colorScheme={operation.status === 'CANCELLED' ? 'red' : operation.status === 'CLOSED' ? 'green' : 'teal'}>{statusLabel(operation.status)}</Badge></Td>
                <Td>
                  <Button size="sm" variant="outline" leftIcon={<ViewIcon />} onClick={() => loadOperation(operation.id)}>
                    Ver tracking
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
        {!visibleOperations.length && <Text p={4} color="gray.500">No hay operaciones asociadas para mostrar.</Text>}
      </ListCard>

      {selected && (
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
          <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3} mb={4}>
            <Box>
              <Heading size="md">{selected.operationNumber}</Heading>
              <Text color="gray.600">{selected.customerName} | {selected.origin || '-'} - {selected.destination || '-'}</Text>
            </Box>
            <Badge alignSelf={{ base: 'flex-start', md: 'center' }} colorScheme="teal" px={3} py={1}>
              {statusLabel(selected.status)}
            </Badge>
          </Flex>

          <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={3} mb={5}>
            <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Comercial</Text><Text fontWeight="700">{selected.commercialName || '-'}</Text></Box>
            <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Operativo</Text><Text fontWeight="700">{selected.operativeName || '-'}</Text></Box>
            <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">ETD / ETA</Text><Text fontWeight="700">{formatDate(selected.etd)} / {formatDate(selected.eta)}</Text></Box>
            <Box bg="gray.50" p={4} borderRadius="md"><Text fontSize="sm" color="gray.500">Entrega estimada</Text><Text fontWeight="700">{formatDate(selected.estimatedDeliveryDate)}</Text></Box>
          </Grid>

          <Grid templateColumns={{ base: '1fr', xl: '1fr 1.2fr' }} gap={5}>
            <ListCard title="Bookings" description="Documentos principales asociados a la carga.">
              <Table size="sm">
                <Thead bg="gray.50">
                  <Tr><Th>Booking</Th><Th>BL/AWB</Th><Th>Nave/Vuelo</Th><Th>ETD</Th><Th>ETA</Th></Tr>
                </Thead>
                <Tbody>
                  {(selected.bookings || []).map((booking) => (
                    <Tr key={booking.id}>
                      <Td fontWeight="700">{booking.bookingNumber || '-'}</Td>
                      <Td>{booking.mblNumber || booking.blNumber || booking.awbNumber || '-'}</Td>
                      <Td>{booking.vessel || '-'}</Td>
                      <Td>{formatDate(booking.etd)}</Td>
                      <Td>{formatDate(booking.eta)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {!(selected.bookings || []).length && <Text p={4} color="gray.500">Sin bookings registrados.</Text>}
            </ListCard>

            <ListCard title="Linea de tracking" description="Ultimos eventos registrados por operatividad.">
              <Stack spacing={3} p={4}>
                {(selected.tracking || []).map((event) => (
                  <Box key={event.id} borderLeftWidth="3px" borderLeftColor="teal.400" pl={3}>
                    <HStack justify="space-between" align="start">
                      <Box>
                        <Badge colorScheme="teal">{statusLabel(event.status)}</Badge>
                        <Text color="gray.700" mt={1}>{event.observation || 'Sin observacion'}</Text>
                        <Text color="gray.500" fontSize="sm">{event.bookingNumber || 'Operacion'} | {event.userName || '-'}</Text>
                      </Box>
                      <Text color="gray.500" fontSize="sm" whiteSpace="nowrap">{formatDateTime(event.eventDate)}</Text>
                    </HStack>
                  </Box>
                ))}
                {!(selected.tracking || []).length && <Text color="gray.500">Sin tracking registrado.</Text>}
              </Stack>
            </ListCard>
          </Grid>
        </Box>
      )}
    </Stack>
  )
}
