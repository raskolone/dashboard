import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/AppContext';
import { 
  Plus, Trash2, Search, Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  Menu, List, ListOrdered, Quote, Code, Link as LinkIcon, Eye, Edit2, ChevronDown, ChevronRight, CheckSquare, FolderPlus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarkdownEditor } from '../components/MarkdownEditor';

export function Notes() {
  const { knowledge, addKnowledge, updateKnowledge, deleteKnowledge } = useAppStore();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(knowledge.length > 0 ? knowledge[0].id : null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFoldersOpen, setIsFoldersOpen] = useState(true);
  
  const [activeFolder, setActiveFolder] = useState<string | null>('Notes');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  
  const editorRef = useRef<any>(null);

  const activeNote = knowledge.find(n => n.id === activeNoteId);

  // Extract unique folders and tags
  const folders = Array.from(new Set(knowledge.map(n => n.category || 'Notes')));
  // Flatten all tags and get unique
  const tags = Array.from(new Set(knowledge.flatMap(n => n.tags || [])));

  const handleCreateNote = () => {
    const newNote = {
      title: 'Nowa notatka',
      content: '',
      category: activeFolder || 'Notes',
      tags: activeTag ? [activeTag] : [],
      is_pinned: false
    };
    const tempId = `k_${Date.now()}`;
    addKnowledge(newNote); 
    
    setTimeout(() => {
      setActiveNoteId(tempId);
      if (editorRef.current) {
        editorRef.current.commands.focus();
      }
    }, 50);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeNoteId) {
      updateKnowledge(activeNoteId, { title: e.target.value });
    }
  };

  const handleContentChange = (content: string) => {
    if (activeNoteId) {
      updateKnowledge(activeNoteId, { content });
    }
  };

  const handleDelete = () => {
    if (activeNoteId) {
      deleteKnowledge(activeNoteId);
      setActiveNoteId(null);
    }
  };

  const formatText = (command: string, args?: any) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    
    switch (command) {
      case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'bold': editor.chain().focus().toggleBold().run(); break;
      case 'italic': editor.chain().focus().toggleItalic().run(); break;
      case 'strike': editor.chain().focus().toggleStrike().run(); break;
      case 'bullet': editor.chain().focus().toggleBulletList().run(); break;
      case 'ordered': editor.chain().focus().toggleOrderedList().run(); break;
      case 'tasklist': editor.chain().focus().toggleTaskList().run(); break;
      case 'quote': editor.chain().focus().toggleBlockquote().run(); break;
      case 'code': editor.chain().focus().toggleCode().run(); break;
      case 'details': 
        editor.chain().focus().insertContent('<details open><summary>Kliknij aby rozwinąć</summary><p>Treść powiązana z nagłówkiem...</p></details>').run(); 
        break;
    }
  };

    const handleCreateFolder = () => {
    const newFolderName = prompt('Podaj nazwę nowego folderu:');
    if (newFolderName && newFolderName.trim()) {
      const folderName = newFolderName.trim();
      const newNote = {
        title: 'Nowa notatka',
        content: '',
        category: folderName,
        tags: [],
        is_pinned: false
      };
      const tempId = `k_${Date.now()}`;
      addKnowledge(newNote);
      setActiveFolder(folderName);
      setActiveTag(null);
      setTimeout(() => {
        setActiveNoteId(tempId);
        if (editorRef.current) {
          editorRef.current.commands.focus();
        }
      }, 50);
    }
  };

  const filteredNotes = knowledge.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = activeFolder ? (n.category || 'Notes') === activeFolder : true;
    const matchesTag = activeTag ? (n.tags && n.tags.includes(activeTag)) : true;
    
    // If a tag is selected, we might ignore folder filter or combine them. Usually combined is fine.
    // If we want "All Notes" we could set activeFolder to null.
    
    if (activeTag) {
      return matchesSearch && matchesTag; // When tag is selected, show from all folders
    }
    
    return matchesSearch && (activeFolder === null || matchesFolder);
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-3xl overflow-hidden glass-card">
      
      {/* Very Left Sidebar (Folders & Tags) */}
      <div 
        className={`${isFoldersOpen ? 'w-48' : 'w-0 hidden'} flex flex-col border-r border-[#222222] bg-[#0a0a0a]/90 backdrop-blur-md transition-all duration-300 md:block max-w-full z-10 shrink-0`}
      >
        <div className="p-4 border-b border-[#222222] flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Kategorie</h2>
          <button onClick={handleCreateFolder} className="text-slate-400 hover:text-white transition-colors">
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto w-full p-2 space-y-1">
          <button
            onClick={() => { setActiveFolder(null); setActiveTag(null); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeFolder === null && activeTag === null ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-slate-300 hover:bg-white/5'}`}
          >
            Wszystkie
          </button>
          {folders.map(f => (
            <button
              key={f}
              onClick={() => { setActiveFolder(f); setActiveTag(null); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeFolder === f && activeTag === null ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-slate-300 hover:bg-white/5'}`}
            >
              {f}
            </button>
          ))}

          {tags.length > 0 && (
            <>
              <div className="mt-6 mb-2 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Tagi</div>
              {tags.map(t => (
                <button
                  key={t}
                  onClick={() => { setActiveTag(t); setActiveFolder(null); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${activeTag === t ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-slate-300 hover:bg-white/5'}`}
                >
                  <span className="text-slate-500">#</span> {t}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main Notes Sidebar (Notes List) */}
      <div 
        className={`${isSidebarOpen ? 'w-full md:w-72' : 'w-0 hidden'} flex flex-col border-r border-[#222222] bg-[#111111]/80 backdrop-blur-md transition-all duration-300 md:block max-w-full z-10 shrink-0`}
      >
        <div className="p-4 border-b border-[#222222] flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-display font-bold text-white">
              {activeTag ? `#${activeTag}` : activeFolder ? activeFolder : 'Notatki'}
            </h2>
            <button 
              onClick={handleCreateNote}
              className="p-2 rounded-xl bg-[#4ade80]/10 text-[#4ade80] hover:bg-[#4ade80]/20 transition-colors"
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
              className="w-full bg-[#161616] border border-[#262626] rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#4ade80] transition-colors"
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
                  className={`w-full text-left p-4 transition-colors ${activeNoteId === note.id ? 'bg-[#4ade80]/10' : 'hover:bg-white/5'}`}
                >
                  <h3 className={`font-medium mb-1 truncate ${activeNoteId === note.id ? 'text-[#4ade80]' : 'text-white'}`}>
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
      <div className={`flex-1 flex flex-col h-full bg-[#0a0a0a]/50 backdrop-blur-md min-w-0 ${!isSidebarOpen ? 'block' : 'hidden md:flex'}`}>
        {activeNote ? (
          <>
            {/* Editor Toolbar */}
            <div className="h-14 border-b border-[#222222] flex items-center justify-between px-4 sticky top-0 z-20">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg mr-2 shrink-0"
                >
                  <Menu className="w-5 h-5" />
                </button>
                
                {/* View Mode Toggle (Removed, now WYSIWYG) */}
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-xs font-mono text-slate-500 uppercase tracking-wider px-2 py-1 bg-white/5 rounded-md">WYSIWYG Markdown</span>
                </div>

                <div className="w-px h-6 bg-[#262626] mx-1 shrink-0"></div>
                
                {/* Headings */}
                <div className="flex bg-[#161616] rounded-lg p-1 border border-[#262626] shrink-0">
                  <button onClick={() => formatText('h1')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title="Nagłówek 1"><Heading1 className="w-4 h-4" /></button>
                  <button onClick={() => formatText('h2')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title="Nagłówek 2"><Heading2 className="w-4 h-4" /></button>
                  <button onClick={() => formatText('h3')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title="Nagłówek 3"><Heading3 className="w-4 h-4" /></button>
                </div>

                <div className="w-px h-6 bg-[#262626] mx-1 shrink-0"></div>

                {/* Text Formatting */}
                <div className="flex bg-[#161616] rounded-lg p-1 border border-[#262626] shrink-0">
                  <button onClick={() => formatText('bold')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors font-bold" title="Pogrubienie"><Bold className="w-4 h-4" /></button>
                  <button onClick={() => formatText('italic')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors italic" title="Kursywa"><Italic className="w-4 h-4" /></button>
                  <button onClick={() => formatText('strike')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title="Przekreślenie"><Strikethrough className="w-4 h-4" /></button>
                </div>

                <div className="w-px h-6 bg-[#262626] mx-1 shrink-0"></div>

                {/* Lists & Quotes */}
                <div className="flex bg-[#161616] rounded-lg p-1 border border-[#262626] shrink-0">
                  <button onClick={() => formatText('bullet')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title="Lista punktowa"><List className="w-4 h-4" /></button>
                  <button onClick={() => formatText('ordered')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title="Lista numerowana"><ListOrdered className="w-4 h-4" /></button>
                  <button onClick={() => formatText('tasklist')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title="Lista zadań (Checklista)"><CheckSquare className="w-4 h-4" /></button>
                  <button onClick={() => formatText('quote')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title="Cytat"><Quote className="w-4 h-4" /></button>
                </div>

                <div className="w-px h-6 bg-[#262626] mx-1 shrink-0"></div>

                {/* Code & Links */}
                <div className="flex bg-[#161616] rounded-lg p-1 border border-[#262626] shrink-0">
                  <button onClick={() => formatText('code')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title="Kod inline"><Code className="w-4 h-4" /></button>
                </div>

                <div className="w-px h-6 bg-[#262626] mx-1 shrink-0"></div>

                {/* Extras */}
                <div className="flex bg-[#161616] rounded-lg p-1 border border-[#262626] shrink-0">
                  <button onClick={() => formatText('details')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors flex items-center gap-1" title="Zwijana grupa">
                    <ChevronDown className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline-block pr-1">Zwijane</span>
                  </button>
                </div>
              </div>
              <button 
                onClick={handleDelete}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                title="Usuń notatkę"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative">
              <div className="max-w-3xl mx-auto h-full flex flex-col">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={handleTitleChange}
                  placeholder="Tytuł notatki"
                  className="w-full bg-transparent text-4xl font-display font-bold text-white mb-2 focus:outline-none placeholder:text-slate-600 shrink-0"
                />
                
                <div className="flex gap-4 mb-8 text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-bold">Folder:</span>
                    <input 
                      type="text"
                      value={activeNote.category || 'Notes'}
                      onChange={(e) => updateKnowledge(activeNote.id, { category: e.target.value })}
                      className="bg-transparent focus:outline-none focus:text-white border-b border-transparent focus:border-[#4ade80] transition-colors"
                      placeholder="Nazwa kategorii"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-bold">Tagi:</span>
                    <input 
                      type="text"
                      value={(activeNote.tags || []).join(', ')}
                      onChange={(e) => updateKnowledge(activeNote.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                      className="bg-transparent focus:outline-none focus:text-white border-b border-transparent focus:border-[#4ade80] transition-colors min-w-[200px]"
                      placeholder="oddziel tagi przecinkami"
                    />
                  </div>
                  <div className="flex-1 text-right text-xs text-slate-600 self-center">
                    Zaktualizowano: {new Date(activeNote.updatedAt || Date.now()).toLocaleDateString()}{' '}
                    {new Date(activeNote.updatedAt || Date.now()).toLocaleTimeString()}
                  </div>
                </div>
                
                <MarkdownEditor 
                  content={activeNote.content}
                  onChange={handleContentChange}
                  editorRef={editorRef}
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
