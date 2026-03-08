import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
    const { currentUser, loading: authLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminRole = async () => {
            // Wait until auth has finished loading
            if (authLoading) return;

            if (!currentUser) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            try {
                console.log("Checking admin status for UID:", currentUser.uid);

                const { data, error } = await supabase
                    .from('profiles')
                    .select('role, email')
                    .eq('id', currentUser.uid)
                    .single();

                if (error) {
                    console.error("Supabase error checking admin:", error.message);
                }

                if (data && data.role === 'admin') {
                    console.log("Admin access granted!");
                    setIsAdmin(true);
                } else {
                    console.log("Admin access denied. Role:", data?.role);
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
    }, [currentUser, authLoading]);

    return (
        <AdminContext.Provider value={{ isAdmin, loading }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => useContext(AdminContext);
