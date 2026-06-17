import React, { useState } from 'react'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import { AtSignIcon, LockIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      const data = res.data
      localStorage.setItem('token', data.token)
      localStorage.setItem(
        'user',
        JSON.stringify({ id: data.id, name: data.name, email: data.email, role: data.role || 'user' })
      )
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Flex minH="100vh" bg="gray.100" align="center" justify="center" px={{ base: 4, md: 8 }} py={8}>
      <SimpleGrid
        columns={{ base: 1, lg: 2 }}
        w="100%"
        maxW="1100px"
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        boxShadow="xl"
        borderRadius="lg"
        overflow="hidden"
      >
        <Box bg="teal.700" color="white" p={{ base: 8, md: 12 }} minH={{ base: 'auto', lg: '640px' }}>
          <Stack spacing={10} h="100%" justify="space-between">
            <Stack spacing={6}>
              <HStack spacing={3}>
                <Flex w="44px" h="44px" bg="whiteAlpha.200" borderRadius="md" align="center" justify="center">
                  <Text fontWeight="800" fontSize="lg">AC</Text>
                </Flex>
                <Box>
                  <Text fontWeight="700" fontSize="lg">Agencia de Carga</Text>
                  <Text color="whiteAlpha.800" fontSize="sm">Operaciones multiempresa</Text>
                </Box>
              </HStack>

              <Box>
                <Badge colorScheme="orange" mb={4}>Entorno administrativo</Badge>
                <Heading size="xl" lineHeight="1.15" mb={4}>
                  Control de operaciones para empresas de carga.
                </Heading>
                <Text color="whiteAlpha.800" fontSize="md" maxW="420px">
                  Inicia sesion para gestionar usuarios, empresas, futuras ordenes, documentos y trazabilidad desde un entorno privado.
                </Text>
              </Box>
            </Stack>

            <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
              {[
                ['Multiempresa', 'BD por compania'],
                ['Seguridad', 'Roles y accesos'],
                ['Base lista', 'SQL Server'],
              ].map(([title, detail]) => (
                <Box key={title} borderWidth="1px" borderColor="whiteAlpha.300" borderRadius="md" p={4}>
                  <Text fontWeight="700">{title}</Text>
                  <Text color="whiteAlpha.700" fontSize="sm">{detail}</Text>
                </Box>
              ))}
            </SimpleGrid>
          </Stack>
        </Box>

        <Flex align="center" justify="center" p={{ base: 6, md: 12 }}>
          <Box w="100%" maxW="420px">
            <Box mb={8}>
              <Heading size="lg" color="gray.900" mb={2}>Iniciar sesion</Heading>
              <Text color="gray.600">Accede con tu usuario administrativo.</Text>
            </Box>

            <form onSubmit={handleSubmit}>
              <Stack spacing={5}>
                <FormControl isRequired>
                  <FormLabel color="gray.700">Email</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={AtSignIcon} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@empresa.com"
                      bg="white"
                    />
                  </InputGroup>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="gray.700">Password</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={LockIcon} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu password"
                      bg="white"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showPassword ? 'Ocultar password' : 'Mostrar password'}
                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPassword((value) => !value)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {error && (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {error}
                  </Alert>
                )}

                <Button type="submit" colorScheme="teal" size="lg" isLoading={loading}>
                  Entrar
                </Button>
              </Stack>
            </form>
          </Box>
        </Flex>
      </SimpleGrid>
    </Flex>
  )
}
