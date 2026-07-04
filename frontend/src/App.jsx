/**
 * App.jsx
 * -------
 * Root component — sets up routing, auth context, and toast notifications.
 * 
 * Route structure:
 *   /login       — Public
 *   /register    — Public
 *   /            — Authenticated (AppShell layout)
 *     /dashboard
 *     /products
 *     /products/:id
 *     /transactions
 *     /categories
 *     /suppliers
 *     /settings
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Transactions from './pages/Transactions'
import Categories from './pages/Categories'
import Suppliers from './pages/Suppliers'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Global toast container — solid white cards per design system */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.875rem',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        <Routes>
          {/* ── Public Routes (no auth required) ── */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ── Protected Routes (require JWT in localStorage) ── */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"        element={<Dashboard />} />
            <Route path="/products"         element={<Products />} />
            <Route path="/products/:id"     element={<ProductDetail />} />
            <Route path="/transactions"     element={<Transactions />} />
            <Route path="/categories"       element={<Categories />} />
            <Route path="/suppliers"        element={<Suppliers />} />
            <Route path="/settings"         element={<Settings />} />
          </Route>

          {/* ── Catch-all: redirect to login ── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
