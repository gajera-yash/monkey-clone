import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const CreatorRoute = ({ children }) => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-900 text-white">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    // Require authentication
    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    // Require Creator Status
    if (!currentUser.isCreator) {
        return <Navigate to="/chat" replace />;
    }

    return children;
};

export default CreatorRoute;
