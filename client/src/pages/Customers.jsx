import React, { useEffect, useState } from 'react'
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
  NumberInput,
  NumberInputField,
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
import { EditIcon } from '@chakra-ui/icons'
import api from '../services/api'
import { DataTable, ListCard, PageHeader } from '../components/ListPage'

const emptyForm = {
  companyName: '',
  tradeName: '',
  taxId: '',
  fiscalAddress: '',
  email: '',
  phone: '',
  creditEnabled: 0,
  creditLimit: 0,
  creditCurrency: 'USD',
  creditDays: 0,
  creditNotes: '',
  estado: 1,
  createdBy: '',
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = currentUser.role === 'admin'
  const advisorOptions = users.filter((user) => ['asesor', 'user', 'customer_service', 'admin'].includes(user.role))

  const loadCustomers = async () => {
    const res = await api.get('/customers')
    setCustomers(res.data)
  }

  const loadUsers = async () => {
    if (!isAdmin) return
    const res = await api.get('/users')
    setUsers(res.data)
  }

  useEffect(() => {
    Promise.all([loadCustomers(), loadUsers()]).catch((err) => toast({ title: 'Error', description: err.message, status: 'error' }))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: name === 'estado' ? Number(value) : value }))
  }

  const startEdit = (customer) => {
    setEditingCustomerId(customer.id)
    setForm({
      companyName: customer.companyName || '',
      tradeName: customer.tradeName || '',
      taxId: customer.taxId || '',
      fiscalAddress: customer.fiscalAddress || '',
      email: customer.email || '',
      phone: customer.phone || '',
      creditEnabled: customer.creditEnabled ? 1 : 0,
      creditLimit: Number(customer.creditLimit || 0),
      creditCurrency: customer.creditCurrency || 'USD',
      creditDays: Number(customer.creditDays || 0),
      creditNotes: customer.creditNotes || '',
      estado: customer.estado ? 1 : 0,
      createdBy: customer.createdBy || '',
    })
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingCustomerId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingCustomerId) {
        await api.put(`/customers/${editingCustomerId}`, form)
        toast({ title: 'Cliente actualizado', status: 'success' })
      } else {
        await api.post('/customers', form)
        toast({ title: 'Cliente creado', status: 'success' })
      }
      resetForm()
      await loadCustomers()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={6}>
      <PageHeader
        title="Clientes"
        description="Empresas, contactos base, datos fiscales y estado comercial."
      />

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={5}>
            <Box>
              <Heading size="sm" mb={3}>Datos del cliente</Heading>
              <Grid templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }} gap={4}>
                <FormControl isRequired>
                  <FormLabel>Razon social</FormLabel>
                  <Input name="companyName" value={form.companyName} onChange={handleChange} />
                </FormControl>
                <FormControl>
                  <FormLabel>Nombre comercial</FormLabel>
                  <Input name="tradeName" value={form.tradeName} onChange={handleChange} />
                </FormControl>
                <FormControl>
                  <FormLabel>RUC / Tax ID</FormLabel>
                  <Input name="taxId" value={form.taxId} onChange={handleChange} />
                </FormControl>
                <FormControl>
                  <FormLabel>Estado</FormLabel>
                  <Select name="estado" value={form.estado} onChange={handleChange}>
                    <option value={1}>Activo</option>
                    <option value={0}>Inactivo</option>
                  </Select>
                </FormControl>
                {isAdmin && (
                  <FormControl>
                    <FormLabel>Asesor</FormLabel>
                    <Select name="createdBy" value={form.createdBy} onChange={handleChange}>
                      <option value="">Sin asignar</option>
                      {advisorOptions.map((user) => (
                        <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input name="email" type="email" value={form.email} onChange={handleChange} />
                </FormControl>
                <FormControl>
                  <FormLabel>Telefono</FormLabel>
                  <Input name="phone" value={form.phone} onChange={handleChange} />
                </FormControl>
                <FormControl gridColumn={{ base: 'auto', lg: 'span 2' }}>
                  <FormLabel>Direccion fiscal</FormLabel>
                  <Input name="fiscalAddress" value={form.fiscalAddress} onChange={handleChange} />
                </FormControl>
              </Grid>
            </Box>

            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
              <Heading size="sm" mb={3}>Credito</Heading>
              <Grid templateColumns={{ base: '1fr', lg: 'repeat(5, 1fr)' }} gap={4}>
                <FormControl>
                  <FormLabel>Aplica credito</FormLabel>
                  <Select name="creditEnabled" value={form.creditEnabled} onChange={(e) => setForm((prev) => ({ ...prev, creditEnabled: Number(e.target.value) }))}>
                    <option value={0}>No</option>
                    <option value={1}>Si</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Linea credito</FormLabel>
                  <NumberInput value={form.creditLimit} min={0} onChange={(value) => setForm((prev) => ({ ...prev, creditLimit: Number(value || 0) }))}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Moneda</FormLabel>
                  <Input maxLength={3} value={form.creditCurrency} onChange={(e) => setForm((prev) => ({ ...prev, creditCurrency: e.target.value.toUpperCase() }))} />
                </FormControl>
                <FormControl>
                  <FormLabel>Dias credito</FormLabel>
                  <NumberInput value={form.creditDays} min={0} onChange={(value) => setForm((prev) => ({ ...prev, creditDays: Number(value || 0) }))}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Acuerdo asesor</FormLabel>
                  <Input name="creditNotes" value={form.creditNotes} onChange={handleChange} />
                </FormControl>
              </Grid>
            </Box>
          </Stack>

          <Flex justify="flex-end" mt={5} gap={2}>
            {editingCustomerId && <Button variant="outline" onClick={resetForm}>Cancelar</Button>}
            <Button type="submit" colorScheme="teal" isLoading={loading}>{editingCustomerId ? 'Actualizar cliente' : 'Guardar cliente'}</Button>
          </Flex>
        </form>
      </Box>

      <ListCard>
        <DataTable>
          <Thead bg="gray.50">
            <Tr>
              <Th>Cliente</Th>
              <Th>Tax ID</Th>
              <Th>Contacto</Th>
              <Th>Credito</Th>
              {isAdmin && <Th>Asesor</Th>}
              <Th>Estado</Th>
              <Th>Contactos</Th>
              <Th>Accion</Th>
            </Tr>
          </Thead>
          <Tbody>
            {customers.map((customer) => (
              <Tr key={customer.id}>
                <Td>
                  <Text fontWeight="700">{customer.companyName}</Text>
                  <Text color="gray.500" fontSize="sm">{customer.tradeName || 'Sin nombre comercial'}</Text>
                </Td>
                <Td>{customer.taxId || '-'}</Td>
                <Td>
                  <Text>{customer.email || '-'}</Text>
                  <Text color="gray.500" fontSize="sm">{customer.phone || ''}</Text>
                </Td>
                <Td>
                  <Badge colorScheme={customer.creditEnabled ? 'blue' : 'gray'}>{customer.creditEnabled ? 'Con credito' : 'Sin credito'}</Badge>
                  <Text color="gray.600" fontSize="sm" mt={1}>
                    {customer.creditCurrency || 'USD'} {Number(customer.creditLimit || 0).toFixed(2)} | {Number(customer.creditDays || 0)} dias
                  </Text>
                </Td>
                {isAdmin && <Td>{customer.createdByName || 'Sin asignar'}</Td>}
                <Td>
                  <Badge colorScheme={customer.estado ? 'green' : 'gray'}>
                    {customer.estado ? 'Activo' : 'Inactivo'}
                  </Badge>
                </Td>
                <Td>
                  <HStack>
                    <Badge>{customer.contactsCount}</Badge>
                  </HStack>
                </Td>
                <Td>
                  <IconButton aria-label="Editar cliente" icon={<EditIcon />} size="sm" variant="outline" onClick={() => startEdit(customer)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      </ListCard>
    </Stack>
  )
}
