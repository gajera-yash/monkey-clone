import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import {
    Palette, Image as ImageIcon, Gift, Hash,
    Plus, Trash2, Edit3, Check, X,
    Tag, Download, Eye, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const Content = () => {
    const [activeTab, setActiveTab] = useState('tags'); // tags, backgrounds, gifts
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', value: '', type: 'tag', price: 0 });

    useEffect(() => {
        fetchContent();
    }, [activeTab]);

    const fetchContent = async () => {
        setLoading(true);
        let table = activeTab === 'tags' ? 'interest_tags' : 'virtual_assets';
        let { data, error } = await supabase.from(table).select('*').order('id', { ascending: false });

        if (activeTab !== 'tags') {
            data = data.filter(item => item.type === (activeTab === 'backgrounds' ? 'background' : 'gift'));
        }

        if (error) toast.error("Failed to load content");
        else setItems(data || []);
        setLoading(false);
    };

    const handleAddItem = async () => {
        let table = activeTab === 'tags' ? 'interest_tags' : 'virtual_assets';
        let payload = activeTab === 'tags'
            ? { name: newItem.name }
            : { name: newItem.name, type: activeTab === 'backgrounds' ? 'background' : 'gift', image_url: newItem.value, price: newItem.price };

        const { error } = await supabase.from(table).insert([payload]);
        if (error) toast.error("Failed to add item");
        else {
            toast.success("Item added successfully");
            setIsAdding(false);
            setNewItem({ name: '', value: '', type: 'tag', price: 0 });
            fetchContent();
        }
    };

    const handleDelete = async (id) => {
        let table = activeTab === 'tags' ? 'interest_tags' : 'virtual_assets';
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) toast.error("Delete failed");
        else {
            toast.success("Item removed");
            fetchContent();
        }
    };

    return (
        <div className="p-10 max-w-[1600px] mx-auto space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Content Management</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Curate tags, assets and platform economy</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[2px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    <Plus size={18} /> New {activeTab.slice(0, -1)}
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white p-2 rounded-3xl border border-slate-200 shadow-sm w-fit">
                {[
                    { id: 'tags', label: 'Interest Tags', icon: Hash },
                    { id: 'backgrounds', label: 'Backgrounds', icon: ImageIcon },
                    { id: 'gifts', label: 'Virtual Gifts', icon: Gift }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {isAdding && (
                    <div className="bg-indigo-50/50 border-2 border-dashed border-indigo-200 rounded-[32px] p-8 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-300">
                        <h4 className="font-black text-indigo-600 uppercase text-[10px] tracking-widest">Add New {activeTab}</h4>
                        <input
                            type="text"
                            placeholder="Display Name"
                            className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                            value={newItem.name}
                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        />
                        {activeTab !== 'tags' && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Image URL"
                                    className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                                    value={newItem.value}
                                    onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="Price (Coins)"
                                    className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                                    value={newItem.price}
                                    onChange={(e) => setNewItem({ ...newItem, price: parseInt(e.target.value) })}
                                />
                            </>
                        )}
                        <div className="flex gap-2 mt-2">
                            <button onClick={handleAddItem} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase">SAVE</button>
                            <button onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-white text-slate-400 rounded-xl font-black text-[10px] uppercase">CANCEL</button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="col-span-full p-20 text-center uppercase text-[10px] font-black tracking-widest text-slate-400">Syncing Assets...</div>
                ) : items.length === 0 && !isAdding ? (
                    <div className="col-span-full p-20 text-center bg-white rounded-[40px] border border-slate-100">
                        <Sparkles size={40} className="text-slate-200 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">No {activeTab} configured yet</p>
                    </div>
                ) : items.map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-3 rounded-xl ${activeTab === 'tags' ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-500'} group-hover:scale-110 transition-transform`}>
                                {activeTab === 'tags' ? <Tag size={20} /> : activeTab === 'backgrounds' ? <ImageIcon size={20} /> : <Gift size={20} />}
                            </div>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                        </div>

                        {activeTab !== 'tags' && item.image_url && (
                            <div className="aspect-square bg-slate-50 rounded-2xl mb-4 overflow-hidden border border-slate-100 p-2">
                                <img src={item.image_url} alt="" className="w-full h-full object-cover rounded-xl shadow-sm" />
                            </div>
                        )}

                        <div className="mb-6">
                            <h4 className="font-black text-slate-800 uppercase tracking-tight text-lg">{item.name}</h4>
                            {activeTab === 'tags' ? (
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Used by {item.usage_count || 0} users</p>
                            ) : (
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-indigo-600 font-black text-lg">{item.price} <span className="text-[10px] text-slate-400 uppercase">Coins</span></span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${item.is_premium ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                        {item.is_premium ? 'Premium Only' : 'Free Tier'}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                            <button className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-[10px] uppercase text-slate-500 transition-all">Edit Details</button>
                            <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"><X size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Content;
