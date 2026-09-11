import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { PageLoader } from '../ui/LoadingSpinner';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader text="Checking session..." />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
