import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import { useAuth } from '../../../context/AuthContext';
import {
    Globe, Plus, Trash2, RefreshCw, Shield, Search, AlertTriangle, Check,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

// Common countries for quick select
const COMMON_COUNTRIES = [
    { code: 'KP', name: 'North Korea' },
    { code: 'IR', name: 'Iran' },
    { code: 'SY', name: 'Syria' },
    { code: 'RU', name: 'Russia' },
    { code: 'BY', name: 'Belarus' },
    { code: 'CN', name: 'China' },
    { code: 'CU', name: 'Cuba' },
    { code: 'VE', name: 'Venezuela' },
];

// Full country list (subset for common use)
const ALL_COUNTRIES = [
    { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
    { code: 'AR', name: 'Argentina' }, { code: 'AU', name: 'Australia' }, { code: 'AT', name: 'Austria' },
    { code: 'AZ', name: 'Azerbaijan' }, { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' },
    { code: 'BY', name: 'Belarus' }, { code: 'BE', name: 'Belgium' }, { code: 'BR', name: 'Brazil' },
    { code: 'BG', name: 'Bulgaria' }, { code: 'KH', name: 'Cambodia' }, { code: 'CA', name: 'Canada' },
    { code: 'CN', name: 'China' }, { code: 'CO', name: 'Colombia' }, { code: 'CU', name: 'Cuba' },
    { code: 'CZ', name: 'Czech Republic' }, { code: 'EG', name: 'Egypt' }, { code: 'ET', name: 'Ethiopia' },
    { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' }, { code: 'DE', name: 'Germany' },
    { code: 'GH', name: 'Ghana' }, { code: 'GR', name: 'Greece' }, { code: 'IN', name: 'India' },
    { code: 'ID', name: 'Indonesia' }, { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' },
    { code: 'IE', name: 'Ireland' }, { code: 'IL', name: 'Israel' }, { code: 'IT', name: 'Italy' },
    { code: 'JP', name: 'Japan' }, { code: 'JO', name: 'Jordan' }, { code: 'KZ', name: 'Kazakhstan' },
    { code: 'KE', name: 'Kenya' }, { code: 'KP', name: 'North Korea' }, { code: 'KR', name: 'South Korea' },
    { code: 'KW', name: 'Kuwait' }, { code: 'LB', name: 'Lebanon' }, { code: 'LY', name: 'Libya' },
    { code: 'MY', name: 'Malaysia' }, { code: 'MX', name: 'Mexico' }, { code: 'MA', name: 'Morocco' },
    { code: 'MM', name: 'Myanmar' }, { code: 'NP', name: 'Nepal' }, { code: 'NL', name: 'Netherlands' },
    { code: 'NZ', name: 'New Zealand' }, { code: 'NG', name: 'Nigeria' }, { code: 'NO', name: 'Norway' },
    { code: 'PK', name: 'Pakistan' }, { code: 'PH', name: 'Philippines' }, { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' }, { code: 'QA', name: 'Qatar' }, { code: 'RO', name: 'Romania' },
    { code: 'RU', name: 'Russia' }, { code: 'SA', name: 'Saudi Arabia' }, { code: 'SN', name: 'Senegal' },
    { code: 'SG', name: 'Singapore' }, { code: 'ZA', name: 'South Africa' }, { code: 'ES', name: 'Spain' },
    { code: 'SD', name: 'Sudan' }, { code: 'SE', name: 'Sweden' }, { code: 'CH', name: 'Switzerland' },
    { code: 'SY', name: 'Syria' }, { code: 'TW', name: 'Taiwan' }, { code: 'TH', name: 'Thailand' },
    { code: 'TN', name: 'Tunisia' }, { code: 'TR', name: 'Turkey' }, { code: 'UA', name: 'Ukraine' },
    { code: 'AE', name: 'United Arab Emirates' }, { code: 'GB', name: 'United Kingdom' },
    { code: 'US', name: 'United States' }, { code: 'UZ', name: 'Uzbekistan' }, { code: 'VE', name: 'Venezuela' },
    { code: 'VN', name: 'Vietnam' }, { code: 'YE', name: 'Yemen' }, { code: 'ZW', name: 'Zimbabwe' },
];

const GeoBlocking = () => {
    const { currentUser } = useAuth();
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [countrySearch, setCountrySearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => { fetchBlocks(); }, []);

    const fetchBlocks = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('geo_blocks')
            .select('*, blocked_by_admin:profiles!geo_blocks_blocked_by_fkey(username, email)')
            .order('created_at', { ascending: false });

        if (!error) setBlocks(data || []);
        setLoading(false);
    };

    const logAdminAction = async (actionType, reason, details = {}) => {
        try {
            await supabase.from('admin_action_logs').insert({
                admin_id: currentUser?.id,
                admin_email: currentUser?.email,
                action_type: actionType,
                target_entity_type: 'geo_block',
                reason,
                details,
            });
        } catch (e) { console.warn('Could not log admin action', e); }
    };

    const addBlock = async () => {
        if (!selectedCountry) { toast.error('Select a country'); return; }
        if (!reason.trim()) { toast.error('Enter a reason (e.g. GDPR compliance)'); return; }
        setSaving(true);
        try {
            const country = ALL_COUNTRIES.find(c => c.code === selectedCountry);
            const { error } = await supabase.from('geo_blocks').upsert({
                country_code: selectedCountry,
                country_name: country?.name || selectedCountry,
                reason: reason.trim(),
                blocked_by: currentUser?.id,
                is_active: true,
            }, { onConflict: 'country_code' });

            if (error) throw error;
            await logAdminAction('add_geo_block', reason, { country_code: selectedCountry, country_name: country?.name });
            toast.success(`${country?.name} blocked successfully`);
            setShowForm(false);
            setSelectedCountry('');
            setReason('');
            fetchBlocks();
        } catch (err) {
            toast.error('Failed to add geo block');
        }
        setSaving(false);
    };

    const toggleBlock = async (block) => {
        const { error } = await supabase
            .from('geo_blocks')
            .update({ is_active: !block.is_active })
            .eq('id', block.id);

        if (!error) {
            await logAdminAction(block.is_active ? 'disable_geo_block' : 'enable_geo_block', `Toggled geo block for ${block.country_name}`, { country_code: block.country_code });
            toast.success(`${block.country_name} ${block.is_active ? 'unblocked' : 'reblocked'}`);
            fetchBlocks();
        }
    };

    const removeBlock = async (block) => {
        const { error } = await supabase.from('geo_blocks').delete().eq('id', block.id);
        if (!error) {
            await logAdminAction('remove_geo_block', `Removed geo block for ${block.country_name}`, { country_code: block.country_code });
            toast.success(`${block.country_name} removed from block list`);
            fetchBlocks();
        }
    };

    const filteredCountries = ALL_COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.code.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const filteredBlocks = blocks.filter(b =>
        b.country_name.toLowerCase().includes(search.toLowerCase()) ||
        b.country_code.toLowerCase().includes(search.toLowerCase())
    );

    // Pagination Logic
    const { paginatedBlocks, totalPages } = React.useMemo(() => {
        const total = filteredBlocks.length;
        const pages = Math.ceil(total / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const sliced = filteredBlocks.slice(start, start + itemsPerPage);
        return { paginatedBlocks: sliced, totalPages: pages };
    }, [filteredBlocks, currentPage, itemsPerPage]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    return (
        <div className="p-10 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Geo-Blocking</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Block countries for legal compliance (GDPR, etc.)</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search blocked countries..." className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none w-56" />
                    </div>
                    <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95">
                        <Plus size={16} /> Block Country
                    </button>
                    <button onClick={fetchBlocks} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Add Block Form */}
            {showForm && (
                <div className="bg-white rounded-[32px] border border-indigo-200 p-8 mb-8 shadow-sm">
                    <h3 className="text-lg font-black text-slate-800 mb-6">Block a Country</h3>

                    {/* Quick select */}
                    <div className="mb-4">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Common Blocks</div>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_COUNTRIES.map(c => (
                                <button key={c.code} onClick={() => setSelectedCountry(c.code)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${selectedCountry === c.code ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Country</label>
                            <input value={countrySearch} onChange={e => setCountrySearch(e.target.value)} placeholder="Search country..." className="w-full mb-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                            <select
                                value={selectedCountry}
                                onChange={e => setSelectedCountry(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 h-32"
                                size={5}
                            >
                                {filteredCountries.map(c => (
                                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Reason</label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="e.g. GDPR compliance requirement, Sanctions compliance, Legal restriction..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none resize-none h-[120px] focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                        <button onClick={addBlock} disabled={saving} className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50">
                            <Shield size={14} /> Confirm Block
                        </button>
                        <button onClick={() => { setShowForm(false); setSelectedCountry(''); setReason(''); }} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Blocked Countries */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="py-20 text-center bg-white rounded-[32px] border border-slate-100">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Loading...</p>
                    </div>
                ) : paginatedBlocks.length === 0 ? (
                    <div className="py-20 text-center bg-white rounded-[32px] border border-slate-100">
                        <Globe size={48} className="text-green-300 mx-auto mb-4" />
                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No countries blocked</p>
                        <p className="text-slate-300 text-xs mt-2">All countries can access the platform</p>
                    </div>
                ) : paginatedBlocks.map(block => (
                    <div key={block.id} className={`bg-white rounded-[24px] border p-6 flex items-center gap-6 shadow-sm transition-all ${block.is_active ? 'border-red-200 hover:shadow-red-100' : 'border-slate-200 opacity-60'}`}>
                        <div className="text-3xl shrink-0">🌍</div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="font-black text-slate-800">{block.country_name}</span>
                                <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">{block.country_code}</span>
                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black ${block.is_active ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {block.is_active ? 'ACTIVE' : 'DISABLED'}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium">{block.reason}</p>
                            <p className="text-[10px] text-slate-300 font-bold mt-1 uppercase tracking-widest">
                                Blocked by {block.blocked_by_admin?.username || block.blocked_by_admin?.email || 'Admin'} • {new Date(block.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => toggleBlock(block)}
                                className={`py-2 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${block.is_active ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                            >
                                {block.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                                onClick={() => removeBlock(block)}
                                className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            {!loading && filteredBlocks.length > 0 && (
                <div className="px-8 py-5 bg-white border border-slate-200 mt-6 rounded-[28px] flex items-center justify-between shadow-sm">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Showing {Math.min(filteredBlocks.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredBlocks.length, currentPage * itemsPerPage)} of {filteredBlocks.length} records
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-all shadow-sm"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex items-center gap-1">
                            {[...Array(totalPages)].map((_, i) => {
                                const page = i + 1;
                                if (totalPages > 7 && Math.abs(page - currentPage) > 2 && page !== 1 && page !== totalPages) {
                                    if (Math.abs(page - currentPage) === 3) return <span key={page} className="px-2 text-slate-300">...</span>;
                                    return null;
                                }
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${currentPage === page ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-all shadow-sm"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Info Banner */}
            <div className="mt-8 p-6 bg-indigo-50 border border-indigo-200 rounded-[24px]">
                <div className="flex items-start gap-4">
                    <AlertTriangle size={20} className="text-indigo-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-black text-indigo-700 mb-1">How Geo-blocking Works</p>
                        <p className="text-xs text-indigo-500 font-medium">Users from blocked countries will be prevented from joining the matchmaking queue. This is enforced at the server level during the matchmaking process. Existing sessions will not be affected immediately.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeoBlocking;
