import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StrangyIcon from '../common/StrangyIcon';

const PrivateRoute = ({ children }) => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-dark-900 text-white">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-accent-purple/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                    <div className="relative z-10 animate-bounce">
                        <StrangyIcon className="w-24 h-24" size="text-5xl" />
                    </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <h2 className="text-xl font-bold tracking-widest text-white/90">LOADING</h2>
                    <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-accent-purple animate-[loading_1.5s_ease-in-out_infinite]"></div>
                    </div>
                </div>
            </div>
        );
    }

    return currentUser ? children : <Navigate to="/" replace />;
};

export default PrivateRoute;
