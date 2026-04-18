import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../../supabase';
import { Calendar, ChevronLeft, Tag, Share2, Clock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const BlogDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('blogs')
                    .select('*')
                    .eq('slug', slug)
                    .eq('is_published', true)
                    .single();

                if (error) throw error;
                if (!data) throw new Error("Blog not found");
                
                setBlog(data);
            } catch (err) {
                console.error('Error fetching blog:', err);
                setError('Blog post not found.');
            } finally {
                setLoading(false);
            }
        };

        fetchBlog();
    }, [slug]);

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: blog.title,
                text: blog.short_description,
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied to clipboard!");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-900 pt-32 pb-20 px-6 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-t-accent-purple border-white/10 animate-spin mb-4"></div>
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs animate-pulse">Fetching Story...</p>
            </div>
        );
    }

    if (error || !blog) {
        return (
            <div className="min-h-screen bg-dark-900 pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center">
                <div className="text-8xl mb-6 opacity-20">🔍</div>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter">Story not found</h1>
                <p className="text-white/60 mb-8 max-w-md font-medium">{error || "The article you are looking for might have been moved or deleted."}</p>
                <button 
                    onClick={() => navigate('/blog')}
                    className="group px-8 py-4 bg-white/5 hover:bg-accent-purple text-white font-black rounded-2xl transition-all flex items-center gap-3 border border-white/10 uppercase tracking-widest text-xs"
                >
                    <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Blog
                </button>
            </div>
        );
    }

    // Estimate reading time
    const wordsPerMinute = 200;
    const wordCount = blog.content.split(/\s+/g).length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);

    return (
        <div className="min-h-screen bg-dark-900 pt-24 pb-32 px-6 relative">
            <Helmet>
                <title>{blog.title} | Strangy Blog</title>
                <meta name="description" content={blog.meta_description || blog.short_description} />
                <meta name="keywords" content={blog.tags ? blog.tags.join(', ') : 'video chat, online privacy, social tips'} />
                
                {/* Open Graph / Social */}
                <meta property="og:type" content="article" />
                <meta property="og:title" content={blog.title} />
                <meta property="og:description" content={blog.short_description} />
                <meta property="og:image" content={blog.thumbnail_url} />
                <meta property="og:url" content={window.location.href} />
                <meta name="twitter:card" content="summary_large_image" />
            </Helmet>

            {/* Premium Background Effects */}
            <div className="absolute top-0 inset-x-0 h-[60vh] bg-gradient-to-b from-accent-purple/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-40 -left-64 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-[150px] pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                
                <button 
                    onClick={() => navigate('/blog')}
                    className="inline-flex items-center text-white/30 hover:text-accent-purple mb-12 transition-all text-[10px] font-black uppercase tracking-[0.2em] group"
                >
                    <ChevronLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to all stories
                </button>

                {/* Header */}
                <div className="mb-12">
                    <div className="flex flex-wrap items-center gap-3 mb-8">
                        {blog.tags && blog.tags.map((tag, idx) => (
                            <span key={idx} className="flex items-center text-[10px] font-black text-white uppercase tracking-widest bg-accent-purple px-3 py-1.5 rounded-full shadow-lg shadow-accent-purple/20">
                                {tag}
                            </span>
                        ))}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-white/40 text-[10px] uppercase font-black tracking-widest">
                            <Clock size={12} className="text-accent-purple" />
                            {readingTime} min read
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase tracking-tighter mb-8 leading-[1] drop-shadow-2xl">
                        {blog.title}
                    </h1>

                    <div className="flex items-center justify-between flex-wrap gap-6 border-y border-white/5 py-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-purple to-pink-500 flex items-center justify-center text-white font-black shadow-xl shrink-0">
                                S
                            </div>
                            <div>
                                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-0.5">Written by</p>
                                <p className="text-sm text-white font-bold uppercase tracking-tight">Strangy Editorial</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-0.5">Published</p>
                                <p className="text-sm text-white/60 font-medium">{new Date(blog.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            <button 
                                onClick={handleShare}
                                className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all border border-white/5 shadow-xl group"
                            >
                                <Share2 size={20} className="group-hover:scale-110 transition-transform text-accent-purple" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Thumbnail */}
                {blog.thumbnail_url && (
                    <div className="w-full aspect-[21/10] rounded-[40px] overflow-hidden mb-16 border border-white/10 shadow-2xl relative group">
                        <img 
                            src={blog.thumbnail_url} 
                            alt={blog.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent opacity-60" />
                    </div>
                )}

                {/* Content */}
                <div className="bg-white/[0.02] backdrop-blur-3xl p-8 md:p-16 rounded-[40px] border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/5 blur-[100px] rounded-full pointer-events-none transition-transform group-hover:scale-150 duration-700" />
                    
                    {/* Inject custom CSS just for blog content to ensure formatting */}
                    <style dangerouslySetInnerHTML={{__html: `
                        .blog-content { font-family: 'Inter', sans-serif; }
                        .blog-content h1, .blog-content h2, .blog-content h3 { color: white; font-weight: 900; margin-top: 2em; margin-bottom: 0.8em; text-transform: uppercase; letter-spacing: -0.02em; line-height: 1.2; }
                        .blog-content h2 { font-size: 2.25rem; border-left: 4px solid #8A2BE2; padding-left: 1rem; }
                        .blog-content h3 { font-size: 1.75rem; color: rgba(255,255,255,0.9); }
                        .blog-content p { color: rgba(255, 255, 255, 0.7); line-height: 2; margin-bottom: 2em; font-size: 1.15rem; font-weight: 400; }
                        .blog-content a { color: #8A2BE2; font-weight: 700; text-decoration: none; border-bottom: 2px solid rgba(138, 43, 226, 0.2); transition: all 0.3s; }
                        .blog-content a:hover { border-bottom-color: #8A2BE2; background: rgba(138, 43, 226, 0.1); }
                        .blog-content ul, .blog-content ol { color: rgba(255, 255, 255, 0.7); margin-left: 1.5em; margin-bottom: 2.5em; list-style-type: none; }
                        .blog-content li { margin-bottom: 1rem; line-height: 1.8; position: relative; padding-left: 1.5rem; }
                        .blog-content ul li::before { content: "→"; position: absolute; left: 0; color: #8A2BE2; font-weight: 900; }
                        .blog-content blockquote { border-left: 8px solid #8A2BE2; padding: 2.5rem; color: white; font-style: normal; background: rgba(255,255,255,0.03); border-radius: 0 32px 32px 0; margin: 3em 0; font-size: 1.25rem; font-weight: 700; line-height: 1.6; }
                        .blog-content img { max-width: 100%; height: auto; border-radius: 32px; margin: 3.5em 0; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
                        .blog-content strong { color: white; font-weight: 800; }
                        .blog-content .ql-video { width: 100%; aspect-ratio: 16/9; border-radius: 32px; margin: 3em 0; border: 1px solid rgba(255,255,255,0.1); }
                    `}} />
                    
                    <div 
                        className="blog-content prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: blog.content }} 
                    />

                    {/* Footer CTA */}
                    <div className="mt-20 pt-12 border-t border-white/5 flex flex-col items-center text-center">
                        <div className="w-16 h-1 w-1 rounded-full bg-accent-purple mb-8 opacity-20" />
                        <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Enjoyed this story?</h4>
                        <p className="text-white/40 mb-10 max-w-sm font-medium">Join thousands of users discovering global connections every day on Strangy.</p>
                        <button 
                            onClick={() => navigate('/chat')}
                            className="px-10 py-5 bg-accent-purple hover:bg-accent-purple/80 text-white font-black rounded-[20px] transition-all flex items-center gap-4 shadow-2xl shadow-accent-purple/30 group"
                        >
                            START VIDEO CHAT
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
                
            </div>
        </div>
    );
};

export default BlogDetail;
