import React, { useEffect, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react'
import { CheckCircleIcon, ViewIcon } from '@chakra-ui/icons'
import api from '../services/api'
import { DataTable, ListCard, PageHeader } from '../components/ListPage'

export default function Sales() {
  const [sales, setSales] = useState([])
  const [selected, setSelected] = useState(null)
  const [issueTarget, setIssueTarget] = useState(null)
  const [issueForm, setIssueForm] = useState({ documentType: 'FACTURA', observations: '' })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const money = (value, currency = 'USD') => `${currency} ${Number(value || 0).toFixed(2)}`

  const loadSales = async () => {
    const { data } = await api.get('/sales')
    setSales(data)
  }

  useEffect(() => {
    loadSales().catch((err) => toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' }))
  }, [])

  const openSale = async (sale) => {
    if (!sale.saleId) {
      setSelected({ ...sale, documents: [] })
      return
    }
    const { data } = await api.get(`/sales/${sale.saleId}`)
    setSelected(data)
  }

  const emitDocument = async () => {
    if (!issueTarget) return
    setLoading(true)
    try {
      await api.post(`/sales/operations/${issueTarget.operationId}/issue`, issueForm)
      toast({ title: 'Comprobante emitido', status: 'success' })
      setIssueTarget(null)
      setIssueForm({ documentType: 'FACTURA', observations: '' })
      await loadSales()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={6}>
      <PageHeader
        title="Ventas y comprobantes"
        description="Registro de ventas generadas desde operaciones y emision de factura o boleta."
      />

      <ListCard>
        <DataTable>
          <Thead bg="gray.50">
            <Tr>
              <Th>Operacion</Th>
              <Th>Venta</Th>
              <Th>Cliente</Th>
              <Th>Facturacion</Th>
              <Th isNumeric>Total</Th>
              <Th>Comprobante</Th>
              <Th>Estado</Th>
              <Th>Acciones</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sales.map((sale) => (
              <Tr key={`${sale.operationId}-${sale.saleId || 'pending'}`}>
                <Td fontWeight="800">{sale.operationNumber}</Td>
                <Td>{sale.saleNumber || '-'}</Td>
                <Td>{sale.customerName}</Td>
                <Td>{sale.billingStatus || 'PENDIENTE'}</Td>
                <Td isNumeric>{money(sale.total, sale.currency)}</Td>
                <Td>{sale.documentNumber ? `${sale.documentType} ${sale.documentNumber}` : '-'}</Td>
                <Td><Badge colorScheme={sale.saleStatus === 'ISSUED' ? 'green' : 'orange'}>{sale.saleStatus || 'PENDING'}</Badge></Td>
                <Td>
                  <HStack>
                    <Button size="sm" leftIcon={<CheckCircleIcon />} colorScheme="teal" onClick={() => setIssueTarget(sale)}>
                      Emitir comprobante
                    </Button>
                    <Button size="sm" leftIcon={<ViewIcon />} variant="outline" onClick={() => openSale(sale)}>
                      Ver venta
                    </Button>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      </ListCard>

      <Modal isOpen={Boolean(issueTarget)} onClose={() => setIssueTarget(null)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Emitir comprobante</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Text fontWeight="700">{issueTarget?.operationNumber} | {issueTarget?.customerName}</Text>
              <Text color="gray.600">{money(issueTarget?.total, issueTarget?.currency)}</Text>
              <FormControl>
                <FormLabel>Tipo comprobante</FormLabel>
                <Select value={issueForm.documentType} onChange={(e) => setIssueForm((prev) => ({ ...prev, documentType: e.target.value }))}>
                  <option value="FACTURA">Factura</option>
                  <option value="BOLETA">Boleta</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Observaciones</FormLabel>
                <Textarea value={issueForm.observations} onChange={(e) => setIssueForm((prev) => ({ ...prev, observations: e.target.value }))} />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={() => setIssueTarget(null)}>Cancelar</Button>
            <Button colorScheme="teal" onClick={emitDocument} isLoading={loading}>Emitir</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Detalle de venta</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <Text><strong>Venta:</strong> {selected?.saleNumber || 'Pendiente de emision'}</Text>
              <Text><strong>Operacion:</strong> {selected?.operationNumber}</Text>
              <Text><strong>Cliente:</strong> {selected?.customerName}</Text>
              <Text><strong>Total:</strong> {money(selected?.total, selected?.currency)}</Text>
              <Heading size="sm" mt={3}>Comprobantes</Heading>
              {(selected?.documents || []).length ? (
                <Table size="sm">
                  <Thead><Tr><Th>Tipo</Th><Th>Numero</Th><Th>Fecha</Th><Th>Estado</Th></Tr></Thead>
                  <Tbody>
                    {selected.documents.map((doc) => (
                      <Tr key={doc.id}>
                        <Td>{doc.documentType}</Td>
                        <Td>{doc.documentNumber}</Td>
                        <Td>{new Date(doc.issueDate).toLocaleDateString()}</Td>
                        <Td><Badge>{doc.status}</Badge></Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              ) : (
                <Text color="gray.500">Sin comprobantes emitidos.</Text>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setSelected(null)}>Cerrar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  )
}
