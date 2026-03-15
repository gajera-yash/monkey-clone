import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import {
    CreditCard, Plus, Edit2, Trash2, Check, X,
    Coins, Filter, Save, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const SubscriptionPlansAdmin = () => {
    const [activeTab, setActiveTab] = useState('plans'); // plans | filters
    const [plans, setPlans] = useState([]);
    const [plansLoading, setPlansLoading] = useState(true);
    const [showAddPlan, setShowAddPlan] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [newPlan, setNewPlan] = useState({ name: '', duration_days: 7, price: 0, coins: 0, features: '' });

    const [filters, setFilters] = useState([]);
    const [filtersLoading, setFiltersLoading] = useState(true);
    const [showAddFilter, setShowAddFilter] = useState(false);
    const [newFilter, setNewFilter] = useState({ filter_name: '', coin_cost: 0 });
    const [editingFilter, setEditingFilter] = useState(null);

    useEffect(() => {
        fetchPlans();
        fetchFilters();
    }, []);

    // ─── Plans ───────────────────────────────────────────────
    const fetchPlans = async () => {
        setPlansLoading(true);
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .order('price', { ascending: true });
        if (!error && data) setPlans(data);
        else if (error) toast.error('Failed to load plans: ' + error.message);
        setPlansLoading(false);
    };

    const handleSavePlan = async (plan) => {
        const featuresArr = typeof plan.features === 'string'
            ? plan.features.split('\n').filter(Boolean)
            : plan.features;

        if (plan.id) {
            const { error } = await supabase.from('subscription_plans')
                .update({
                    name: plan.name,
                    duration_days: plan.duration_days,
                    price: plan.price,
                    coins: plan.coins,
                    features: featuresArr
                })
                .eq('id', plan.id);
            if (error) toast.error('Update failed: ' + error.message);
            else { toast.success('Plan updated!'); setEditingPlan(null); fetchPlans(); }
        } else {
            const { error } = await supabase.from('subscription_plans')
                .insert({
                    name: plan.name,
                    duration_days: plan.duration_days,
                    price: plan.price,
                    coins: plan.coins,
                    features: featuresArr
                });
            if (error) toast.error('Create failed: ' + error.message);
            else {
                toast.success('Plan created!');
                setShowAddPlan(false);
                setNewPlan({ name: '', duration_days: 7, price: 0, coins: 0, features: '' });
                fetchPlans();
            }
        }
    };

    const handleDeletePlan = async (id) => {
        if (!window.confirm('Delete this plan?')) return;
        const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
        if (error) toast.error('Delete failed: ' + error.message);
        else { toast.success('Plan deleted'); fetchPlans(); }
    };

    // ─── Filters ─────────────────────────────────────────────
    const fetchFilters = async () => {
        setFiltersLoading(true);
        const { data, error } = await supabase
            .from('filter_coin_costs')
            .select('*')
            .order('filter_name', { ascending: true });
        if (!error && data) setFilters(data);
        else if (error) console.warn('filter_coin_costs table may not exist yet:', error.message);
        setFiltersLoading(false);
    };

    const handleSaveFilter = async (filter) => {
        if (filter.id) {
            const { error } = await supabase.from('filter_coin_costs')
                .update({ coin_cost: filter.coin_cost, is_active: filter.is_active })
                .eq('id', filter.id);
            if (error) toast.error('Update failed: ' + error.message);
            else { toast.success('Filter updated!'); setEditingFilter(null); fetchFilters(); }
        } else {
            const { error } = await supabase.from('filter_coin_costs')
                .insert({ filter_name: filter.filter_name, coin_cost: filter.coin_cost, is_active: true });
            if (error) toast.error('Create failed: ' + error.message);
            else {
                toast.success('Filter created!');
                setShowAddFilter(false);
                setNewFilter({ filter_name: '', coin_cost: 0 });
                fetchFilters();
            }
        }
    };

    const handleDeleteFilter = async (id) => {
        if (!window.confirm('Delete this filter?')) return;
        const { error } = await supabase.from('filter_coin_costs').delete().eq('id', id);
        if (error) toast.error('Delete failed');
        else { toast.success('Filter deleted'); fetchFilters(); }
    };

    // ─── Plan Card ────────────────────────────────────────────
    const PlanCard = ({ plan }) => {
        const isEditing = editingPlan?.id === plan.id;
        const [form, setForm] = useState({
            ...plan,
            features: Array.isArray(plan.features) ? plan.features.join('\n') : ''
        });

        if (isEditing) {
            return (
                <div className="bg-white border-2 border-indigo-300 rounded-[28px] p-6 shadow-lg">
                    <div className="space-y-3">
                        <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Plan Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="number" className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Duration (days)" value={form.duration_days} onChange={e => setForm(p => ({ ...p, duration_days: parseInt(e.target.value) }))} />
                            <input type="number" className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Price (₹)" value={form.price} onChange={e => setForm(p => ({ ...p, price: parseFloat(e.target.value) }))} />
                        </div>
                        <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Coins Included" value={form.coins} onChange={e => setForm(p => ({ ...p, coins: parseInt(e.target.value) }))} />
                        <textarea className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none h-24 resize-none focus:ring-2 focus:ring-indigo-300" placeholder="Features (one per line)" value={form.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))} />
                        <div className="flex gap-2">
                            <button onClick={() => handleSavePlan(form)} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest">Save</button>
                            <button onClick={() => setEditingPlan(null)} className="py-2.5 px-4 bg-slate-100 text-slate-500 rounded-xl font-black text-xs">Cancel</button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm hover:shadow-lg transition-all group">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h4 className="font-black text-slate-800 text-lg">{plan.name}</h4>
                        <p className="text-indigo-600 font-black text-2xl mt-1">
                            ₹{plan.price}<span className="text-sm text-slate-400 font-medium"> / {plan.duration_days}d</span>
                        </p>
                        {plan.coins > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                                <Coins size={14} className="text-yellow-500" />
                                <span className="text-sm font-black text-yellow-600">{plan.coins} Coins Included</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingPlan(plan)} className="p-2 hover:bg-indigo-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeletePlan(plan.id)} className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                </div>
                <ul className="space-y-1">
                    {(Array.isArray(plan.features) ? plan.features : []).map((f, i) => (
                        <li key={i} className="text-xs text-slate-500 font-medium flex items-center gap-2"><span className="text-green-500">✓</span> {f}</li>
                    ))}
                </ul>
            </div>
        );
    };

    // ─── Filter Row ───────────────────────────────────────────
    const FilterRow = ({ filter }) => {
        const isEditing = editingFilter?.id === filter.id;
        const [form, setForm] = useState({ ...filter });

        if (isEditing) {
            return (
                <tr className="bg-indigo-50/50">
                    <td className="px-8 py-4">
                        <span className="font-black text-slate-700 capitalize">{filter.filter_name}</span>
                    </td>
                    <td className="px-8 py-4">
                        <input type="number" className="border border-indigo-200 rounded-xl px-3 py-2 text-sm font-bold w-28 outline-none focus:ring-2 focus:ring-indigo-300" value={form.coin_cost} onChange={e => setForm(p => ({ ...p, coin_cost: parseInt(e.target.value) }))} />
                    </td>
                    <td className="px-8 py-4">
                        <button onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))} className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase ${form.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{form.is_active ? 'Active' : 'Inactive'}</button>
                    </td>
                    <td className="px-8 py-4 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => handleSaveFilter(form)} className="p-2 bg-indigo-600 text-white rounded-xl"><Check size={16} /></button>
                            <button onClick={() => setEditingFilter(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl"><X size={16} /></button>
                        </div>
                    </td>
                </tr>
            );
        }

        return (
            <tr className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5">
                    <span className="font-black text-slate-700 capitalize">{filter.filter_name}</span>
                </td>
                <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                        <Coins size={16} className="text-yellow-500" />
                        <span className="font-black text-slate-800">{filter.coin_cost} Coins</span>
                    </div>
                </td>
                <td className="px-8 py-5">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${filter.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {filter.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingFilter(filter)} className="p-2 hover:bg-indigo-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteFilter(filter.id)} className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="p-10 max-w-[1400px] mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
                        <CreditCard size={32} className="text-indigo-500" />
                        Subscription Plans
                    </h1>
                    <p className="text-slate-500 font-medium tracking-tight mt-1">Manage plans and filter coin costs</p>
                </div>
                <button onClick={() => { fetchPlans(); fetchFilters(); }} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
                <button
                    onClick={() => setActiveTab('plans')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'plans' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <CreditCard size={14} /> Subscription Plans
                </button>
                <button
                    onClick={() => setActiveTab('filters')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'filters' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Filter size={14} /> Filter Coin Costs
                </button>
            </div>

            {/* ── Plans Tab ── */}
            {activeTab === 'plans' && (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                            {plans.length} plan{plans.length !== 1 ? 's' : ''} configured
                        </p>
                        <button onClick={() => setShowAddPlan(!showAddPlan)} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                            <Plus size={16} /> Add Plan
                        </button>
                    </div>

                    {showAddPlan && (
                        <div className="bg-white border-2 border-indigo-200 rounded-[28px] p-6 shadow-lg mb-6">
                            <h4 className="font-black text-slate-800 mb-4 uppercase tracking-widest text-sm">New Plan</h4>
                            <div className="space-y-3">
                                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Plan Name (e.g. Monkey Plus)" value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))} />
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="number" className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Duration (days)" value={newPlan.duration_days} onChange={e => setNewPlan(p => ({ ...p, duration_days: parseInt(e.target.value) }))} />
                                    <input type="number" className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Price (₹)" value={newPlan.price} onChange={e => setNewPlan(p => ({ ...p, price: parseFloat(e.target.value) }))} />
                                </div>
                                <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Coins Included (0 = none)" value={newPlan.coins} onChange={e => setNewPlan(p => ({ ...p, coins: parseInt(e.target.value) }))} />
                                <textarea className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none h-24 resize-none focus:ring-2 focus:ring-indigo-300" placeholder="Features (one per line)" value={newPlan.features} onChange={e => setNewPlan(p => ({ ...p, features: e.target.value }))} />
                                <div className="flex gap-2">
                                    <button onClick={() => handleSavePlan(newPlan)} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest">Create Plan</button>
                                    <button onClick={() => setShowAddPlan(false)} className="py-2.5 px-4 bg-slate-100 text-slate-500 rounded-xl font-black text-xs">Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {plansLoading ? (
                        <div className="text-center py-10 text-slate-400 font-bold text-xs uppercase tracking-widest">Loading plans...</div>
                    ) : plans.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-200 text-slate-400 font-bold uppercase tracking-widest text-xs">
                            No plans yet. Click "Add Plan" to create one.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
                        </div>
                    )}
                </div>
            )}

            {/* ── Filters Tab ── */}
            {activeTab === 'filters' && (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                            Coin cost per filter — deducted when user applies filter
                        </p>
                        <button onClick={() => setShowAddFilter(!showAddFilter)} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                            <Plus size={16} /> Add Filter
                        </button>
                    </div>

                    {showAddFilter && (
                        <div className="bg-white border-2 border-indigo-200 rounded-[28px] p-6 shadow-lg mb-6">
                            <h4 className="font-black text-slate-800 mb-4 uppercase tracking-widest text-sm">New Filter</h4>
                            <div className="space-y-3">
                                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Filter Name (e.g. gender, country, age)" value={newFilter.filter_name} onChange={e => setNewFilter(p => ({ ...p, filter_name: e.target.value.toLowerCase() }))} />
                                <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Coin Cost" value={newFilter.coin_cost} onChange={e => setNewFilter(p => ({ ...p, coin_cost: parseInt(e.target.value) }))} />
                                <div className="flex gap-2">
                                    <button onClick={() => handleSaveFilter(newFilter)} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest">Create</button>
                                    <button onClick={() => setShowAddFilter(false)} className="py-2.5 px-4 bg-slate-100 text-slate-500 rounded-xl font-black text-xs">Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[2px] text-slate-400">Filter Name</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[2px] text-slate-400">Coin Cost</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[2px] text-slate-400">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[2px] text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filtersLoading ? (
                                        <tr><td colSpan="4" className="p-16 text-center">
                                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                        </td></tr>
                                    ) : filters.length === 0 ? (
                                        <tr><td colSpan="4" className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                            No filters configured. Run the SQL setup script first.
                                        </td></tr>
                                    ) : filters.map(f => <FilterRow key={f.id} filter={f} />)}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-6 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
                        <p className="text-sm font-black text-amber-800">💡 How it works</p>
                        <p className="text-xs text-amber-700 mt-1 font-medium leading-relaxed">
                            When a user applies a gender filter, <strong>{filters.find(f => f.filter_name === 'gender')?.coin_cost || 15} coins</strong> are deducted from their balance automatically. 
                            Country filter costs <strong>{filters.find(f => f.filter_name === 'country')?.coin_cost || 30} coins</strong>. 
                            Set coin cost to 0 to make a filter free.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionPlansAdmin;
