import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ParticleBackground } from './ParticleBackground';
import { Outlet } from 'react-router-dom';
import { cn } from '../lib/utils';
import { QuickAddModal } from './QuickAddModal';
import { motion } from 'motion/react';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen font-sans selection:bg-[#75d36e]/30 selection:text-white flex text-[#e2e8f0] relative">
      {/* Global Mesh Gradient Background for premium glass effect across all tabs */}
      <div className="fixed inset-0 z-[-2] pointer-events-none opacity-40 dark:opacity-50 overflow-hidden dark:mix-blend-screen mix-blend-multiply">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.7, 0.5], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-5%] w-[60vw] max-w-[600px] h-[60vw] max-h-[600px] rounded-full bg-[#75d36e] blur-[120px]"
        />
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.6, 0.4], x: [0, -40, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] left-[-5%] w-[80vw] max-w-[800px] h-[80vw] max-h-[800px] rounded-full bg-[#3b82f6] blur-[150px]"
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.5, 0.4], x: [0, 30, 0], y: [0, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute top-[40%] left-[30%] w-[50vw] max-w-[500px] h-[50vw] max-h-[500px] rounded-full bg-[#c084fc] blur-[120px]"
        />
      </div>

      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <ParticleBackground />
      </div>

      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main 
        className={cn(
          "flex-1 transition-all duration-300 relative",
          sidebarOpen ? "md:pl-[220px]" : "md:pl-[68px]"
        )}
      >
        <div className="max-w-[1400px] w-full mx-auto px-4 md:px-8 py-8 mt-12 md:mt-0">
          <Outlet />
        </div>
      </main>

      <QuickAddModal />
    </div>
  );
}
