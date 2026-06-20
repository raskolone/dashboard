import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Calendar, Activity, BookText, Settings, Menu, X, Sun, Moon, Bot, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/AppContext';

export function Sidebar({ open, setOpen }: { open: boolean, setOpen: (o: boolean) => void }) {
  const { theme, toggleTheme, user, logoutGoogle } = useAppStore();
  
  const routes = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Zadania', path: '/tasks', icon: CheckSquare },
    { name: 'Kalendarz', path: '/calendar', icon: Calendar },
    { name: 'Zwyczaje', path: '/habits', icon: Activity },
    { name: 'Notatki', path: '/knowledge', icon: BookText },
    { name: 'AI Asystent', path: '/assistant', icon: Bot },
  ];

  return (
    <>
      <motion.div 
        initial={false}
        animate={{ width: open ? 220 : 68 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className={cn(
          "fixed top-0 left-0 h-screen bg-[#0a0a0a] border-r border-[#222222] z-50 flex flex-col overflow-hidden",
          !open && "hidden md:flex"
        )}
      >
        <div className="h-16 flex items-center border-b border-[#222222] overflow-hidden whitespace-nowrap px-3">
          <div className="flex items-center min-w-[44px] justify-center">
            <button 
              onClick={() => setOpen(!open)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          <AnimatePresence>
            {open && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="ml-3 overflow-hidden"
              >
                <span className="font-display font-bold text-lg text-white">Base<span className="text-[#4ade80]">44</span></span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto overflow-x-hidden min-w-[220px]">
          {routes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-[#4ade80]/10 text-[#4ade80] shadow-[inset_0_0_12px_rgba(117,211,110,0.1)]" 
                  : "text-slate-400 hover:text-white hover:bg-white/5",
                !open && "justify-start w-[44px]"
              )}
            >
              <route.icon className="w-5 h-5 flex-shrink-0" />
              {open && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium text-sm whitespace-nowrap">{route.name}</motion.span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[#222222] space-y-1 min-w-[220px]">
          {user && (
            <div className={cn(
              "flex justify-between items-center px-3 py-3 mb-2 rounded-xl transition-all duration-200 text-white bg-white/5",
              !open ? "flex-col w-[44px] justify-center px-0 items-center justify-center p-0 h-[44px]" : "w-full"
            )}>
              <div className="flex items-center gap-3 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#4ade80] text-black flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                {open && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium text-sm whitespace-nowrap truncate">{user.displayName || user.email}</motion.span>}
              </div>

              {open && (
                <button
                  onClick={logoutGoogle}
                  className="text-slate-400 hover:text-red-400 p-1 rounded-md hover:bg-white/5 transition-colors"
                  title="Wyloguj"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          
          <button 
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:text-white hover:bg-white/5",
              !open ? "justify-start w-[44px]" : "w-full"
            )}>
            {theme === 'dark' ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
            {open && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium text-sm whitespace-nowrap">{theme === 'dark' ? 'Jasny Motyw' : 'Ciemny Motyw'}</motion.span>}
          </button>
          
          <NavLink 
            to="/settings"
            className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
            isActive 
              ? "bg-[#4ade80]/10 text-[#4ade80] shadow-[inset_0_0_12px_rgba(117,211,110,0.1)]" 
              : "text-slate-400 hover:text-white hover:bg-white/5",
            !open ? "justify-start w-[44px]" : "w-full"
          )}>
            <Settings className="w-5 h-5 flex-shrink-0" />
            {open && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium text-sm whitespace-nowrap">Ustawienia</motion.span>}
          </NavLink>
        </div>
      </motion.div>

      {/* Mobile Toggle & Overlay */}
      <div className="md:hidden">
        {!open && (
           <button 
             onClick={() => setOpen(true)}
             className="fixed top-4 left-4 z-40 p-2 rounded-xl bg-[#0a0a0a] border border-white/10 text-white"
           >
             <Menu className="w-5 h-5" />
           </button>
        )}
        <AnimatePresence>
          {open && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/80 z-40"
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
