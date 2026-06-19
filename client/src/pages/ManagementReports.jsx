import React, { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  Input,
  Progress,
  SimpleGrid,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react'
import { RepeatIcon } from '@chakra-ui/icons'
import api from '../services/api'
import { DataTable, ListCard, ListToolbar, PageHeader } from '../components/ListPage'

const emptyReport = {
  summary: {},
  operationsByStatus: [],
  operativeProductivity: [],
  commercialProductivity: [],
  profitabilityByCustomer: [],
  profitabilityByOperation: [],
}

function defaultFromDate() {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().slice(0, 10)
}

function money(value) {
  return `USD ${Number(value || 0).toFixed(2)}`
}

function percent(value) {
  return `${Number(value || 0).toFixed(1)}%`
}

function completionRate(done, total) {
  if (!Number(total)) return 0
  return (Number(done || 0) / Number(total || 0)) * 100
}

function KpiCard({ label, value, help, tone = 'gray' }) {
  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
      <Stat>
        <StatLabel color="gray.500">{label}</StatLabel>
        <StatNumber color={tone === 'green' ? 'green.600' : tone === 'red' ? 'red.600' : 'gray.900'}>{value}</StatNumber>
        {help && <StatHelpText mb={0}>{help}</StatHelpText>}
      </Stat>
    </Box>
  )
}

export default function ManagementReports() {
  const [report, setReport] = useState(emptyReport)
  const [filters, setFilters] = useState({ fromDate: defaultFromDate(), toDate: new Date().toISOString().slice(0, 10) })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const loadReport = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/management-reports/overview', { params: filters })
      setReport({ ...emptyReport, ...data })
    } catch (err) {
      toast({ title: 'Error cargando reportes', description: err.response?.data?.error || err.message, status: 'error' })
      setReport(emptyReport)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [])

  const summary = report.summary || {}
  const operationCloseRate = useMemo(
    () => completionRate(summary.closedOperations, summary.totalOperations),
    [summary.closedOperations, summary.totalOperations]
  )
  const quotationWinRate = useMemo(
    () => completionRate(summary.acceptedQuotations, summary.totalQuotations),
    [summary.acceptedQuotations, summary.totalQuotations]
  )
  const margin = Number(summary.totalSale || 0) ? (Number(summary.realProfit || 0) / Number(summary.totalSale || 0)) * 100 : 0
  const maxStatus = Math.max(...report.operationsByStatus.map((item) => Number(item.total || 0)), 1)

  return (
    <Stack spacing={6}>
      <PageHeader
        title="Gerencia"
        description="Reportes de consulta para productividad operativa, gestion comercial y rentabilidad."
      />

      <ListToolbar>
        <Flex gap={3} direction={{ base: 'column', lg: 'row' }} align={{ base: 'stretch', lg: 'end' }}>
          <Box>
            <Text fontSize="sm" color="gray.600" mb={1}>Desde</Text>
            <Input type="date" value={filters.fromDate} onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))} />
          </Box>
          <Box>
            <Text fontSize="sm" color="gray.600" mb={1}>Hasta</Text>
            <Input type="date" value={filters.toDate} onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))} />
          </Box>
          <Button leftIcon={<RepeatIcon />} colorScheme="teal" onClick={loadReport} isLoading={loading}>
            Actualizar
          </Button>
        </Flex>
      </ListToolbar>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        <KpiCard label="Operaciones" value={Number(summary.totalOperations || 0)} help={`${Number(summary.activeOperations || 0)} activas`} />
        <KpiCard label="Cierre operativo" value={percent(operationCloseRate)} help={`${Number(summary.closedOperations || 0)} cerradas`} tone={operationCloseRate >= 70 ? 'green' : 'gray'} />
        <KpiCard label="Utilidad real" value={money(summary.realProfit)} help={`Margen ${percent(margin)}`} tone={Number(summary.realProfit || 0) >= 0 ? 'green' : 'red'} />
        <KpiCard label="Conversion comercial" value={percent(quotationWinRate)} help={`${Number(summary.acceptedQuotations || 0)} de ${Number(summary.totalQuotations || 0)} cotizaciones`} />
      </SimpleGrid>

      <Grid templateColumns={{ base: '1fr', xl: '1.1fr 1.4fr' }} gap={5}>
        <ListCard title="Productividad operativa" description="Carga y avance por responsable operativo.">
          <DataTable>
            <Thead bg="gray.50">
              <Tr><Th>Operativo</Th><Th isNumeric>Total</Th><Th isNumeric>Cerradas</Th><Th isNumeric>Activas</Th><Th isNumeric>Dias prom.</Th></Tr>
            </Thead>
            <Tbody>
              {report.operativeProductivity.map((item) => (
                <Tr key={item.id}>
                  <Td fontWeight="700">{item.operativeName}</Td>
                  <Td isNumeric>{Number(item.totalOperations || 0)}</Td>
                  <Td isNumeric>{Number(item.closedOperations || 0)}</Td>
                  <Td isNumeric>{Number(item.activeOperations || 0)}</Td>
                  <Td isNumeric>{item.avgDeliveryDays === null ? '-' : Number(item.avgDeliveryDays || 0).toFixed(1)}</Td>
                </Tr>
              ))}
            </Tbody>
          </DataTable>
          {!report.operativeProductivity.length && <Text p={4} color="gray.500">Sin operaciones asignadas en el periodo.</Text>}
        </ListCard>

        <ListCard title="Productividad comercial" description="Cotizaciones, operaciones generadas y rentabilidad por comercial.">
          <DataTable>
            <Thead bg="gray.50">
              <Tr><Th>Comercial</Th><Th isNumeric>Cotiz.</Th><Th isNumeric>Acept.</Th><Th isNumeric>Ops.</Th><Th isNumeric>Utilidad</Th><Th isNumeric>Comision</Th></Tr>
            </Thead>
            <Tbody>
              {report.commercialProductivity.map((item) => (
                <Tr key={item.id}>
                  <Td fontWeight="700">{item.commercialName}</Td>
                  <Td isNumeric>{Number(item.quotations || 0)}</Td>
                  <Td isNumeric>{Number(item.acceptedQuotations || 0)}</Td>
                  <Td isNumeric>{Number(item.operations || 0)}</Td>
                  <Td isNumeric color={Number(item.realProfit || 0) >= 0 ? 'green.600' : 'red.600'} fontWeight="700">{money(item.realProfit)}</Td>
                  <Td isNumeric>{money(item.commissionAmount)}</Td>
                </Tr>
              ))}
            </Tbody>
          </DataTable>
          {!report.commercialProductivity.length && <Text p={4} color="gray.500">Sin actividad comercial en el periodo.</Text>}
        </ListCard>
      </Grid>

      <Grid templateColumns={{ base: '1fr', xl: '0.9fr 1.5fr' }} gap={5}>
        <ListCard title="Estados operativos" description="Distribucion del pipeline operativo.">
          <Stack spacing={3} p={4}>
            {report.operationsByStatus.map((item) => {
              const value = Number(item.total || 0)
              return (
                <Box key={item.status}>
                  <Flex justify="space-between" mb={1}>
                    <HStack>
                      <Badge colorScheme={item.status === 'CLOSED' ? 'green' : item.status === 'CANCELLED' ? 'red' : 'blue'}>{item.status}</Badge>
                    </HStack>
                    <Text fontWeight="700">{value}</Text>
                  </Flex>
                  <Progress value={(value / maxStatus) * 100} colorScheme="teal" borderRadius="full" />
                </Box>
              )
            })}
            {!report.operationsByStatus.length && <Text color="gray.500">Sin operaciones en el periodo.</Text>}
          </Stack>
        </ListCard>

        <ListCard title="Rentabilidad por cliente" description="Clientes con mayor utilidad real.">
          <DataTable>
            <Thead bg="gray.50">
              <Tr><Th>Cliente</Th><Th isNumeric>Operaciones</Th><Th isNumeric>Venta</Th><Th isNumeric>Utilidad</Th></Tr>
            </Thead>
            <Tbody>
              {report.profitabilityByCustomer.map((item) => (
                <Tr key={item.id}>
                  <Td fontWeight="700">{item.companyName}</Td>
                  <Td isNumeric>{Number(item.operations || 0)}</Td>
                  <Td isNumeric>{money(item.totalSale)}</Td>
                  <Td isNumeric color={Number(item.realProfit || 0) >= 0 ? 'green.600' : 'red.600'} fontWeight="700">{money(item.realProfit)}</Td>
                </Tr>
              ))}
            </Tbody>
          </DataTable>
          {!report.profitabilityByCustomer.length && <Text p={4} color="gray.500">Sin rentabilidad registrada en el periodo.</Text>}
        </ListCard>
      </Grid>

      <ListCard title="Operaciones mas rentables" description="Ranking de operaciones por utilidad real.">
        <Table size="sm">
          <Thead bg="gray.50">
            <Tr><Th>Operacion</Th><Th>Cliente</Th><Th>Estado</Th><Th isNumeric>Venta</Th><Th isNumeric>Costo</Th><Th isNumeric>Utilidad</Th></Tr>
          </Thead>
          <Tbody>
            {report.profitabilityByOperation.map((item) => (
              <Tr key={item.id}>
                <Td fontWeight="700">{item.operationNumber}</Td>
                <Td>{item.customerName}</Td>
                <Td><Badge>{item.status}</Badge></Td>
                <Td isNumeric>{money(item.totalSale)}</Td>
                <Td isNumeric>{money(item.totalRealCost)}</Td>
                <Td isNumeric color={Number(item.realProfit || 0) >= 0 ? 'green.600' : 'red.600'} fontWeight="700">{money(item.realProfit)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {!report.profitabilityByOperation.length && <Text p={4} color="gray.500">Sin operaciones con costos liquidados en el periodo.</Text>}
      </ListCard>
    </Stack>
  )
}
