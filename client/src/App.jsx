import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CreateUser from './pages/CreateUser'
import UserList from './pages/UserList'
import Customers from './pages/Customers'
import Quotations from './pages/Quotations'
import Operations from './pages/Operations'
import OperationDetail from './pages/OperationDetail'
import OperationalTracking from './pages/OperationalTracking'
import Liquidations from './pages/Liquidations'
import Sales from './pages/Sales'
import MasterData from './pages/MasterData'
import ManagementReports from './pages/ManagementReports'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import RoleRoute from './components/RoleRoute'
import DashboardLayout from './components/DashboardLayout'

export default function App(){
  return (
    <Box>
      <Routes>
        <Route path="/" element={<Login/>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard/></DashboardLayout></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><RoleRoute deniedRoles={['pricing']}><DashboardLayout><Customers/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/quotations" element={<ProtectedRoute><DashboardLayout><Quotations/></DashboardLayout></ProtectedRoute>} />
        <Route path="/operations" element={<ProtectedRoute><RoleRoute deniedRoles={['asesor', 'pricing']}><DashboardLayout><Operations/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/operations/:id" element={<ProtectedRoute><RoleRoute deniedRoles={['asesor', 'pricing']}><DashboardLayout><OperationDetail/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/operational-tracking" element={<ProtectedRoute><RoleRoute allowedRoles={['asesor', 'admin']}><DashboardLayout><OperationalTracking/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/liquidations" element={<ProtectedRoute><RoleRoute allowedRoles={['pricing', 'admin']}><DashboardLayout><Liquidations/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><RoleRoute deniedRoles={['asesor', 'pricing']}><DashboardLayout><Sales/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/management-reports" element={<ProtectedRoute><AdminRoute><DashboardLayout><ManagementReports/></DashboardLayout></AdminRoute></ProtectedRoute>} />
        <Route path="/master-data" element={<ProtectedRoute><AdminRoute><DashboardLayout><MasterData/></DashboardLayout></AdminRoute></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><AdminRoute><DashboardLayout><UserList/></DashboardLayout></AdminRoute></ProtectedRoute>} />
        <Route path="/users/add" element={<ProtectedRoute><AdminRoute><DashboardLayout><CreateUser/></DashboardLayout></AdminRoute></ProtectedRoute>} />
      </Routes>
    </Box>
  )
}
