import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../supabase';
import { createClient } from '@supabase/supabase-js';
import {
    Shield, UserPlus, Key, Edit3, Trash2,
    Check, X, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminUsers = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null); // track edit state
    const [generatedCreds, setGeneratedCreds] = useState(null);

    const resetForm = () => {
        setNewAdmin({
            email: '',
            password: '',
            role: 'moderator',
            permissions: {
                users: true,
                content: false,
                revenue: false,
                chats: true,
                reports: true,
                settings: false
            }
        });
        setEditingId(null);
    };

    const [newAdmin, setNewAdmin] = useState({
        email: '',
        password: '',
        role: 'moderator',
        permissions: {
            users: true,
            content: false,
            revenue: false,
            chats: true,
            reports: true,
            settings: false
        }
    });

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
        return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        setLoading(true);
        // Fetch from admin_team_members table (separate from regular users)
        const { data, error } = await supabase
            .from('admin_team_members')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            // Fallback to profiles table if admin_team_members doesn't exist yet
            console.warn('admin_team_members table not found, falling back to profiles:', error.message);
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .in('role', ['admin', 'moderator', 'support'])
                .order('created_at', { ascending: false });

            if (profileError) {
                toast.error('Failed to load admin list');
            } else {
                setAdmins(profileData || []);
            }
        } else {
            setAdmins(data || []);
        }
        setLoading(false);
    };

    const handleSaveAdmin = async () => {
        if (!newAdmin.email) return toast.error('Email is required');

        const toastId = toast.loading(editingId ? 'Updating team member...' : 'Creating team member account...');
        try {
            if (editingId) {
                // UPDATE EXISTING
                const { error: teamError } = await supabase
                    .from('admin_team_members')
                    .update({
                        role: newAdmin.role,
                        permissions: newAdmin.permissions
                    })
                    .eq('id', editingId);

                if (teamError && teamError.code !== 'PGRST116') {
                    // Fallback to profiles if table fails
                    await supabase.from('profiles').update({
                        role: newAdmin.role,
                        permissions: newAdmin.permissions
                    }).eq('id', editingId);
                }

                toast.dismiss(toastId);
                toast.success('Team member updated successfully!');
                setIsAdding(false);
                fetchAdmins();
                resetForm();

            } else {
                // CREATE NEW
                const password = newAdmin.password || generatePassword();
                
                // 1. Sign up via Temp Supabase client so it doesn't log out current admin
                const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://xzveyvqflkzqzthmnnud.supabase.co';
                const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dmV5dnFmbGt6cXp0aG1ubnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTA5MzYsImV4cCI6MjA4ODQ2NjkzNn0.wQY31c5BoqwegIeqx86CevsIiAUhbNIw6QlWu7LjO2s';
                
                const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                    auth: { persistSession: false, autoRefreshToken: false }
                });

                const { data: authData, error: signupError } = await tempClient.auth.signUp({
                    email: newAdmin.email,
                    password,
                    options: {
                        data: { role: newAdmin.role, username: newAdmin.email.split('@')[0] }
                    }
                });

                if (signupError) throw signupError;

                // 2. Insert into admin_team_members table (not profiles)
                if (authData?.user?.id) {
                    const { error: teamError } = await supabase
                        .from('admin_team_members')
                        .insert({
                            user_id: authData.user.id,
                            email: newAdmin.email,
                            username: newAdmin.email.split('@')[0],
                            role: newAdmin.role,
                            permissions: newAdmin.permissions,
                            is_active: true
                        });

                    if (teamError) {
                        console.warn('admin_team_members insert failed, falling back to profiles:', teamError.message);
                        // Fallback: update profiles table. Must bypass RLS trigger!
                        await supabase.from('profiles').upsert({
                            id: authData.user.id,
                            email: newAdmin.email,
                            role: newAdmin.role,
                            username: newAdmin.email.split('@')[0],
                            permissions: newAdmin.permissions
                        }, { onConflict: 'id' });
                    }
                }

                toast.dismiss(toastId);
                toast.success('Team member created successfully!');
                setGeneratedCreds({ email: newAdmin.email, password });
                setIsAdding(false);
                fetchAdmins();
                resetForm();
            }
        } catch (err) {
            toast.dismiss(toastId);
            console.error('Failed to save admin:', err);
            toast.error('Failed: ' + (err.message || 'Unknown error'));
        }
    };

    const handleEditClick = (admin) => {
        setNewAdmin({
            email: admin.email,
            password: '', // do not populate password
            role: admin.role,
            permissions: admin.permissions || { users: true, content: false, revenue: false, chats: true, reports: true, settings: false }
        });
        setEditingId(admin.id);
        setIsAdding(true);
    };

    const togglePermission = (key) => {
        setNewAdmin(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
        }));
    };

    const handleRevokeAccess = async (adminId) => {
        if (!window.confirm("Revoke this team member's admin access?")) return;

        // Try admin_team_members first, then profiles
        const { error } = await supabase
            .from('admin_team_members')
            .update({ is_active: false })
            .eq('id', adminId);

        if (error) {
            // Fallback to profiles
            await supabase.from('profiles').update({ role: 'user' }).eq('id', adminId);
        }

        toast.success('Access revoked.');
        fetchAdmins();
    };

    const PermissionCheckbox = ({ label, isChecked, onChange }) => (
        <div
            onClick={onChange}
            className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${isChecked ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
        >
            <span className={`text-xs font-black uppercase tracking-widest ${isChecked ? 'text-indigo-700' : 'text-slate-500'}`}>{label}</span>
            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-transparent'}`}>
                <Check size={12} strokeWidth={4} />
            </div>
        </div>
    );

    return (
        <div className="p-10 max-w-[1600px] mx-auto space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Team & Roles</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Manage administrative access and feature permissions</p>
                </div>
                <button
                    onClick={() => {
                        if (isAdding) resetForm();
                        setIsAdding(!isAdding);
                    }}
                    className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2 ${isAdding
                        ? 'bg-slate-200 text-slate-600 shadow-none hover:bg-slate-300'
                        : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700'}`}
                >
                    {isAdding ? <><X size={16} /> Cancel</> : <><UserPlus size={16} /> Add Member</>}
                </button>
            </div>

            {/* Credentials Display */}
            {generatedCreds && (
                <div className="bg-green-50 border-2 border-green-200 rounded-[32px] p-8 flex items-start gap-6">
                    <div className="p-3 bg-green-100 text-green-600 rounded-2xl shrink-0"><Key size={24} /></div>
                    <div className="flex-1">
                        <h4 className="font-black text-green-800 text-lg mb-2">✅ Account Created! Share these credentials securely:</h4>
                        <div className="font-mono text-sm bg-white border border-green-200 rounded-xl p-4 space-y-1">
                            <p><span className="font-black text-slate-500">Email:</span> {generatedCreds.email}</p>
                            <p><span className="font-black text-slate-500">Password:</span> {generatedCreds.password}</p>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => { navigator.clipboard.writeText(`Email: ${generatedCreds.email}\nPassword: ${generatedCreds.password}`); toast.success('Copied!'); }} className="px-4 py-2 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-wider">Copy Credentials</button>
                            <button onClick={() => setGeneratedCreds(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-wider">Dismiss</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Form */}
            {isAdding && (
                <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-xl shadow-slate-200/50 animate-in slide-in-from-top-4 duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5 scale-150 rotate-12 pointer-events-none"><Lock size={200} /></div>
                    <h3 className="text-xl font-black text-slate-800 mb-8 tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl"><Key size={20} /></div>
                        {editingId ? "Edit Secure Access" : "Grant Secure Access"}
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Team Member Email</label>
                                <input
                                    type="email"
                                    placeholder="colleague@monkeyapp.com"
                                    disabled={!!editingId}
                                    className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none font-mono ${editingId ? 'opacity-50 cursor-not-allowed' : 'focus:ring-4 focus:ring-indigo-500/10 transition-all'}`}
                                    value={newAdmin.email}
                                    onChange={(e) => !editingId && setNewAdmin({ ...newAdmin, email: e.target.value })}
                                />
                            </div>
                            {!editingId && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Password (leave blank to auto-generate)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Leave blank for auto-generated"
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono"
                                            value={newAdmin.password}
                                            onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                        />
                                        <button onClick={() => setNewAdmin({ ...newAdmin, password: generatePassword() })} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-xs font-black text-slate-500 uppercase tracking-wider transition-colors whitespace-nowrap">Generate</button>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">System Role</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['admin', 'moderator', 'support'].map((role) => (
                                        <button
                                            key={role}
                                            onClick={() => setNewAdmin({ ...newAdmin, role })}
                                            className={`py-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${newAdmin.role === role ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={handleSaveAdmin}
                                className="w-full py-5 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[3px] shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {editingId ? <><Check size={16} /> Save Changes</> : <><UserPlus size={16} /> Create Team Member</>}
                            </button>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Granular Permissions</label>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.keys(newAdmin.permissions).map((key) => (
                                    <PermissionCheckbox key={key} label={key} isChecked={newAdmin.permissions[key]} onChange={() => togglePermission(key)} />
                                ))}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 leading-relaxed mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="text-amber-500 font-black uppercase mr-1">Note:</span>
                                Selecting 'admin' role grants root platform access bypassing granular permissions.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin List */}
            <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[2px] text-slate-400">Team Member</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[2px] text-slate-400">Role Level</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[2px] text-slate-400">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[2px] text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="4" className="p-20 text-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
                            ) : admins.length === 0 ? (
                                <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-400 uppercase tracking-widest text-xs">No team members found. Click "Add Member" to get started.</td></tr>
                            ) : admins.map((admin) => (
                                <tr key={admin.id} className={`transition-colors group ${!admin.is_active ? 'opacity-50' : 'hover:bg-slate-50/50'}`}>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 overflow-hidden border border-slate-200 shadow-sm shrink-0">
                                                {admin.avatar_url ? <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" /> : (admin.username?.charAt(0) || admin.email?.charAt(0) || 'A').toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-800 tracking-tight">{admin.username || admin.email?.split('@')[0] || 'Team Member'}</div>
                                                <div className="text-[11px] text-slate-500 font-medium">{admin.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${admin.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                            admin.role === 'moderator' ? 'bg-green-50 text-green-600 border-green-100' :
                                                'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                            {admin.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <Shield size={16} className={admin.role === 'admin' ? 'text-indigo-500' : 'text-slate-300'} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                {admin.is_active === false ? 'Revoked' : 'Active Token'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleEditClick(admin)}
                                                className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100" title="Edit Permissions">
                                                <Edit3 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleRevokeAccess(admin.id)}
                                                className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                                                title="Revoke Access"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
