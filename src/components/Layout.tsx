import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import Constellation from './Constellation';
import { Outlet } from 'react-router-dom';
import { cn } from '../lib/utils';
import { QuickAddModal } from './QuickAddModal';
import { motion } from 'motion/react';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen w-full overflow-x-hidden font-sans selection:bg-[#4ade80]/30 selection:text-[#4ade80] flex text-slate-100 relative bg-background">
      <Constellation />

      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main 
        className={cn(
          "flex-1 min-w-0 transition-all duration-300 relative",
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
