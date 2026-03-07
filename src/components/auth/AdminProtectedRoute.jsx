import AdminLoginModal from './AdminLoginModal';
import { useAdmin } from '../../context/AdminContext';

const AdminProtectedRoute = ({ children }) => {
    const { isAdmin, loading } = useAdmin();

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-t-indigo-600 border-white/10 animate-spin"></div>
            </div>
        );
    }

    if (!isAdmin) {
        // Show the login modal instead of redirecting
        return <AdminLoginModal />;
    }

    return children;
};

export default AdminProtectedRoute;
