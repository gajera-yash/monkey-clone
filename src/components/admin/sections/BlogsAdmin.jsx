import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../supabase';
import { Plus, Edit2, Trash2, Check, X, Image as ImageIcon, Search, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const BlogsAdmin = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Form State
    const [isEditing, setIsEditing] = useState(false);

    const [currentBlog, setCurrentBlog] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        short_description: '',
        meta_description: '',
        content: '',
        tags: [],
        is_published: true,
        thumbnail_url: ''
    });
    const [uploadingImage, setUploadingImage] = useState(false);
    const [localPreview, setLocalPreview] = useState('');
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('blogs')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            toast.error("Failed to load blogs");
            console.error(error);
        } else {
            setBlogs(data || []);
        }
        setLoading(false);
    };

    const handleOpenForm = (blog = null) => {
        setLocalPreview(''); // Clear local preview when opening form
        if (blog) {
            setCurrentBlog(blog);
            setFormData({
                title: blog.title,
                slug: blog.slug || '',
                short_description: blog.short_description || '',
                meta_description: blog.meta_description || '',
                content: blog.content || '',
                tags: blog.tags || [],
                is_published: blog.is_published || false,
                thumbnail_url: blog.thumbnail_url || ''
            });
        } else {
            setCurrentBlog(null);
            setFormData({
                title: '',
                slug: '',
                short_description: '',
                meta_description: '',
                content: '',
                tags: [],
                is_published: true,
                thumbnail_url: ''
            });
        }
        setTagInput('');
        setIsEditing(true);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset file input immediately so it can be re-used
        const fileInput = e.target;

        if (file.size > 10 * 1024 * 1024) {
            toast.error("File is too large (>10MB).");
            return;
        }

        const loadingToast = toast.loading("Optimizing image...");
        setUploadingImage(true);

        // Instant Local Preview
        const objectUrl = URL.createObjectURL(file);
        setLocalPreview(objectUrl);

        try {
            // 0. Check Supabase auth session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Not authenticated. Please log in again.');
            }

            // 1. Load image into memory
            const image = new window.Image();
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = () => reject(new Error('Failed to load image file'));
                image.src = objectUrl;
            });

            // 2. Resize for compression
            const MAX_SIZE = 800;
            let { width, height } = image;
            if (width > height && width > MAX_SIZE) { height = Math.round(height * MAX_SIZE / width); width = MAX_SIZE; }
            else if (height > width && height > MAX_SIZE) { width = Math.round(width * MAX_SIZE / height); height = MAX_SIZE; }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(image, 0, 0, width, height);

            // 3. Convert to Blob
            const compressedBlob = await new Promise((resolve, reject) => {
                canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Image compression failed.')), 'image/jpeg', 0.75);
            });

            URL.revokeObjectURL(objectUrl);
            console.log(`[Upload] Size: ${(compressedBlob.size / 1024).toFixed(1)}KB`);
            toast.loading('Uploading to storage...', { id: loadingToast });

            // 4. Upload to Supabase
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('blogs')
                .upload(fileName, compressedBlob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });

            if (uploadError) {
                console.error('[Upload] Error:', uploadError);
                throw new Error(`Upload error: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabase.storage.from('blogs').getPublicUrl(fileName);
            console.log('[Upload] Success:', publicUrl);
            setFormData(prev => ({ ...prev, thumbnail_url: publicUrl }));
            toast.success('Image uploaded!', { id: loadingToast });
        } catch (error) {
            console.error('[Upload] Failed:', error);
            setLocalPreview(''); // Clear broken preview
            toast.error(error.message, { id: loadingToast });
        } finally {
            setUploadingImage(false);
            fileInput.value = ''; // Use saved reference, not event
        }
    };

    // Auto-generate slug from title
    const handleTitleChange = (e) => {
        const title = e.target.value;
        const slug = title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special chars
            .replace(/[\s_-]+/g, '-')  // Replace spaces/underscores with -
            .replace(/^-+|-+$/g, '');   // Trim - from ends
        setFormData(prev => ({ ...prev, title, slug: !currentBlog ? slug : prev.slug }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title || !formData.slug || !formData.content) {
            toast.error("Please fill in all required fields.");
            return;
        }

        const payload = {
            title: formData.title,
            slug: formData.slug,
            short_description: formData.short_description,
            meta_description: formData.meta_description,
            content: formData.content,
            tags: formData.tags,
            is_published: formData.is_published,
            thumbnail_url: formData.thumbnail_url || null,
        };

        try {
            console.log("[BlogsAdmin] Payload:", payload, "| Blog ID:", currentBlog?.id);

            if (currentBlog) {
                const { error } = await supabase
                    .from('blogs')
                    .update({ ...payload, updated_at: new Date().toISOString() })
                    .eq('id', currentBlog.id);
                if (error) throw new Error(`Update failed: ${error.message}`);
                toast.success("Blog post updated!");
            } else {
                const { error } = await supabase
                    .from('blogs')
                    .insert([{ ...payload, created_at: new Date().toISOString() }]);
                if (error) throw new Error(`Publish failed: ${error.message}`);
                toast.success("New blog post published!");
            }
            setIsEditing(false);
            setLocalPreview('');
            fetchBlogs();
        } catch (error) {
            console.error("[BlogsAdmin] Error:", error);
            toast.error(error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this article forever? This action cannot be undone.")) return;
        
        try {
            const { error } = await supabase.from('blogs').delete().eq('id', id);
            
            if (error) {
                console.error("[BlogsAdmin] Delete failed:", error);
                throw new Error(`Delete failed: ${error.message}`);
            }
            
            toast.success("Article deleted successfully");
            fetchBlogs();
        } catch (error) {
            console.error("[BlogsAdmin] Delete Error:", error);
            toast.error(error.message || "Failed to delete blog. Check permissions.");
        }
    };

    // Quill Editor Configuration
    const quillModules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['blockquote', 'code-block'],
                ['link', 'image', 'video'],
                [{ 'align': [] }],
                ['clean']
            ]
        },
        clipboard: {
            matchVisual: false
        }
    }), []);

    const quillFormats = [
        'header', 'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet', 'blockquote', 'code-block',
        'link', 'image', 'video', 'align'
    ];

    const handleAddTag = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tag = tagInput.trim().toLowerCase();
            if (tag && !formData.tags.includes(tag)) {
                setFormData(prev => ({
                    ...prev,
                    tags: [...prev.tags, tag]
                }));
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(t => t !== tagToRemove)
        }));
    };

    const filteredBlogs = blogs.filter(b => 
        b.title.toLowerCase().includes(search.toLowerCase()) || 
        b.slug.toLowerCase().includes(search.toLowerCase())
    );

    if (isEditing) {
        return (
            <div className="p-8 pb-32 max-w-6xl mx-auto text-slate-800 animate-fade-in">
                <style dangerouslySetInnerHTML={{__html: `
                    .blog-quill-editor .ql-container { border: none !important; font-size: 15px; font-family: inherit; }
                    .blog-quill-editor .ql-toolbar { border: none !important; border-bottom: 2px solid #f1f5f9 !important; background: #fafbfc; padding: 12px 16px !important; border-radius: 24px 24px 0 0; }
                    .blog-quill-editor .ql-toolbar .ql-formats { margin-right: 12px; }
                    .blog-quill-editor .ql-editor { min-height: 450px; padding: 24px; line-height: 1.8; color: #334155; }
                    .blog-quill-editor .ql-editor h1 { font-size: 2rem; font-weight: 800; margin: 1.2rem 0 0.6rem; color: #0f172a; }
                    .blog-quill-editor .ql-editor h2 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; color: #1e293b; }
                    .blog-quill-editor .ql-editor h3 { font-size: 1.25rem; font-weight: 700; margin: 0.8rem 0 0.4rem; color: #334155; }
                    .blog-quill-editor .ql-editor p { margin-bottom: 0.8rem; }
                    .blog-quill-editor .ql-editor ul, .blog-quill-editor .ql-editor ol { margin-bottom: 1rem; padding-left: 1.5rem; }
                    .blog-quill-editor .ql-editor blockquote { border-left: 4px solid #6366f1; padding: 12px 20px; margin: 1rem 0; background: #eef2ff; border-radius: 0 12px 12px 0; color: #4338ca; font-style: italic; }
                    .blog-quill-editor .ql-editor pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 12px; margin: 1rem 0; overflow-x: auto; }
                    .blog-quill-editor .ql-editor img { max-width: 100%; border-radius: 12px; margin: 1rem 0; }
                    .blog-quill-editor .ql-editor a { color: #6366f1; text-decoration: underline; }
                    .blog-quill-editor .ql-editor.ql-blank::before { color: #cbd5e1; font-style: italic; }
                    .blog-quill-editor .ql-snow .ql-picker { color: #64748b; font-weight: 600; }
                    .blog-quill-editor .ql-snow button { color: #64748b !important; }
                    .blog-quill-editor .ql-snow button:hover, .blog-quill-editor .ql-snow button.ql-active { color: #6366f1 !important; }
                    .blog-quill-editor .ql-snow .ql-stroke { stroke: #64748b; }
                    .blog-quill-editor .ql-snow button:hover .ql-stroke, .blog-quill-editor .ql-snow button.ql-active .ql-stroke { stroke: #6366f1; }
                    .blog-quill-editor .ql-snow .ql-fill { fill: #64748b; }
                    .blog-quill-editor .ql-snow button:hover .ql-fill, .blog-quill-editor .ql-snow button.ql-active .ql-fill { fill: #6366f1; }
                `}} />
                
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-3xl font-black uppercase text-slate-900 tracking-tighter">
                            {currentBlog ? 'Edit Story' : 'Create New Story'}
                        </h2>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                            {currentBlog ? `ID: ${currentBlog.id}` : 'Drafting original content'}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsEditing(false)}
                            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-black rounded-xl transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
                        >
                            <X size={14} /> Close
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-8 rounded-[32px] font-sans shadow-sm border border-slate-200 overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <label className="block text-xs font-black text-indigo-500 uppercase tracking-[2px]">Content Editor</label>
                                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Quill Rich Text</span>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Article Title</label>
                                    <input 
                                        type="text" required
                                        value={formData.title} onChange={handleTitleChange}
                                        className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl px-6 py-4 text-lg font-black outline-none transition-all placeholder:text-slate-300"
                                        placeholder="How to make global friends safely..."
                                    />
                                </div>
                                
                                <div className="min-h-[500px] flex flex-col">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Write Story</label>
                                    
                                    <div className="flex-1 bg-slate-50 rounded-2xl overflow-hidden border-2 border-slate-100 focus-within:border-indigo-500 transition-all blog-quill-editor">
                                        <ReactQuill
                                            theme="snow"
                                            value={formData.content}
                                            onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
                                            modules={quillModules}
                                            formats={quillFormats}
                                            placeholder="Start writing your story here..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
                            <label className="block text-xs font-black text-indigo-500 uppercase tracking-[2px] mb-6">Article Metadata</label>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">SEO Slug</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">/blog/</span>
                                        <input 
                                            type="text" required
                                            value={formData.slug} 
                                            onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '')})}
                                            className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl pl-16 pr-4 py-2.5 text-xs font-bold transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Short Excerpt</label>
                                    <textarea 
                                        required rows={4}
                                        value={formData.short_description} onChange={e => setFormData({...formData, short_description: e.target.value})}
                                        className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs font-semibold outline-none resize-none transition-all"
                                        placeholder="Brief summary for list view..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Thumbnail</label>
                                    <div className="space-y-3">
                                        {(localPreview || formData.thumbnail_url) && (
                                            <div className="aspect-video w-full rounded-2xl border-2 border-slate-100 overflow-hidden shadow-inner bg-slate-50 relative">
                                                <img src={localPreview || formData.thumbnail_url} alt="Preview" className="w-full h-full object-cover" />
                                                {localPreview && uploadingImage && (
                                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                                        <div className="w-8 h-8 border-4 border-t-white border-white/20 rounded-full animate-spin"></div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="relative group">
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                disabled={uploadingImage}
                                            />
                                            <div className="w-full border-2 border-dashed border-slate-200 rounded-2xl px-4 py-4 text-[10px] text-slate-500 text-center font-black uppercase tracking-widest bg-slate-50 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all flex items-center justify-center">
                                                <ImageIcon size={16} className="mr-2 text-indigo-500" />
                                                {uploadingImage ? 'Uploading...' : 'Choose Image'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category Tags</label>
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                            {formData.tags.map(tag => (
                                                <span 
                                                    key={tag} 
                                                    className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-100 group/tag"
                                                >
                                                    {tag}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveTag(tag)}
                                                        className="hover:bg-indigo-200 p-0.5 rounded-full transition-colors text-indigo-400 hover:text-indigo-700"
                                                    >
                                                        <X size={10} strokeWidth={4}/>
                                                    </button>
                                                </span>
                                            ))}
                                            {formData.tags.length === 0 && (
                                                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest px-1 italic">No tags added yet</span>
                                            )}
                                        </div>
                                        <input 
                                            type="text"
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={handleAddTag}
                                            className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs font-semibold outline-none transition-all"
                                            placeholder="Type and press Enter to add... (e.g. privacy, safety)"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-between bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                    <label htmlFor="is_published" className="text-xs font-black text-indigo-900 uppercase tracking-widest cursor-pointer">
                                        Visible to public
                                    </label>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            id="is_published"
                                            checked={formData.is_published}
                                            onChange={e => setFormData({...formData, is_published: e.target.checked})}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                        >
                            <Check size={20} /> {currentBlog ? 'Save Changes' : 'Publish Article'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="p-10 text-[#1E293B] animate-fade-in">
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[3px] mb-2 block px-1">Content Strategy</span>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Articles & Stories</h1>
                    <p className="text-sm text-slate-400 font-bold mt-1 max-w-md">Manage your organic growth engine. High-quality content drives global connections.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find an article..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-12 pr-6 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all w-80 placeholder:text-slate-300"
                        />
                    </div>
                    <button 
                        onClick={() => handleOpenForm()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-2 uppercase tracking-widest text-xs"
                    >
                        <Plus size={18} /> New Story
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-32 bg-white rounded-[40px] border-2 border-slate-50 border-dashed">
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Indexing Content...</p>
                </div>
            ) : (
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden outline outline-4 outline-slate-100/50">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                            <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-10 py-6">Article Details</th>
                                    <th className="px-8 py-6">Reach & Status</th>
                                    <th className="px-8 py-6">Published Date</th>
                                    <th className="px-10 py-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredBlogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-10 py-24 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
                                                    <BookOpen size={32} />
                                                </div>
                                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No matching stories found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredBlogs.map((blog) => (
                                    <tr key={blog.id} className="hover:bg-indigo-50/30 transition-all group cursor-default">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-5">
                                                <div className="w-20 h-14 rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-slate-50 shrink-0 relative group-hover:scale-110 transition-transform duration-500">
                                                    {blog.thumbnail_url ? (
                                                        <img src={blog.thumbnail_url} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={20}/></div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-900 text-sm truncate uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{blog.title}</p>
                                                    <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">/blog/{blog.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase mb-1 inline-block w-fit shadow-sm ${blog.is_published ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                        {blog.is_published ? 'LIVE' : 'DRAFT'}
                                                    </span>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">{blog.views || 0} Total Views</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-slate-800 text-xs font-bold">{new Date(blog.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Uploaded at {new Date(blog.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => window.open(`/blog/${blog.slug}`, '_blank')}
                                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md"
                                                    title="View Public"
                                                >
                                                    <Search size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenForm(blog)}
                                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md"
                                                    title="Edit Post"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(blog.id)}
                                                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                    title="Delete Post"
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
            )}
        </div>
    );
};

export default BlogsAdmin;
