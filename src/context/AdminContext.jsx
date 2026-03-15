import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
    const { currentUser, loading: authLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminRole, setAdminRole] = useState(null);
    const [adminPermissions, setAdminPermissions] = useState(null);
    // loading is true as long as auth is loading OR we haven't checked admin yet
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If auth is still loading, keep our loading=true and wait
        if (authLoading) {
            setLoading(true);
            return;
        }

        // Auth done loading — now check admin
        const checkAdminRole = async () => {
            if (!currentUser) {
                setIsAdmin(false);
                setAdminRole(null);
                setAdminPermissions(null);
                setLoading(false);
                return;
            }

            try {
                console.log("Checking admin status for ID:", currentUser.id);

                // Check admin_team_members first
                let { data, error } = await supabase
                    .from('admin_team_members')
                    .select('role, permissions, is_active')
                    .eq('user_id', currentUser.id)
                    .single();

                if (error || !data) {
                    // Fallback to profiles
                    console.warn("Not in admin_team_members, checking profiles...", error?.message);
                    const { data: pData } = await supabase
                        .from('profiles')
                        .select('role, permissions')
                        .eq('id', currentUser.id)
                        .single();
                    data = pData;
                }

                if (data && ['admin', 'moderator', 'support'].includes(data.role)) {
                    if (data.is_active === false) {
                        console.log("Admin access revoked.");
                        setIsAdmin(false);
                    } else {
                        console.log("Admin access granted! Role:", data.role);
                        setIsAdmin(true);
                        setAdminRole(data.role);
                        setAdminPermissions(data.permissions || {});
                    }
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
        <AdminContext.Provider value={{ isAdmin, loading, adminRole, adminPermissions }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => useContext(AdminContext);
