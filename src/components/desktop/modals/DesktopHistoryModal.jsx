import React from 'react';

const DesktopHistoryModal = ({ onClose }) => {
    // Mock history data based on screenshot
    const historyData = [
        {
            id: 1,
            name: "Harsh Sanatni 😇",
            location: "Prayagraj",
            time: "02/16/2026 10:34PM",
            duration: "00:06",
            avatar: "H",
            avatarColor: "bg-blue-500",
            hasRecording: true
        },
        {
            id: 2,
            name: "Naveen Rajput 😇",
            location: "Rohtak",
            time: "02/16/2026 10:33PM",
            duration: "00:06",
            avatar: "N",
            avatarColor: "bg-green-500",
            hasRecording: true
        },
        {
            id: 3,
            name: "M.J. K 😇",
            location: "Prayagraj",
            time: "02/16/2026 10:12PM",
            duration: "00:01",
            avatar: "M",
            avatarColor: "bg-orange-500",
            hasRecording: false
        },
        {
            id: 4,
            name: "Krishna Linda 😇",
            location: "Jammu",
            time: "02/16/2026 10:12PM",
            duration: "00:22",
            avatar: "K",
            avatarColor: "bg-red-500",
            hasRecording: false
        }
    ];

    return (
        <div className="bg-[#24213a] w-[450px] max-h-[700px] rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-white/5">
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-white/5">
                <h2 className="text-white text-xl font-bold w-full text-center">Match History</h2>
                <button onClick={onClose} className="absolute right-6 text-white/60 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                {historyData.map((item) => (
                    <div key={item.id} className="bg-[#1a172e] rounded-3xl p-4 border border-white/5 hover:border-white/10 transition-all group">
                        {/* Top Info */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium">
                                <span>{item.time}</span>
                                {item.hasRecording && (
                                    <div className="flex items-center gap-1">
                                        <span>📹</span>
                                        <span>{item.duration}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="w-7 h-7 rounded-full bg-[#ff2d55]/20 flex items-center justify-center text-[10px] text-[#ff2d55] border border-[#ff2d55]/30">
                                    👮
                                </button>
                                <button className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-white/40 border border-white/10 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                                    🗑️
                                </button>
                            </div>
                        </div>

                        {/* User Profile */}
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg ${item.avatarColor}`}>
                                    {item.avatar}
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-lg">{item.name}</h4>
                                    <div className="flex items-center gap-1 text-white/40 text-xs mt-0.5">
                                        <span>📍</span>
                                        <span>{item.location}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-2xl shadow-lg shadow-yellow-400/20 transform hover:scale-110 active:scale-95 transition-all">
                                💌
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DesktopHistoryModal;
