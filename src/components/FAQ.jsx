import React, { useState } from 'react';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-200 last:border-0">
            <button
                className="w-full py-6 flex justify-between items-center text-left focus:outline-none group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-lg font-semibold text-gray-800 group-hover:text-purple-600 transition-colors duration-200">
                    {question}
                </span>
                <span className={`transform transition-transform duration-300 text-purple-600 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mb-6' : 'max-h-0 opacity-0'
                    }`}
            >
                <p className="text-gray-600 leading-relaxed">
                    {answer}
                </p>
            </div>
        </div>
    );
};

const FAQ = () => {
    const faqs = [
        {
            question: "What Is Monkey Clone?",
            answer: "Monkey Clone is a next-generation video chat platform that randomly pairs you with people from around the world for spontaneous conversations."
        },
        {
            question: "Is It Safe to Use?",
            answer: "Safety is our top priority. We use AI-driven moderation and provide easy reporting tools to ensure a safe and respectful environment for all users."
        },
        {
            question: "Can I Use It to Talk to Strangers?",
            answer: "Absolutely! The core experience is built around connecting you with new people (strangers) instantly."
        },
        {
            question: "Do I Need an Account?",
            answer: "You can start chatting as a guest for limited time, but creating an account unlocks profile features, friend lists, and history."
        },
        {
            question: "Is It Available on Mobile and Desktop?",
            answer: "Yes! Monkey Clone is fully responsive and works seamlessly on both web browsers and mobile devices."
        }
    ];

    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-6 max-w-3xl">
                <div className="text-center mb-12">
                    <span className="text-purple-600 font-semibold tracking-wide uppercase text-sm">Support</span>
                    <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-4">Frequently Asked Questions</h2>
                    <p className="text-gray-600">Everything you need to know about Monkey Clone.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-8 py-4">
                    {faqs.map((faq, index) => (
                        <FAQItem key={index} question={faq.question} answer={faq.answer} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
