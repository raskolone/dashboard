import React from 'react';
import { useAppStore } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const navigate = useNavigate();
  const { loginGoogle, loginDemo } = useAppStore();

  const handleLogin = async () => {
    try {
      await loginGoogle();
      navigate('/');
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleDemoLogin = () => {
    loginDemo();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#07090b] flex flex-col md:flex-row items-center justify-center p-8 md:p-16 text-white overflow-hidden relative">
      {/* Background network effect */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(74, 222, 128, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(74, 222, 128, 0.05) 0%, transparent 40%)' }}></div>
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#4ade80]/10 rounded-full blur-[100px] -z-10 mix-blend-screen pointer-events-none"></div>

      <div className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-between z-10 gap-16">
        
        {/* Left Side text */}
        <div className="flex-1 text-left space-y-6">
          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none text-white font-display">
            MY <br />
            <span className="text-[#4ade80]">JOURNAL</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-lg mt-4 leading-relaxed font-light">
            Twój osobisty <span className="text-[#4ade80]">inteligentny profil</span>. Notuj, organizuj i odkrywaj zależności w swoim życiu z szyfrowaniem i pełną prywatnością.
          </p>

          <div className="flex gap-4 pt-8">
             <div className="bg-[#111] border border-[#222] rounded-2xl p-6 flex-1 max-w-xs transition-colors hover:border-[#333]">
                <div className="w-10 h-10 rounded-full bg-[#4ade80]/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Nagrywaj myśli</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Wygodnie</p>
             </div>
             <div className="bg-[#111] border border-[#222] rounded-2xl p-6 flex-1 max-w-xs transition-colors hover:border-[#333]">
                <div className="w-10 h-10 rounded-full bg-[#4ade80]/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Błyskawicznie</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Zawsze pod ręką</p>
             </div>
          </div>
        </div>

        {/* Right Side Card */}
        <div className="w-full md:w-[450px] shrink-0">
          <div className="bg-[#111111]/80 backdrop-blur-xl border border-[#222] rounded-3xl p-10 shadow-2xl relative overflow-hidden">
             
             <div className="flex justify-between items-center mb-10">
               <h2 className="text-2xl font-bold font-display text-white">Rozpocznij tutaj</h2>
               <div className="bg-[#4ade80]/20 text-[#4ade80] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Demo gotowe</div>
             </div>

             <button 
               onClick={handleLogin}
               className="w-full bg-[#4ade80] hover:bg-[#3bce69] text-black font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(74,222,128,0.2)] hover:shadow-[0_0_60px_rgba(74,222,128,0.3)] transform hover:-translate-y-1"
             >
               <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#000000" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#000000" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#000000" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#000000" />
               </svg>
               Zaloguj przez Google
             </button>

             <div className="relative flex py-8 items-center">
                <div className="flex-grow border-t border-[#222]"></div>
                <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Lub bez logowania</span>
                <div className="flex-grow border-t border-[#222]"></div>
             </div>

             <button 
               onClick={handleDemoLogin}
               className="w-full bg-[#161a1d] hover:bg-[#22292f] border border-[#333] hover:border-[#4ade80]/30 text-[#4ade80]/90 hover:text-[#4ade80] font-semibold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 transform hover:-translate-y-0.5 active:translate-y-0"
             >
               <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
               </svg>
               Uruchom wersję demonstracyjną
             </button>

             <div className="mt-8 text-center text-xs font-semibold text-slate-500 tracking-wide uppercase">
               Wszystkie akcje w wersji demonstracyjnej będą rejestrowane na bieżąco.
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
