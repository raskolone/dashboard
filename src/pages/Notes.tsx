import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/AppContext';
import { Plus, Trash2, Search, Bold, Italic, Heading1, Heading2, Menu } from 'lucide-react';

export function Notes() {
  const { knowledge, addKnowledge, updateKnowledge, deleteKnowledge } = useAppStore();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(knowledge.length > 0 ? knowledge[0].id : null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const contentEditableRef = useRef<HTMLDivElement>(null);

  const activeNote = knowledge.find(n => n.id === activeNoteId);

  // Sync contentEditable with activeNote content
  useEffect(() => {
    if (contentEditableRef.current && activeNote) {
      if (contentEditableRef.current.innerHTML !== activeNote.content) {
        contentEditableRef.current.innerHTML = activeNote.content;
      }
    } else if (contentEditableRef.current && !activeNote) {
      contentEditableRef.current.innerHTML = '';
    }
  }, [activeNoteId, activeNote?.content]);

  const handleCreateNote = () => {
    const newNote = {
      title: 'Nowa notatka',
      content: '',
      category: 'Notes' as const,
      tags: [],
      is_pinned: false
    };
    const tempId = `k_${Date.now()}`;
    addKnowledge(newNote); 
    
    setTimeout(() => {
      setActiveNoteId(tempId);
      if (contentEditableRef.current) {
        contentEditableRef.current.focus();
      }
    }, 50);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeNoteId) {
      updateKnowledge(activeNoteId, { title: e.target.value });
    }
  };

  const handleContentInput = () => {
    if (activeNoteId && contentEditableRef.current) {
      updateKnowledge(activeNoteId, { content: contentEditableRef.current.innerHTML });
    }
  };

  const handleDelete = () => {
    if (activeNoteId) {
      deleteKnowledge(activeNoteId);
      setActiveNoteId(null);
    }
  };

  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    document.execCommand(cmd, false, val);
    if (contentEditableRef.current) {
      contentEditableRef.current.focus();
    }
    handleContentInput();
  };

  const filteredNotes = knowledge.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-3xl overflow-hidden glass-card">
      
      {/* Left Sidebar (Notes List) */}
      <div 
        className={`${isSidebarOpen ? 'w-full md:w-80' : 'w-0 hidden'} flex flex-col border-r border-white/10 dark:border-[#222222] bg-white/5 dark:bg-[#111111]/50 transition-all duration-300 md:block max-w-full z-10 shrink-0`}
      >
        <div className="p-4 border-b border-[#222222] flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-display font-bold text-white">Notatki</h2>
            <button 
              onClick={handleCreateNote}
              className="p-2 rounded-xl bg-[#75d36e]/10 text-[#75d36e] hover:bg-[#75d36e]/20 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Szukaj..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-black/20 dark:bg-[#161616]/50 border border-white/10 dark:border-[#262626] rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-[#75d36e] transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto w-full">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Brak notatek
            </div>
          ) : (
            <div className="divide-y divide-[#222222]">
              {filteredNotes.map(note => (
                <button
                  key={note.id}
                  onClick={() => {
                    setActiveNoteId(note.id);
                    if (window.innerWidth < 768) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`w-full text-left p-4 transition-colors ${activeNoteId === note.id ? 'bg-[#75d36e]/10' : 'hover:bg-white/5'}`}
                >
                  <h3 className={`font-medium mb-1 truncate ${activeNoteId === note.id ? 'text-[#75d36e]' : 'text-white'}`}>
                    {note.title || 'Bez tytułu'}
                  </h3>
                  <div className="flex justify-between items-baseline gap-2">
                    <p className="text-xs text-slate-500 truncate flex-1">
                      {note.content.replace(/<[^>]*>?/gm, '') || 'Brak treści...'}
                    </p>
                    <span className="text-[10px] text-slate-600 shrink-0">
                      {new Date(note.updatedAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content (Editor) */}
      <div className={`flex-1 flex flex-col h-full bg-[#0a0a0a] min-w-0 ${!isSidebarOpen ? 'block' : 'hidden md:flex'}`}>
        {activeNote ? (
          <>
            {/* Editor Toolbar */}
            <div className="h-14 border-b border-[#222222] flex items-center justify-between px-4 sticky top-0 bg-[#0a0a0a]/90 backdrop-blur z-20">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg mr-2"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex bg-[#161616] rounded-lg p-1 border border-[#262626]">
                  <button onClick={() => execCmd('formatBlock', 'H1')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title="Nagłówek 1"><Heading1 className="w-4 h-4" /></button>
                  <button onClick={() => execCmd('formatBlock', 'H2')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title="Nagłówek 2"><Heading2 className="w-4 h-4" /></button>
                </div>
                <div className="w-px h-6 bg-[#262626] mx-2"></div>
                <div className="flex bg-[#161616] rounded-lg p-1 border border-[#262626]">
                  <button onClick={() => execCmd('bold')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors font-bold" title="Pogrubienie"><Bold className="w-4 h-4" /></button>
                  <button onClick={() => execCmd('italic')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors italic" title="Kursywa"><Italic className="w-4 h-4" /></button>
                </div>
              </div>
              <button 
                onClick={handleDelete}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                title="Usuń notatkę"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-12" onClick={() => contentEditableRef.current?.focus()}>
              <div className="max-w-3xl mx-auto">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={handleTitleChange}
                  placeholder="Tytuł notatki"
                  className="w-full bg-transparent text-3xl font-display font-bold text-white mb-6 focus:outline-none placeholder:text-slate-600"
                />
                <div
                  ref={contentEditableRef}
                  contentEditable
                  onInput={handleContentInput}
                  className="editor-content min-h-[500px] focus:outline-none max-w-none text-slate-300"
                  placeholder="Zacznij pisać tutaj..."
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Menu className="w-12 h-12 mb-4 opacity-20" />
            <p>Wybierz notatkę lub utwórz nową</p>
          </div>
        )}
      </div>
    </div>
  );
}
