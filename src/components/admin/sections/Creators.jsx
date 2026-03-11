import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import { FiDollarSign, FiStar, FiFilter, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Creators = () => {
    const [creators, setCreators] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCreators();
    }, []);

    const fetchCreators = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'creator')
            .order('coins', { ascending: false });

        if (error) {
            console.error("Failed to load creators:", error);
            toast.error("Failed to load creators: " + error.message);
        } else {
            setCreators(data);
        }
        setLoading(false);
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black">Creator Management</h1>
                    <p className="text-gray-500">View earnings and stats for all creators</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-transform">
                    <FiDollarSign /> Manage Rates
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center p-12 text-gray-400">Loading creators...</div>
                ) : creators.length === 0 ? (
                    <div className="col-span-full text-center p-12 text-gray-400">No creators found</div>
                ) : creators.map((creator) => (
                    <div key={creator.id} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-black shadow-lg">
                                {creator.avatar_url ? <img src={creator.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" /> : creator.username?.charAt(0)}
                            </div>
                            <div>
                                <div className="font-black text-lg">{creator.username || 'Creator'}</div>
                                <div className="text-sm text-gray-500">{creator.email}</div>
                                <div className="flex items-center gap-1 mt-1">
                                    <FiStar className="text-yellow-400 fill-yellow-400" />
                                    <FiStar className="text-yellow-400 fill-yellow-400" />
                                    <FiStar className="text-yellow-400 fill-yellow-400" />
                                    <FiStar className="text-yellow-400 fill-yellow-400" />
                                    <FiStar className="text-gray-300" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 rounded-2xl p-4">
                                <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Coins</div>
                                <div className="text-xl font-black text-indigo-600">{creator.coins.toLocaleString()}</div>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-4">
                                <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Status</div>
                                <div className={`text-sm font-bold ${creator.is_verified ? 'text-green-600' : 'text-orange-500'}`}>
                                    {creator.is_verified ? 'Verified' : 'Pending'}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors">Details</button>
                            <button className="flex-1 py-3 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold transition-colors">Payouts</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Creators;
