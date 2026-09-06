import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ChevronRight, Check } from 'lucide-react';

export interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
  divider?: boolean;
  header?: string;
  checked?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  title?: string;
}

export function ContextMenu({ x, y, items, onClose, title }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x, y });
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);

  // Position clamping to keep within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let adjustedX = x;
      let adjustedY = y;

      const padding = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (x + rect.width > viewportWidth - padding) {
        adjustedX = Math.max(padding, x - rect.width);
      }
      if (y + rect.height > viewportHeight - padding) {
        adjustedY = Math.max(padding, y - rect.height);
      }

      setCoords({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  // Close listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.94, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        style={{ left: coords.x, top: coords.y }}
        className="fixed pointer-events-auto min-w-[210px] max-w-[280px] bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] text-xs text-slate-200 select-none z-[9999]"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {title && (
          <div className="px-3 py-1.5 mb-1 text-[11px] font-bold text-slate-400 border-b border-white/10 uppercase tracking-wider flex items-center justify-between">
            <span className="truncate">{title}</span>
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          {items.map((item, idx) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${idx}`}
                  className="h-px bg-white/10 my-1 -mx-0.5"
                />
              );
            }

            if (item.header) {
              return (
                <div
                  key={`header-${idx}`}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                >
                  {item.header}
                </div>
              );
            }

            const Icon = item.icon;
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isSubmenuOpen = activeSubmenuId === item.id;

            return (
              <div
                key={item.id || `item-${idx}`}
                className="relative"
                onMouseEnter={() => {
                  if (hasSubmenu) setActiveSubmenuId(item.id);
                  else setActiveSubmenuId(null);
                }}
              >
                <button
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    if (!hasSubmenu && item.onClick) {
                      item.onClick();
                      onClose();
                    }
                  }}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 transition-colors text-left text-xs font-medium cursor-pointer",
                    item.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
                    !item.disabled && (
                      item.danger
                        ? "text-red-400 hover:bg-red-500/15 hover:text-red-300"
                        : "text-slate-200 hover:bg-white/10 hover:text-white"
                    ),
                    isSubmenuOpen && "bg-white/10 text-white"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {Icon && (
                      <Icon
                        className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          item.danger ? "text-red-400" : "text-slate-400 group-hover:text-white"
                        )}
                      />
                    )}
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.checked && (
                      <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                    )}
                    {item.shortcut && (
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.shortcut}
                      </span>
                    )}
                    {hasSubmenu && (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Submenu */}
                {hasSubmenu && isSubmenuOpen && (
                  <div
                    className="absolute left-full top-0 ml-1 min-w-[190px] bg-[#1e1e24]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-xs text-slate-200 z-[10000]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col gap-0.5">
                      {item.submenu!.map((sub, sIdx) => {
                        if (sub.divider) {
                          return (
                            <div
                              key={`sub-div-${sIdx}`}
                              className="h-px bg-white/10 my-1"
                            />
                          );
                        }

                        const SubIcon = sub.icon;
                        return (
                          <button
                            key={sub.id || `sub-${sIdx}`}
                            type="button"
                            disabled={sub.disabled}
                            onClick={() => {
                              if (sub.disabled) return;
                              if (sub.onClick) {
                                sub.onClick();
                                onClose();
                              }
                            }}
                            className={cn(
                              "w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 transition-colors text-left text-xs font-medium cursor-pointer",
                              sub.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
                              !sub.disabled && (
                                sub.danger
                                  ? "text-red-400 hover:bg-red-500/15 hover:text-red-300"
                                  : "text-slate-200 hover:bg-white/10 hover:text-white"
                              )
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {SubIcon && (
                                <SubIcon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              )}
                              <span className="truncate">{sub.label}</span>
                            </div>
                            {sub.checked && (
                              <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
