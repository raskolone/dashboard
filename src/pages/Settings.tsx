import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { User, Shield, Key, Bell, Palette, HardDrive, Smartphone } from 'lucide-react';

export function SettingsPage() {
  const { user, theme, toggleTheme } = useAppStore();
  const [activeTab, setActiveTab] = useState('profile');

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-3xl overflow-hidden glass-card relative">
      {/* Sidebar Settings Menu */}
      <div className="w-64 border-r border-[#222222] bg-[#111111]/80 backdrop-blur-md flex flex-col shrink-0">
        <div className="p-6 border-b border-[#222222]">
          <h2 className="text-xl font-display font-bold text-white">Ustawienia</h2>
        </div>
        <div className="p-4 space-y-1 overflow-y-auto">
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <User className="w-5 h-5" /> Profil
          </button>
          <button onClick={() => setActiveTab('appearance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'appearance' ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <Palette className="w-5 h-5" /> Wygląd
          </button>
          <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'security' ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <Shield className="w-5 h-5" /> Bezpieczeństwo
          </button>
          <button onClick={() => setActiveTab('storage')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'storage' ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <HardDrive className="w-5 h-5" /> Dane i Pamięć
          </button>
        </div>
      </div>

      {/* Main Settings Content */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="max-w-2xl">
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-3xl font-display font-bold text-white">Twój Profil</h3>
              
              <div className="flex items-center gap-6 p-6 bg-[#161616] border border-[#222222] rounded-2xl">
                <div className="w-24 h-24 rounded-full bg-[#222] flex items-center justify-center overflow-hidden shrink-0 border-2 border-[#333]">
                   {user.photoURL ? (
                     <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     <span className="text-4xl text-slate-500 font-bold">{user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}</span>
                   )}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">{user.displayName || 'Użytkownik bez nazwy'}</h4>
                  <p className="text-slate-400">{user.email}</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4ade80]/10 text-[#4ade80] text-xs font-bold uppercase tracking-wider">
                     Zalogowany przez Google
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white mb-1">Nazwa wyświetlana</div>
                      <div className="text-sm text-slate-400">Określa, jak będziesz widoczny w interfejsie.</div>
                    </div>
                    <div className="text-white font-medium">{user.displayName || '-'}</div>
                 </div>
                 <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white mb-1">Adres e-mail</div>
                      <div className="text-sm text-slate-400">Używany do logowania i powiadomień.</div>
                    </div>
                    <div className="text-white font-medium">{user.email || '-'}</div>
                 </div>
                 <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white mb-1">ID Użytkownika</div>
                      <div className="text-sm text-slate-400">Twoje unikalne ID w bazie danych.</div>
                    </div>
                    <div className="text-slate-500 font-mono text-xs">{user.uid}</div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-3xl font-display font-bold text-white">Wygląd aplikacji</h3>
              
              <div className="space-y-4">
                 <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white mb-1">Motyw</div>
                      <div className="text-sm text-slate-400">Wybierz tryb jasny lub ciemny.</div>
                    </div>
                    <button 
                      onClick={toggleTheme}
                      className="px-4 py-2 bg-[#222] hover:bg-[#333] transition-colors rounded-lg text-sm text-white font-medium"
                    >
                      {theme === 'dark' ? 'Tryb Ciemny' : 'Tryb Jasny'}
                    </button>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-3xl font-display font-bold text-white">Bezpieczeństwo</h3>
              
              <div className="space-y-4">
                 <div className="p-6 bg-[#161616] border border-[#222222] rounded-xl flex flex-col gap-4">
                    <div className="flex items-center gap-4 text-[#4ade80]">
                      <Shield className="w-8 h-8" />
                      <div>
                        <div className="font-bold text-lg text-white">Twoje dane są bezpieczne</div>
                        <div className="text-sm text-[#4ade80]/80">Chronione regułami security Firestore.</div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Wszystkie Twoje notatki, zadania i nawyki są przypisane stricte do Twojego profilu i oddzielone od innych użytkowników w chmurze z pełną autoryzacją po stronie serwera.
                    </p>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-3xl font-display font-bold text-white">Bazy danych i pamięć</h3>
              
              <div className="space-y-4">
                 <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl flex justify-between items-center text-red-500 opacity-80 hover:opacity-100 transition-opacity">
                    <div>
                      <div className="font-bold mb-1">Usuń wszystkie moje dane</div>
                      <div className="text-sm text-red-400/80">Ta akcja jest nieodwracalna. Spowoduje usunięcie wszystkich Twoich notatek i wpisów.</div>
                    </div>
                    <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors rounded-lg text-sm font-medium shrink-0">
                      Zresetuj konto
                    </button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
