import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ReviewButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [review, setReview] = useState('');

  const handleSubmit = async () => {
    try {
      await fetch('/api/send-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review })
      });
      alert('Thank you for your feedback!');
      setReview('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error sending review:', error);
      alert('Failed to send review. Please try again later.');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 p-6 bg-white rounded-3xl shadow-2xl w-80 border border-slate-100"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Share your experience</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="w-full h-32 p-4 text-xs border border-slate-200 rounded-2xl mb-4 bg-slate-50 focus:border-green-500 focus:outline-none"
              placeholder="What do you think of this application..."
            />
            <button
              onClick={handleSubmit}
              className="w-full bg-green-500 hover:bg-green-600 text-white rounded-2xl p-4 font-black uppercase text-[10px] tracking-widest transition-all"
            >
              Send Review
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-green-500 hover:bg-green-600 text-white p-5 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95"
      >
        <MessageSquare size={28} />
      </button>
    </div>
  );
};
