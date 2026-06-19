import React from 'react'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Icon,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import { AtSignIcon, CalendarIcon, HamburgerIcon, RepeatIcon, SettingsIcon, StarIcon, TimeIcon, UnlockIcon } from '@chakra-ui/icons'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'

function NavItem({ icon, label, to, disabled, onNavigate }) {
  const location = useLocation()
  const active = location.pathname === to

  const content = (
    <HStack
      as={disabled ? 'div' : RouterLink}
      to={disabled ? undefined : to}
      w="100%"
      spacing={3}
      px={3}
      py={2.5}
      borderRadius="md"
      color={active ? 'white' : 'gray.300'}
      bg={active ? 'teal.600' : 'transparent'}
      opacity={disabled ? 0.48 : 1}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      _hover={disabled ? {} : { bg: active ? 'teal.600' : 'whiteAlpha.100', color: 'white', textDecoration: 'none' }}
      onClick={disabled ? undefined : onNavigate}
    >
      <Icon as={icon} boxSize={4} />
      <Text fontSize="sm" fontWeight={active ? '700' : '500'}>{label}</Text>
    </HStack>
  )

  if (disabled) {
    return (
      <Tooltip label="Modulo pendiente" placement="right">
        {content}
      </Tooltip>
    )
  }

  return content
}

export default function Sidebar({ user, onLogout, onNavigate, ...containerProps }) {
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const isAdvisor = user?.role === 'asesor'
  const isPricing = user?.role === 'pricing'
  const canAccessLiquidations = ['pricing', 'admin'].includes(user?.role)
  const roleLabel = {
    admin: 'Admin',
    pricing: 'Pricing',
    asesor: 'Asesor',
    operativo: 'Operativo',
    customer_service: 'Customer service',
  }[user?.role] || 'Usuario'

  return (
    <Flex
      as="aside"
      direction="column"
      w={{ base: '230px', xl: '260px' }}
      minH="100vh"
      bg="gray.900"
      color="white"
      borderRightWidth="1px"
      borderRightColor="blackAlpha.300"
      px={4}
      py={5}
      overflowY="auto"
      {...containerProps}
    >
      <HStack spacing={3} mb={8}>
        <Flex w="40px" h="40px" align="center" justify="center" bg="teal.500" borderRadius="md" fontWeight="800">
          AC
        </Flex>
        <Box minW={0}>
          <Text fontWeight="800" lineHeight="1.1">CargaPer</Text>
          <Text fontSize="xs" color="gray.400">Agencia de Carga</Text>
        </Box>
      </HStack>

      <VStack align="stretch" spacing={1}>
        <NavItem icon={HamburgerIcon} label="Dashboard" to="/dashboard" onNavigate={onNavigate} />
        {!isPricing && <NavItem icon={AtSignIcon} label="Clientes" to="/customers" onNavigate={onNavigate} />}
        <NavItem icon={CalendarIcon} label="Cotizaciones" to="/quotations" onNavigate={onNavigate} />
        {isAdvisor && <NavItem icon={RepeatIcon} label="Consulta operativa" to="/operational-tracking" onNavigate={onNavigate} />}
        {!isAdvisor && !isPricing && <NavItem icon={TimeIcon} label="Operaciones" to="/operations" onNavigate={onNavigate} />}
        {canAccessLiquidations && <NavItem icon={RepeatIcon} label="Liquidaciones" to="/liquidations" onNavigate={onNavigate} />}
        {!isAdvisor && !isPricing && <NavItem icon={StarIcon} label="Ventas" to="/sales" onNavigate={onNavigate} />}
        {!isAdvisor && !isPricing && <NavItem icon={RepeatIcon} label="Tracking" to="/operations" onNavigate={onNavigate} />}

        {isAdmin && (
          <>
            <Text mt={6} mb={2} px={3} color="gray.500" fontSize="xs" fontWeight="800" textTransform="uppercase">
              Administracion
            </Text>
            <NavItem icon={StarIcon} label="Gerencia" to="/management-reports" onNavigate={onNavigate} />
            <NavItem icon={UnlockIcon} label="Usuarios" to="/users" onNavigate={onNavigate} />
            <NavItem icon={SettingsIcon} label="Tablas maestras" to="/master-data" onNavigate={onNavigate} />
            <NavItem icon={SettingsIcon} label="Empresas" to="/companies" disabled onNavigate={onNavigate} />
          </>
        )}
      </VStack>

      <Box flex="1" />

      <Divider borderColor="whiteAlpha.200" my={5} />

      <HStack spacing={3} mb={4}>
        <Avatar size="sm" name={user?.name || 'Usuario'} bg="teal.500" />
        <Box minW={0}>
          <Text fontSize="sm" fontWeight="700" noOfLines={1}>{user?.name || 'Usuario'}</Text>
          <HStack spacing={2}>
            <Badge colorScheme={isAdmin ? 'orange' : user?.role === 'pricing' ? 'purple' : 'gray'}>{roleLabel}</Badge>
          </HStack>
        </Box>
      </HStack>

      <Button
        variant="outline"
        borderColor="whiteAlpha.300"
        color="white"
        _hover={{ bg: 'whiteAlpha.100' }}
        onClick={() => {
          onLogout()
          navigate('/')
        }}
      >
        Cerrar sesion
      </Button>
    </Flex>
  )
}
