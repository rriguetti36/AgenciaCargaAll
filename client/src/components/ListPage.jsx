import React from 'react'
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  Table,
  Text,
} from '@chakra-ui/react'

export function PageHeader({ title, description, action }) {
  return (
    <Flex justify="space-between" align={{ base: 'stretch', md: 'flex-start' }} direction={{ base: 'column', md: 'row' }} gap={3}>
      <Box minW={0}>
        <Heading size={{ base: 'md', md: 'lg' }} lineHeight="1.2">{title}</Heading>
        {description && <Text color="gray.600" mt={2}>{description}</Text>}
      </Box>
      {action && (
        <Box alignSelf={{ base: 'stretch', md: 'center' }} sx={{ '& > button, & > a': { width: { base: '100%', md: 'auto' } } }}>
          {action}
        </Box>
      )}
    </Flex>
  )
}

export function ListToolbar({ children }) {
  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
      {children}
    </Box>
  )
}

export function ListCard({ title, description, action, children }) {
  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
      {(title || description || action) && (
        <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3} p={4} borderBottomWidth="1px" borderColor="gray.200">
          <Box minW={0}>
            {title && <Heading size={{ base: 'sm', md: 'md' }} lineHeight="1.2">{title}</Heading>}
            {description && <Text color="gray.500" fontSize="sm" mt={1}>{description}</Text>}
          </Box>
          {action && (
            <HStack justify={{ base: 'stretch', md: 'flex-end' }} flexWrap="wrap" sx={{ '& > button, & > a': { width: { base: '100%', md: 'auto' } } }}>
              {action}
            </HStack>
          )}
        </Flex>
      )}
      <Box overflowX="auto" maxW="100%">
        {children}
      </Box>
    </Box>
  )
}

export function DataTable({ children, ...props }) {
  return (
    <Table size="sm" variant="simple" minW={{ base: '720px', md: '100%' }} {...props}>
      {children}
    </Table>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Buscar' }) {
  return <Input value={value} onChange={onChange} placeholder={placeholder} />
}

export function PrimaryActionButton(props) {
  return <Button colorScheme="teal" w={{ base: '100%', md: 'auto' }} {...props} />
}
