import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface GenieModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function GenieModal({ isOpen, onClose, title, children }: GenieModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ 
                y: '50vh', 
                scaleY: 0.05, 
                scaleX: 0.3, 
                opacity: 0,
                filter: 'blur(10px)',
              }}
              animate={{ 
                y: 0, 
                scaleY: 1, 
                scaleX: 1, 
                opacity: 1,
                filter: 'blur(0px)',
              }}
              exit={{ 
                y: '50vh',
                scaleY: 0.05,
                scaleX: 0.3,
                opacity: 0,
                filter: 'blur(10px)',
              }}
              transition={{ 
                type: 'spring', 
                damping: 25, 
                stiffness: 250,
                mass: 0.8
              }}
              style={{ originY: 1 }}
              className="bg-[#111111] border border-[#222222] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl pointer-events-auto"
            >
              <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between bg-white/5 backdrop-blur-md">
                <h2 className="text-xl font-display font-semibold text-white">{title}</h2>
                <button 
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-[#111111]">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
