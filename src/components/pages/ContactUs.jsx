import React, { useState } from 'react';
import SEO from '../SEO';

import { supabase } from '../../supabase';
import toast from 'react-hot-toast';

const ContactUs = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('contact_messages').insert([{
                name: formData.name,
                email: formData.email,
                subject: formData.subject,
                message: formData.message
            }]);

            if (error) throw error;

            toast.success("Thank you for your message! We'll get back to you soon.");
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error) {
            console.error("Error submitting contact form:", error);
            toast.error("Failed to send message. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 text-white pt-24 pb-12 px-4 md:px-8">
            <SEO
                title="Contact Strangy — Support, Partnerships & Creator Help"
                description="Contact the Strangy team for support, creator inquiries, partnerships or media. We typically respond within 24 hours. Reach us at support.strangy@gmail.com."
                canonical="https://strangy.in/contact"
                ogImage="https://strangy.in/og-contact.jpg"
            />

            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-600 mb-8 text-center text-gradient">
                    Contact Us
                </h1>

                <div className="grid md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-dark-800 p-6 rounded-2xl border border-white/10 text-center">
                        <div className="text-2xl mb-2">📧</div>
                        <h3 className="font-bold mb-1">Email</h3>
                        <a href="mailto:support.strangy@gmail.com" className="text-sm text-purple-400">support.strangy@gmail.com</a>
                    </div>
                    <div className="bg-dark-800 p-6 rounded-2xl border border-white/10 text-center">
                        <div className="text-2xl mb-2">🌐</div>
                        <h3 className="font-bold mb-1">Social</h3>
                        <p className="text-sm text-gray-400">@StrangyApp</p>
                    </div>
                    <div className="bg-dark-800 p-6 rounded-2xl border border-white/10 text-center">
                        <div className="text-2xl mb-2">📍</div>
                        <h3 className="font-bold mb-1">Location</h3>
                        <p className="text-sm text-gray-400">Global Connectivity</p>
                    </div>
                </div>

                <div className="bg-dark-800 p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                                    placeholder="Your Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                                <input 
                                    type="email" 
                                    required
                                    className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                                    placeholder="your@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Subject</label>
                            <input 
                                type="text" 
                                required
                                className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                                placeholder="How can we help?"
                                value={formData.subject}
                                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Message</label>
                            <textarea 
                                required
                                rows="5"
                                className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                                placeholder="Tell us more..."
                                value={formData.message}
                                onChange={(e) => setFormData({...formData, message: e.target.value})}
                            ></textarea>
                        </div>
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold text-lg transition-all shadow-lg shadow-purple-500/20 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                        >
                            {isSubmitting ? 'Sending...' : 'Send Message'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ContactUs;
