import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NewHome from '../pages/NewHome';

export const HomeRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, show the landing page
  if (!isAuthenticated || !user) {
    return <NewHome />;
  }

  // Route authenticated users based on their role
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
};