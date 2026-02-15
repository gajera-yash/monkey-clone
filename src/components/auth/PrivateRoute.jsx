import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PrivateRoute = ({ children }) => {
    const { currentUser, loading } = useAuth(); // Assuming useAuth provides loading state

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-dark-900 text-white">Loading...</div>;
    }

    return currentUser ? children : <Navigate to="/" />;
};

export default PrivateRoute;
