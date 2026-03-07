import React, { useState } from 'react';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-white/10 last:border-0">
            <button
                className="w-full py-6 flex justify-between items-center text-left focus:outline-none group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-lg font-semibold text-gray-200 group-hover:text-accent-purple transition-colors duration-200">
                    {question}
                </span>
                <span className={`transform transition-transform duration-300 text-accent-purple ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mb-6' : 'max-h-0 opacity-0'
                    }`}
            >
                <p className="text-gray-400 leading-relaxed">
                    {answer}
                </p>
            </div>
        </div>
    );
};

const FAQ = () => {
    const faqs = [
        {
            question: "What Is Strangy?",
            answer: "Strangy is a next-generation video chat platform that randomly pairs you with people from around the world for spontaneous conversations."
        },
        {
            question: "Is It Free to Use?",
            answer: "Yes, the core features of Strangy are completely free. We also offer premium features for users who want enhanced matching options."
        },
        {
            question: "How Do I Start a Chat?",
            answer: "Simply click the 'Start Chatting' button on the homepage, allow camera and microphone permissions, and you'll be connected instantly!"
        },
        {
            question: "Is It Safe?",
            answer: "We prioritize user safety. We have active moderation, reporting tools, and the ability to instantly skip to the next person if you feel uncomfortable."
        },
        {
            question: "Is It Available on Mobile and Desktop?",
            answer: "Yes! Strangy is fully responsive and works seamlessly on both web browsers and mobile devices."
        }
    ];

    return (
        <section id="faq" className="py-20 bg-dark-900 border-t border-white/10 relative overflow-hidden">
            {/* Background Details */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="max-w-4xl mx-auto px-4 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Frequently Asked Questions</h2>
                    <p className="text-gray-400">Everything you need to know about Strangy.</p>
                </div>

                <div className="glass-card px-8 py-4">
                    {faqs.map((faq, index) => (
                        <FAQItem key={index} question={faq.question} answer={faq.answer} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
