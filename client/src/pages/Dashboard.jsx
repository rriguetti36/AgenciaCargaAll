import React, { useEffect, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
} from '@chakra-ui/react'
import { AddIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const metrics = [
  { label: 'Empresas activas', value: '1', help: 'BD principal configurada' },
  { label: 'Operaciones del dia', value: '0', help: 'Modulo por implementar' },
  { label: 'Usuarios registrados', value: '--', help: 'Gestion desde Seguridad' },
  { label: 'Alertas pendientes', value: '0', help: 'Sin incidencias visibles' },
]

const nextSteps = [
  'Definir empresas y base de datos por tenant',
  'Crear clientes, embarques y seguimiento',
  'Configurar documentos y reportes operativos',
]

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profitability, setProfitability] = useState({ operationProfit: [], customerProfit: [], commercialProfit: [], commissions: {} })
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    api.get('/operations/profitability/dashboard')
      .then(({ data }) => setProfitability(data))
      .catch(() => setProfitability({ operationProfit: [], customerProfit: [], commercialProfit: [], commissions: {} }))
  }, [])

  const money = (value) => `USD ${Number(value || 0).toFixed(2)}`

  return (
    <Stack spacing={7}>
      <Flex justify="space-between" gap={4} align={{ base: 'start', lg: 'center' }} direction={{ base: 'column', lg: 'row' }}>
        <Box>
          <HStack spacing={3} mb={3}>
            <Badge colorScheme="teal">Inicio</Badge>
            <Badge colorScheme="orange">Multiempresa</Badge>
          </HStack>
          <Heading size="lg" color="gray.900">Dashboard operativo</Heading>
          <Text color="gray.600" mt={2}>
            Bienvenido{user ? `, ${user.name}` : ''}. Este sera el centro de control para la agencia de carga.
          </Text>
        </Box>

        {user?.role === 'admin' && (
          <Button leftIcon={<AddIcon />} colorScheme="teal" onClick={() => navigate('/users/add')}>
            Crear usuario
          </Button>
        )}
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        {[
          { label: 'Comisiones pendientes', value: money(profitability.commissions?.pendingCommissions), help: 'Pendiente o aprobada' },
          { label: 'Comisiones pagadas', value: money(profitability.commissions?.paidCommissions), help: 'Estado PAID' },
          ...metrics.slice(2),
        ].map((metric) => (
          <Box key={metric.label} bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
            <Stat>
              <StatLabel color="gray.500">{metric.label}</StatLabel>
              <StatNumber color="gray.900">{metric.value}</StatNumber>
              <StatHelpText mb={0}>{metric.help}</StatHelpText>
            </Stat>
          </Box>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={5}>
        <Box gridColumn={{ base: 'auto', xl: 'span 2' }} bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={6}>
          <Flex justify="space-between" align="center" mb={5}>
            <Box>
              <Heading size="md">Resumen de operaciones</Heading>
              <Text color="gray.600" mt={1}>Espacio reservado para embarques, estados y documentos.</Text>
            </Box>
            <Badge colorScheme="gray">Pendiente</Badge>
          </Flex>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            {profitability.operationProfit.slice(0, 3).map((item) => (
              <Box key={item.id} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
                <Text fontWeight="700">{item.operationNumber}</Text>
                <Text color="gray.500" fontSize="sm" mt={1}>{item.customerName}</Text>
                <Text color={Number(item.realProfit || 0) >= 0 ? 'green.600' : 'red.600'} fontWeight="800" mt={2}>{money(item.realProfit)}</Text>
              </Box>
            ))}
            {!profitability.operationProfit.length && (
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
                <Text fontWeight="700">Rentabilidad</Text>
                <Text color="gray.500" fontSize="sm" mt={1}>Sin registros todavia</Text>
              </Box>
            )}
          </SimpleGrid>
        </Box>

        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={6}>
          <Heading size="md" mb={4}>Rentabilidad comercial</Heading>
          <Stack spacing={3}>
            {profitability.commercialProfit.slice(0, 4).map((item, index) => (
              <HStack key={item.id} align="start" spacing={3}>
                <Flex
                  w="24px"
                  h="24px"
                  align="center"
                  justify="center"
                  bg="teal.50"
                  color="teal.700"
                  borderRadius="md"
                  fontSize="sm"
                  fontWeight="800"
                  flexShrink={0}
                >
                  {index + 1}
                </Flex>
                <Box>
                  <Text color="gray.700" fontWeight="700">{item.commercialName}</Text>
                  <Text color="gray.500" fontSize="sm">Utilidad {money(item.realProfit)} | Comision {money(item.commissionAmount)}</Text>
                </Box>
              </HStack>
            ))}
            {!profitability.commercialProfit.length && nextSteps.map((step, index) => (
              <HStack key={step} align="start" spacing={3}>
                <Flex w="24px" h="24px" align="center" justify="center" bg="teal.50" color="teal.700" borderRadius="md" fontSize="sm" fontWeight="800" flexShrink={0}>{index + 1}</Flex>
                <Text color="gray.700">{step}</Text>
              </HStack>
            ))}
          </Stack>

          {user?.role === 'admin' && (
            <Button mt={6} rightIcon={<ArrowForwardIcon />} variant="outline" onClick={() => navigate('/users')}>
              Gestionar usuarios
            </Button>
          )}
        </Box>
      </SimpleGrid>
    </Stack>
  )
}
