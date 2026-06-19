import React, { useEffect, useState } from 'react'
import {
  Box,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  HStack,
  IconButton,
  Spinner,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import { HamburgerIcon } from '@chakra-ui/icons'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const mobileNav = useDisclosure()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    } else {
      navigate('/')
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  if (!user) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="gray.100">
        <Box textAlign="center">
          <Spinner color="teal.500" mb={4} />
          <Text color="gray.600">Preparando entorno...</Text>
        </Box>
      </Flex>
    )
  }

  return (
    <Flex minH="100vh" bg="gray.100">
      <Sidebar user={user} onLogout={handleLogout} display={{ base: 'none', lg: 'flex' }} flexShrink={0} />

      <Drawer isOpen={mobileNav.isOpen} placement="left" onClose={mobileNav.onClose}>
        <DrawerOverlay />
        <DrawerContent bg="gray.900" maxW="280px">
          <DrawerBody p={0}>
            <Sidebar
              user={user}
              onLogout={handleLogout}
              onNavigate={mobileNav.onClose}
              w="100%"
              minH="100dvh"
              borderRightWidth="0"
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Box flex={1} minW={0}>
        <Flex
          display={{ base: 'flex', lg: 'none' }}
          as="header"
          position="sticky"
          top={0}
          zIndex={10}
          align="center"
          justify="space-between"
          bg="white"
          borderBottomWidth="1px"
          borderColor="gray.200"
          px={4}
          py={3}
        >
          <HStack spacing={3} minW={0}>
            <IconButton
              aria-label="Abrir menu"
              icon={<HamburgerIcon />}
              variant="outline"
              onClick={mobileNav.onOpen}
            />
            <Box minW={0}>
              <Text fontWeight="800" lineHeight="1.1">CargaPer</Text>
              <Text fontSize="xs" color="gray.500" noOfLines={1}>{user?.name || 'Usuario'}</Text>
            </Box>
          </HStack>
        </Flex>

        <Box p={{ base: 4, md: 5, xl: 8 }} maxW="100%" overflowX="hidden">
        {children || <Outlet />}
        </Box>
      </Box>
    </Flex>
  )
}
