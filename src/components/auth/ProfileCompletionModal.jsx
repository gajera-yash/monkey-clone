import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, User, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfileCompletionModal = ({ isOpen, user }) => {
    const { completeProfile } = useAuth();
    const [birthdate, setBirthdate] = useState('');
    const [gender, setGender] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const calculateAge = (dob) => {
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Submitting Profile Completion:", { birthdate, gender });

        if (!birthdate) {
            toast.error("Please enter your birthdate");
            return;
        }
        if (!gender) {
            toast.error("Please select your gender");
            return;
        }

        const age = calculateAge(birthdate);
        console.log("Calculated Age:", age);

        if (isNaN(age) || age < 18) {
            toast.error("You must be at least 18 years old to use this platform.", {
                icon: '🚫',
                style: { borderRadius: '10px', background: '#333', color: '#fff' }
            });
            return;
        }

        setLoading(true);
        try {
            await completeProfile(birthdate, gender);
        } catch (err) {
            console.error("Submission failed:", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#1a172e] w-full max-w-md rounded-[32px] border border-white/10 shadow-2xl shadow-indigo-500/20 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header Profile Section */}
                <div className="relative h-32 bg-gradient-to-br from-indigo-600 to-purple-700 p-8 flex justify-center">
                    <div className="absolute -bottom-10 w-24 h-24 rounded-3xl bg-[#1a172e] p-1 shadow-2xl">
                        <div className="w-full h-full rounded-[22px] bg-indigo-500/20 flex items-center justify-center text-3xl font-black text-white overflow-hidden border border-white/10">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                                user?.displayName?.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center border-4 border-[#1a172e] shadow-lg">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                        </div>
                    </div>
                </div>

                <div className="pt-14 pb-8 px-8 text-center">
                    <h2 className="text-xl font-black text-white tracking-tight">Complete Your Profile</h2>
                    <p className="text-white/50 text-xs font-medium mt-1 mb-8">Verification required for community safety</p>

                    <form onSubmit={handleSubmit} className="space-y-6 text-left">
                        {/* Name Preview (Read-only) */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Full Name</label>
                            <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-white/80 flex items-center gap-3">
                                <User size={16} className="text-indigo-400" />
                                {user?.displayName || 'Stranger'}
                            </div>
                        </div>

                        {/* Birthdate Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Date of Birth (18+)</label>
                            <div className="relative group">
                                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-400 transition-colors" size={16} />
                                <input
                                    type="date"
                                    value={birthdate}
                                    onChange={(e) => setBirthdate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none"
                                />
                            </div>
                        </div>

                        {/* Gender Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Gender</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setGender('Male')}
                                    className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
                                        gender === 'Male' 
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    Male
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGender('Female')}
                                    className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
                                        gender === 'Female' 
                                        ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-600/20' 
                                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    Female
                                </button>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-white text-[#1a172e] rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        Verify & Enter
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold text-white/20">
                        <AlertCircle size={12} />
                        <span>Information cannot be changed after verification</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileCompletionModal;
