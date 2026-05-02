import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../SEO';
import { supabase } from '../../supabase';

import { Calendar, ChevronRight, Tag, BookOpen, Clock } from 'lucide-react';

const BlogList = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('blogs')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBlogs(data || []);
        } catch (err) {
            console.error('Error fetching blogs:', err);
            setError('Failed to load blogs. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-900 pt-32 pb-20 px-6 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-t-accent-purple border-white/10 animate-spin mb-4"></div>
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Articles...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 pt-32 pb-32 px-6 relative overflow-hidden">
            <SEO
                title="Strangy Blog — Tips, Guides & News for Video Chat India"
                description="Read Strangy's blog for tips on random video chat, creator earnings, online safety & more. India's live chat community resource hub."
                canonical="https://strangy.in/blog"
                ogImage="https://strangy.in/og-blog.jpg"
            />

            {/* Premium Background Effects */}
            <div className="absolute top-0 inset-x-0 h-[50vh] bg-gradient-to-b from-accent-purple/10 via-accent-purple/5 to-transparent pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute top-1/2 -left-48 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter mb-4">
                        Strangy <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-purple to-pink-500">Blog</span>
                    </h1>
                    <p className="text-lg text-white/60 max-w-2xl mx-auto">
                        Latest updates, tips for better video chats, safety features, and everything else about Strangy!
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-center mb-8">
                        {error}
                    </div>
                )}

                {blogs.length === 0 && !error ? (
                    <div className="text-center py-20 bg-dark-800/10 backdrop-blur-xl rounded-[40px] border border-white/5 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="text-8xl mb-6 grayscale opacity-30 drop-shadow-2xl">✍️</div>
                        <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">No stories yet</h3>
                        <p className="text-white/40 max-w-sm mx-auto font-medium">We're currently crafting some amazing content. Stay tuned!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {blogs.map((blog) => (
                            <Link 
                                to={`/blog/${blog.slug}`} 
                                key={blog.id}
                                className="group bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[32px] overflow-hidden hover:border-accent-purple/30 hover:bg-white/[0.04] transition-all duration-500 flex flex-col hover:-translate-y-2 shadow-2xl shadow-black/50"
                            >
                                <div className="aspect-[16/10] w-full overflow-hidden relative">
                                    <img 
                                        src={blog.thumbnail_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'} 
                                        alt={blog.title} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/20 to-transparent opacity-90" />
                                    
                                    <div className="absolute top-4 left-4">
                                        {blog.tags && blog.tags.length > 0 && (
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-accent-purple px-3 py-1.5 rounded-full shadow-lg shadow-accent-purple/20">
                                                {blog.tags[0]}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="absolute bottom-4 left-6 flex items-center text-white/50 text-[10px] uppercase font-black tracking-widest">
                                        <Calendar size={12} className="mr-1.5 text-accent-purple" />
                                        {new Date(blog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                </div>
                                
                                <div className="p-8 flex flex-col flex-1">
                                    <h3 className="text-2xl font-black text-white mb-4 group-hover:text-accent-purple transition-colors leading-tight line-clamp-2 uppercase tracking-tighter">
                                        {blog.title}
                                    </h3>
                                    
                                    <p className="text-white/50 text-sm mb-8 line-clamp-3 flex-1 font-medium leading-relaxed">
                                        {blog.short_description}
                                    </p>
                                    
                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="flex items-center text-accent-purple font-black text-[11px] uppercase tracking-widest group-hover:gap-2 transition-all">
                                            Read Story
                                            <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                        <div className="flex items-center text-white/20">
                                            <BookOpen size={14} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlogList;
