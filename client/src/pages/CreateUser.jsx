import React, { useState } from 'react'
import {
  Box,
  Heading,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
  Flex,
} from '@chakra-ui/react'
import { ArrowBackIcon } from '@chakra-ui/icons'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const roleOptions = [
  ['user', 'Usuario'],
  ['admin', 'Admin'],
  ['customer_service', 'Customer service'],
  ['operativo', 'Operativo'],
  ['asesor', 'Asesor'],
  ['pricing', 'Pricing'],
]

export default function CreateUser() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'user',
    estado: 1,
    commissionPercentage: 0,
  })
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: ['estado', 'commissionPercentage'].includes(name) ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/users', formData)
      toast({ title: 'Usuario creado', status: 'success', duration: 3000, isClosable: true })
      navigate('/users')
    } catch (error) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Error al crear usuario', status: 'error', duration: 3000, isClosable: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Crear Usuario</Heading>
        <Button leftIcon={<ArrowBackIcon />} variant="outline" onClick={() => navigate('/users')}>
          Volver al listado
        </Button>
      </Flex>

      <Box p={6} bg="white" boxShadow="lg" borderRadius="md">
        <form onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Nombre</FormLabel>
              <Input name="name" value={formData.name} onChange={handleChange} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input type="email" name="email" value={formData.email} onChange={handleChange} />
            </FormControl>
            <FormControl>
              <FormLabel>Telefono</FormLabel>
              <Input name="phone" value={formData.phone} onChange={handleChange} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Contraseña</FormLabel>
              <Input type="password" name="password" value={formData.password} onChange={handleChange} />
            </FormControl>
            <FormControl>
              <FormLabel>Rol</FormLabel>
              <Select name="role" value={formData.role} onChange={handleChange}>
                {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>% Comision comercial</FormLabel>
              <Input type="number" min={0} step="0.01" name="commissionPercentage" value={formData.commissionPercentage} onChange={handleChange} />
            </FormControl>
            <FormControl>
              <FormLabel>Estado</FormLabel>
              <Select name="estado" value={formData.estado} onChange={handleChange}>
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </Select>
            </FormControl>
            <Flex gap={3}>
              <Button type="submit" colorScheme="blue" isLoading={saving}>
                Guardar
              </Button>
              <Button variant="outline" onClick={() => navigate('/users')}>
                Cancelar
              </Button>
            </Flex>
          </VStack>
        </form>
      </Box>
    </Box>
  )
}
