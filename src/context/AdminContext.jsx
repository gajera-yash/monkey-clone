import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminRole = async () => {
            if (!currentUser) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            try {
                // Check 'profiles' table in Supabase for admin role
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', currentUser.uid)
                    .single();

                if (data && data.role === 'admin') {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error("Admin check failed:", err);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkAdminRole();
    }, [currentUser]);

    return (
        <AdminContext.Provider value={{ isAdmin, loading }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => useContext(AdminContext);
