import React, { useEffect, useState } from 'react'
import {
  Badge,
  Box,
  Button,
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
import { useNavigate } from 'react-router-dom'
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

const formatMeasure = (value, unitCode, decimals = 2) => {
  const number = Number(value || 0)
  if (!number) return '-'
  return `${number.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unitCode || ''}`.trim()
}

export default function Operations() {
  const [operations, setOperations] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const toast = useToast()
  const navigate = useNavigate()

  const statusLabel = (status) => statusOptions.find(([value]) => value === status)?.[1] || status

  const loadOperations = async () => {
    const params = {}
    if (search.trim()) params.search = search.trim()
    if (statusFilter) params.status = statusFilter
    const { data } = await api.get('/operations', { params })
    setOperations(data)
  }

  useEffect(() => {
    loadOperations().catch((err) => toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' }))
  }, [])

  const openOperation = (operationId) => {
    navigate(`/operations/${operationId}`)
  }

  return (
    <Stack spacing={6}>
      <PageHeader
        title="Operaciones"
        description="Listado de operaciones. Abre una operacion para gestionar su operatividad."
      />

      <ListToolbar>
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr auto' }} gap={3} alignItems="end">
          <FormControl>
            <FormLabel>Buscar operacion</FormLabel>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="OP, cliente, booking, BL, AWB, origen o destino" />
          </FormControl>
          <FormControl>
            <FormLabel>Estado</FormLabel>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </FormControl>
          <PrimaryActionButton onClick={loadOperations}>Buscar</PrimaryActionButton>
        </Grid>
      </ListToolbar>

      <ListCard>
        <DataTable>
          <Thead bg="gray.50">
            <Tr>
              <Th>Operacion</Th>
              <Th>Cliente</Th>
              <Th>Ruta</Th>
              <Th>Carga</Th>
              <Th>Booking</Th>
              <Th>Estado</Th>
              <Th>Responsable</Th>
              <Th>Acciones</Th>
            </Tr>
          </Thead>
          <Tbody>
            {operations.map((operation) => (
              <Tr key={operation.id} cursor="pointer" _hover={{ bg: 'gray.50' }} onClick={() => openOperation(operation.id)}>
                <Td fontWeight="800">{operation.operationNumber}</Td>
                <Td>{operation.customerName}</Td>
                <Td>{operation.origin || '-'} - {operation.destination || '-'}</Td>
                <Td>
                  <Text fontWeight="600">{operation.commodity || operation.cargoType || '-'}</Text>
                  <Text color="gray.500" fontSize="sm">
                    Cant: {formatMeasure(operation.quantity, operation.quantityUnitCode)} | Peso: {formatMeasure(operation.grossWeight, operation.weightUnitCode)} | Vol: {formatMeasure(operation.volume, operation.volumeUnitCode)}
                  </Text>
                </Td>
                <Td>{operation.bookingCount > 1 ? `${operation.bookingCount} bookings` : (operation.bookingNumber || '-')}</Td>
                <Td><Badge colorScheme={operation.status === 'CLOSED' ? 'green' : 'teal'}>{statusLabel(operation.status)}</Badge></Td>
                <Td>{operation.operativeName || '-'}</Td>
                <Td>
                  <HStack>
                    <Button
                      size="sm"
                      leftIcon={<ViewIcon />}
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        openOperation(operation.id)
                      }}
                    >
                      Ver operacion
                    </Button>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      </ListCard>
    </Stack>
  )
}
