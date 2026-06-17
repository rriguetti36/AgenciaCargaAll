import React, { useEffect, useState } from 'react'
import { Box, Flex, Spinner, Text } from '@chakra-ui/react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

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
      <Sidebar user={user} onLogout={handleLogout} />
      <Box flex={1} minW={0} p={{ base: 5, xl: 8 }}>
        {children || <Outlet />}
      </Box>
    </Flex>
  )
}
