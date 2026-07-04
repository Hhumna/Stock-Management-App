import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import toast from 'react-hot-toast';

/**
 * Route wrapper that redirects unauthenticated users to `/login`.
 * Optionally redirects non-admins away from `adminOnly` routes.
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    toast.error('Unauthorized access. Admin role required.');
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
