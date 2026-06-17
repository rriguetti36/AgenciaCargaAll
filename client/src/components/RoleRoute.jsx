import React from 'react'
import { Navigate } from 'react-router-dom'
import { Center, Text } from '@chakra-ui/react'

export default function RoleRoute({ children, deniedRoles = [], allowedRoles = [] }) {
  const token = localStorage.getItem('token')
  const user = localStorage.getItem('user')

  if (!token) return <Navigate to="/" replace />

  try {
    const userData = JSON.parse(user || '{}')
    if (allowedRoles.length && !allowedRoles.includes(userData?.role)) {
      return (
        <Center minH="100vh">
          <Text color="red.500" fontSize="lg">
            Acceso denegado para tu rol
          </Text>
        </Center>
      )
    }
    if (deniedRoles.includes(userData?.role)) {
      return (
        <Center minH="100vh">
          <Text color="red.500" fontSize="lg">
            Acceso denegado para tu rol
          </Text>
        </Center>
      )
    }
  } catch {
    return <Navigate to="/" replace />
  }

  return children
}
