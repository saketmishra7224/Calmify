import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RoleBasedRouteProps {
  allowedRoles?: string[];
  redirectPath?: string;
  children: React.ReactNode;
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ 
  allowedRoles = [], 
  redirectPath = '/login', 
  children 
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading if auth is still loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectPath} replace />;
  }

  // Check role permissions if roles are specified
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on user role
    switch (user.role) {
      case 'patient':
        return <Navigate to="/chatbot" replace />;
      case 'peer':
      case 'counselor':
        return <Navigate to="/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin/analytics" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};