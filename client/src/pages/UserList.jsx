import React, { useEffect, useState } from 'react'
import {
  Badge,
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Spinner,
  Flex,
  Button,
  Text,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  FormControl,
  FormLabel,
  Input,
  ModalFooter,
  Select,
  Stack,
} from '@chakra-ui/react'
import { AddIcon, EditIcon, DeleteIcon, UnlockIcon } from '@chakra-ui/icons'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { DataTable, ListCard, PageHeader, PrimaryActionButton } from '../components/ListPage'

const roleOptions = [
  ['user', 'Usuario'],
  ['admin', 'Admin'],
  ['customer_service', 'Customer service'],
  ['operativo', 'Operativo'],
  ['asesor', 'Asesor'],
  ['pricing', 'Pricing'],
]

const roleLabel = (role) => roleOptions.find(([value]) => value === role)?.[1] || role || 'Usuario'

export default function UserList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [passwordData, setPasswordData] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editData, setEditData] = useState({ name: '', email: '', phone: '', role: 'user', estado: 1, commissionPercentage: 0 })
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/users')
      setUsers(res.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este usuario?')) return
    setDeletingId(id)
    try {
      await api.delete(`/users/${id}`)
      toast({ title: 'Usuario eliminado', status: 'success', duration: 3000, isClosable: true })
      loadUsers()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error', duration: 3000, isClosable: true })
    } finally {
      setDeletingId(null)
    }
  }

  const openEdit = (user) => {
    setSelectedUser(user)
    setEditData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'user',
      estado: user.estado ? 1 : 0,
      commissionPercentage: Number(user.commissionPercentage || 0),
    })
    setIsEditOpen(true)
  }

  const openPassword = (user) => {
    setSelectedUser(user)
    setPasswordData('')
    setIsPasswordOpen(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser) return
    setSaving(true)
    try {
      await api.put(`/users/${selectedUser.id}`, {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        role: editData.role,
        estado: Number(editData.estado),
        commissionPercentage: Number(editData.commissionPercentage || 0),
      })
      toast({ title: 'Usuario actualizado', status: 'success', duration: 3000, isClosable: true })
      setIsEditOpen(false)
      setSelectedUser(null)
      loadUsers()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error', duration: 3000, isClosable: true })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser) return
    if (!passwordData) {
      toast({ title: 'Error', description: 'Ingresa una nueva contraseña', status: 'error', duration: 3000, isClosable: true })
      return
    }
    setSaving(true)
    try {
      await api.put(`/users/${selectedUser.id}/password`, { password: passwordData })
      toast({ title: 'Contraseña actualizada', status: 'success', duration: 3000, isClosable: true })
      setIsPasswordOpen(false)
      setSelectedUser(null)
      setPasswordData('')
      loadUsers()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error', duration: 3000, isClosable: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={6}>
      <PageHeader
        title="Usuarios"
        description="Gestiona accesos, roles, telefonos y comisiones comerciales."
        action={(
          <PrimaryActionButton leftIcon={<AddIcon />} onClick={() => navigate('/users/add')}>
            Agregar usuario
          </PrimaryActionButton>
        )}
      />

      {loading ? (
        <Spinner />
      ) : error ? (
        <Text color="red.500">{error}</Text>
      ) : (
        <ListCard>
          <DataTable>
            <Thead bg="gray.50">
              <Tr>
                <Th>Nombre</Th>
                <Th>Email</Th>
                <Th>Telefono</Th>
                <Th>Rol</Th>
                <Th>% Comision</Th>
                <Th>Estado</Th>
                <Th>Acciones</Th>
              </Tr>
            </Thead>
            <Tbody>
              {users.map((user) => (
                <Tr key={user.id}>
                  <Td>{user.name}</Td>
                  <Td>{user.email}</Td>
                  <Td>{user.phone || '-'}</Td>
                  <Td>{roleLabel(user.role)}</Td>
                  <Td>{Number(user.commissionPercentage || 0).toFixed(2)}%</Td>
                  <Td>
                    <Badge colorScheme={user.estado ? 'green' : 'gray'}>
                      {user.estado ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </Td>
                  <Td>
                    <Flex gap={2}>
                      <IconButton aria-label="Editar" icon={<EditIcon />} size="sm" variant="outline" onClick={() => openEdit(user)} />
                      <IconButton aria-label="Eliminar" icon={<DeleteIcon />} size="sm" colorScheme="red" variant="outline" isLoading={deletingId === user.id} onClick={() => handleDelete(user.id)} />
                      <IconButton aria-label="Cambiar contraseña" icon={<UnlockIcon />} size="sm" colorScheme="yellow" variant="outline" onClick={() => openPassword(user)} />
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </DataTable>
        </ListCard>
      )}

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Editar usuario</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box as="form" onSubmit={handleEditSubmit}>
              <FormControl mb={4} isRequired>
                <FormLabel>Nombre</FormLabel>
                <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
              </FormControl>
              <FormControl mb={4} isRequired>
                <FormLabel>Email</FormLabel>
                <Input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
              </FormControl>
              <FormControl mb={4}>
                <FormLabel>Telefono</FormLabel>
                <Input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
              </FormControl>
              <FormControl mb={4}>
                <FormLabel>Rol</FormLabel>
                <Select value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })}>
                  {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </FormControl>
              <FormControl mb={4}>
                <FormLabel>% Comision comercial</FormLabel>
                <Input type="number" min={0} step="0.01" value={editData.commissionPercentage} onChange={(e) => setEditData({ ...editData, commissionPercentage: Number(e.target.value || 0) })} />
              </FormControl>
              <FormControl mb={4}>
                <FormLabel>Estado</FormLabel>
                <Select value={editData.estado} onChange={(e) => setEditData({ ...editData, estado: Number(e.target.value) })}>
                  <option value={1}>Activo</option>
                  <option value={0}>Inactivo</option>
                </Select>
              </FormControl>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button colorScheme="blue" onClick={handleEditSubmit} isLoading={saving}>
              Guardar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Cambiar contraseña</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired>
              <FormLabel>Nueva contraseña</FormLabel>
              <Input type="password" value={passwordData} onChange={(e) => setPasswordData(e.target.value)} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsPasswordOpen(false)}>
              Cancelar
            </Button>
            <Button colorScheme="blue" onClick={handlePasswordSubmit} isLoading={saving}>
              Guardar contraseña
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  )
}
