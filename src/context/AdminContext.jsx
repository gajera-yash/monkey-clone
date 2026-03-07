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
                console.log("Checking admin status for UID:", currentUser.uid);

                // Check 'profiles' table in Supabase for admin role
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role, email')
                    .eq('id', currentUser.uid)
                    .single();

                if (error) {
                    console.error("Supabase error checking admin:", error.message);
                    console.info("TIP: Check if you have run schema_v2.sql in Supabase SQL Editor.");
                }

                if (data) {
                    console.log("Supabase Profile Data:", data);
                    if (data.role === 'admin') {
                        console.log("Admin access granted!");
                        setIsAdmin(true);
                    } else {
                        console.log("Admin access denied. Current Role:", data.role);
                        console.info("TIP: Run 'UPDATE profiles SET role = \"admin\" WHERE id = \"' + currentUser.uid + '\";' in Supabase SQL Editor.");
                        setIsAdmin(false);
                    }
                } else {
                    console.log("No profile found for this user in database.");
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error("Admin check failed with exception:", err);
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
