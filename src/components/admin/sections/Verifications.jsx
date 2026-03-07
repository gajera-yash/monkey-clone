import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import { FiCheck, FiX, FiEye, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Verifications = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('verifications')
            .select(`
                *,
                profiles (username, email)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Failed to load requests");
        } else {
            setRequests(data);
        }
        setLoading(false);
    };

    const handleAction = async (id, status) => {
        const { error } = await supabase
            .from('verifications')
            .update({ status })
            .eq('id', id);

        if (error) {
            toast.error("Action failed");
        } else {
            toast.success(`Verification ${status}`);

            // If approved, also update profile verified status
            if (status === 'approved') {
                const req = requests.find(r => r.id === id);
                await supabase.from('profiles').update({ is_verified: true }).eq('id', req.user_id);
            }

            fetchRequests();
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-black mb-2">Creator Verifications</h1>
            <p className="text-gray-500 mb-8">Review face and voice verification requests from creators</p>

            <div className="grid gap-6">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Loading requests...</div>
                ) : requests.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">No pending requests</div>
                ) : requests.map((req) => (
                    <div key={req.id} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start shadow-sm">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                                        req.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                    }`}>
                                    {req.status}
                                </span>
                                <span className="text-gray-400 text-xs flex items-center gap-1">
                                    <FiClock /> {new Date(req.created_at).toLocaleString()}
                                </span>
                            </div>

                            <div className="mb-4">
                                <div className="font-bold text-lg">{req.profiles?.username || 'Unknown User'}</div>
                                <div className="text-sm text-gray-500">{req.profiles?.email}</div>
                                <div className="text-xs text-gray-400 font-mono mt-1">ID: {req.user_id}</div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1 group relative">
                                    <div className="text-xs font-bold text-gray-400 mb-2 uppercase">Face Image</div>
                                    <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
                                        {req.face_url ? (
                                            <img src={req.face_url} alt="Face" className="w-full h-full object-cover" />
                                        ) : <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>}
                                    </div>
                                    {req.face_url && (
                                        <a href={req.face_url} target="_blank" rel="noreferrer" className="absolute top-8 right-2 p-2 bg-white/90 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            <FiEye />
                                        </a>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-gray-400 mb-2 uppercase">Voice Recording</div>
                                    <div className="h-full flex flex-col justify-center">
                                        {req.voice_url ? (
                                            <audio controls className="w-full h-10">
                                                <source src={req.voice_url} type="audio/mpeg" />
                                            </audio>
                                        ) : <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-400 text-sm">No Voice</div>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {req.status === 'pending' && (
                            <div className="flex md:flex-col gap-2 w-full md:w-32">
                                <button
                                    onClick={() => handleAction(req.id, 'approved')}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-600/20"
                                >
                                    <FiCheck /> Approve
                                </button>
                                <button
                                    onClick={() => handleAction(req.id, 'rejected')}
                                    className="flex-1 bg-gray-100 hover:bg-red-50 hover:text-red-600 p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <FiX /> Reject
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Verifications;
