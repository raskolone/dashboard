import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/AppContext';
import { 
  Plus, Trash2, Search, Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  Menu, List, ListOrdered, Quote, Code, Link as LinkIcon, Eye, Edit2, ChevronDown, ChevronRight, CheckSquare, FolderPlus,
  Sliders, Check, HelpCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarkdownEditor } from '../components/MarkdownEditor';

export function Notes() {
  const { knowledge, addKnowledge, updateKnowledge, deleteKnowledge, t, language } = useAppStore();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(knowledge.length > 0 ? knowledge[0].id : null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFoldersOpen, setIsFoldersOpen] = useState(true);
  
  const [activeFolder, setActiveFolder] = useState<string | null>('Notes');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  
  const [editorSettings, setEditorSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('notes_editor_settings_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      renderMarkdown: true,
      recognizeAsteriskTask: true,
      recognizeDashTask: true,
      recognizeNumberTask: false,
      defaultBullet: 'dash', // 'asterisk' or 'dash'
      showHelpText: true,
      smartLinks: true,
      autoPairBrackets: true
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('notes_editor_settings_v2', JSON.stringify(editorSettings));
    } catch {}
  }, [editorSettings]);

  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(true);
  
  const editorRef = useRef<any>(null);

  const activeNote = knowledge.find(n => n.id === activeNoteId);

  // Extract unique folders and tags
  const folders = Array.from(new Set(knowledge.map(n => n.category || 'Notes')));
  const tags = Array.from(new Set(knowledge.flatMap(n => n.tags || [])));

  const handleCreateNote = () => {
    const newNote = {
      title: language === 'pl' ? 'Nowa notatka' : 'New Note',
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

  const handlePasteAndConvertLinks = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!editorSettings.smartLinks) return;
    const pastedText = e.clipboardData.getData('text');
    const urlRegex = /^(https?:\/\/[^\s]+)$/g;
    if (urlRegex.test(pastedText.trim())) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      let domain = 'Link';
      try {
        const urlObj = new URL(pastedText.trim());
        domain = urlObj.hostname.replace('www.', '');
      } catch {}
      
      const markdownLink = `[${domain}](${pastedText.trim()})`;
      const newValue = value.substring(0, start) + markdownLink + value.substring(end);
      handleContentChange(newValue);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + markdownLink.length;
      }, 0);
    }
  };

  const handleKeyPressInRaw = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const value = textarea.value;
    
    if (e.key === ' ' && start > 0) {
      const lastChar = value[start - 1];
      const beforeLast = start > 1 ? value[start - 2] : '\n';
      const isLineStart = beforeLast === '\n' || beforeLast === '\r';
      
      if (isLineStart) {
        if (lastChar === '*' && editorSettings.recognizeAsteriskTask) {
          e.preventDefault();
          const newValue = value.substring(0, start - 1) + '* [ ] ' + value.substring(start);
          handleContentChange(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 5;
          }, 0);
          return;
        } else if (lastChar === '-' && editorSettings.recognizeDashTask) {
          e.preventDefault();
          const newValue = value.substring(0, start - 1) + '- [ ] ' + value.substring(start);
          handleContentChange(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 5;
          }, 0);
          return;
        } else if (lastChar === '.' && start > 1) {
          const preChar = value[start - 2];
          if (preChar >= '0' && preChar <= '9' && editorSettings.recognizeNumberTask) {
            e.preventDefault();
            const newValue = value.substring(0, start) + ' [ ] ' + value.substring(start);
            handleContentChange(newValue);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start + 5;
            }, 0);
            return;
          }
        }
      }
    }
    
    // Auto pairing brackets
    if (editorSettings.autoPairBrackets) {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      if (e.key === '[') {
        e.preventDefault();
        const newValue = value.substring(0, start) + '[]' + value.substring(end);
        handleContentChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      } else if (e.key === '(') {
        e.preventDefault();
        const newValue = value.substring(0, start) + '()' + value.substring(end);
        handleContentChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      } else if (e.key === '{') {
        e.preventDefault();
        const newValue = value.substring(0, start) + '{}' + value.substring(end);
        handleContentChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      }
    }
  };

  const formatTextInRaw = (command: string) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selectedText = value.substring(start, end);
    
    let replacement = '';
    let cursorOffset = 0;
    
    const bulletSymbol = editorSettings.defaultBullet === 'asterisk' ? '*' : '-';
    
    switch (command) {
      case 'h1': 
        replacement = `\n# ${selectedText || (language === 'pl' ? 'Nagłówek 1' : 'Heading 1')}\n`; 
        cursorOffset = 3;
        break;
      case 'h2': 
        replacement = `\n## ${selectedText || (language === 'pl' ? 'Nagłówek 2' : 'Heading 2')}\n`; 
        cursorOffset = 4;
        break;
      case 'h3': 
        replacement = `\n### ${selectedText || (language === 'pl' ? 'Nagłówek 3' : 'Heading 3')}\n`; 
        cursorOffset = 5;
        break;
      case 'bold': 
        replacement = `**${selectedText || (language === 'pl' ? 'pogrubienie' : 'bold')}**`; 
        cursorOffset = 2;
        break;
      case 'italic': 
        replacement = `_${selectedText || (language === 'pl' ? 'kursywa' : 'italic')}_`; 
        cursorOffset = 1;
        break;
      case 'strike': 
        replacement = `~~${selectedText || (language === 'pl' ? 'przekreślenie' : 'strikethrough')}~~`; 
        cursorOffset = 2;
        break;
      case 'bullet': 
        replacement = `\n${bulletSymbol} ${selectedText || (language === 'pl' ? 'Punkt' : 'Bullet')}\n`; 
        cursorOffset = bulletSymbol.length + 2;
        break;
      case 'ordered': 
        replacement = `\n1. ${selectedText || (language === 'pl' ? 'Punkt' : 'Bullet')}\n`; 
        cursorOffset = 4;
        break;
      case 'tasklist': 
        replacement = `\n${bulletSymbol} [ ] ${selectedText || (language === 'pl' ? 'Zadanie' : 'Task')}\n`; 
        cursorOffset = bulletSymbol.length + 6;
        break;
      case 'quote': 
        replacement = `\n> ${selectedText || (language === 'pl' ? 'Cytat' : 'Quote')}\n`; 
        cursorOffset = 3;
        break;
      case 'code': 
        replacement = `\`${selectedText || (language === 'pl' ? 'kod' : 'code')}\``; 
        cursorOffset = 1;
        break;
      case 'details': 
        replacement = `\n<details open>\n<summary>${selectedText || (language === 'pl' ? 'Zwiń/Rozwiń' : 'Collapse/Expand')}</summary>\n<p>...</p>\n</details>\n`;
        cursorOffset = 10;
        break;
    }
    
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    handleContentChange(newValue);
    
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.selectionStart = start;
        textarea.selectionEnd = start + replacement.length;
      } else {
        textarea.selectionStart = textarea.selectionEnd = start + cursorOffset;
      }
    }, 0);
  };

  const formatText = (command: string, args?: any) => {
    if (!editorSettings.renderMarkdown) {
      formatTextInRaw(command);
      return;
    }
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
        editor.chain().focus().insertContent(
          language === 'pl' 
            ? '<details open><summary>Kliknij aby rozwinąć</summary><p>Treść...</p></details>' 
            : '<details open><summary>Click to expand</summary><p>Content...</p></details>'
        ).run(); 
        break;
    }
  };

  const handleCreateFolder = () => {
    const promptMsg = language === 'pl' ? 'Podaj nazwę nowego folderu:' : 'Enter new folder name:';
    const newFolderName = prompt(promptMsg);
    if (newFolderName && newFolderName.trim()) {
      const folderName = newFolderName.trim();
      const newNote = {
        title: language === 'pl' ? 'Nowa notatka' : 'New Note',
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
    
    if (activeTag) {
      return matchesSearch && matchesTag;
    }
    
    return matchesSearch && (activeFolder === null || matchesFolder);
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-3xl overflow-hidden glass-card font-sans text-white">
      
      {/* Very Left Sidebar (Folders & Tags) */}
      <div 
        className={`${isFoldersOpen ? 'w-48' : 'w-0 hidden'} flex flex-col border-r border-[#222222] bg-[#0a0a0a]/90 backdrop-blur-md transition-all duration-300 md:block max-w-full z-10 shrink-0`}
      >
        <div className="p-4 border-b border-[#222222] flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            {language === 'pl' ? 'Kategorie' : 'Categories'}
          </h2>
          <button onClick={handleCreateFolder} className="text-slate-400 hover:text-white transition-colors">
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto w-full p-2 space-y-1">
          <button
            onClick={() => { setActiveFolder(null); setActiveTag(null); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeFolder === null && activeTag === null ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-slate-300 hover:bg-white/5'}`}
          >
            {language === 'pl' ? 'Wszystkie' : 'All'}
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
              <div className="mt-6 mb-2 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                {language === 'pl' ? 'Tagi' : 'Tags'}
              </div>
              {tags.map(tElement => (
                <button
                  key={tElement}
                  onClick={() => { setActiveTag(tElement); setActiveFolder(null); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${activeTag === tElement ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-slate-300 hover:bg-white/5'}`}
                >
                  <span className="text-slate-500">#</span> {tElement}
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
              {activeTag ? `#${activeTag}` : activeFolder ? activeFolder : (language === 'pl' ? 'Notatki' : 'Notes')}
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
              placeholder={language === 'pl' ? "Szukaj..." : "Search..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#161616] border border-[#262626] rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#4ade80] transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto w-full">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              {language === 'pl' ? 'Brak notatek' : 'No notes'}
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
                    {note.title || (language === 'pl' ? 'Bez tytułu' : 'Untitled')}
                  </h3>
                  <div className="flex justify-between items-baseline gap-2">
                    <p className="text-xs text-slate-500 truncate flex-1">
                      {note.content.replace(/<[^>]*>?/gm, '') || (language === 'pl' ? 'Brak treści...' : 'Empty content...')}
                    </p>
                    <span className="text-[10px] text-slate-600 shrink-0">
                      {new Date(note.updatedAt || Date.now()).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content (Editor and Settings) */}
      <div className={`flex-1 flex h-full bg-[#0a0a0a]/50 backdrop-blur-md min-w-0 ${!isSidebarOpen ? 'block' : 'hidden md:flex'}`}>
        
        {/* Editor Main Column */}
        <div className="flex-1 flex flex-col h-full min-w-0 border-r border-[#222222]">
          {activeNote ? (
            <>
              {/* Editor Toolbar */}
              <div className="h-14 border-b border-[#222222] flex items-center justify-between px-4 sticky top-0 z-20 shrink-0">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg mr-2 shrink-0"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  
                  {/* View Mode Indicator */}
                  <div className="flex items-center gap-2 mr-2 shrink-0">
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-wider px-2 py-1 bg-white/5 rounded-md">
                      {editorSettings.renderMarkdown ? 'WYSIWYG Markdown' : 'Raw Markdown Editor'}
                    </span>
                  </div>

                  <div className="w-px h-6 bg-[#262626] mx-1 shrink-0"></div>
                  
                  {/* Headings */}
                  <div className="flex bg-[#161616] rounded-lg p-1 border border-[#262626] shrink-0">
                    <button onClick={() => formatText('h1')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title={language === 'pl' ? 'Nagłówek 1' : 'Heading 1'}><Heading1 className="w-4 h-4" /></button>
                    <button onClick={() => formatText('h2')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title={language === 'pl' ? 'Nagłówek 2' : 'Heading 2'}><Heading2 className="w-4 h-4" /></button>
                    <button onClick={() => formatText('h3')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title={language === 'pl' ? 'Nagłówek 3' : 'Heading 3'}><Heading3 className="w-4 h-4" /></button>
                  </div>

                  <div className="w-px h-6 bg-[#262626] mx-1 shrink-0"></div>

                  {/* Text Formatting */}
                  <div className="flex bg-[#161616] rounded-lg p-1 border border-[#262626] shrink-0">
                    <button onClick={() => formatText('bold')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors font-bold" title={language === 'pl' ? 'Pogrubienie' : 'Bold'}><Bold className="w-4 h-4" /></button>
                    <button onClick={() => formatText('italic')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors italic" title={language === 'pl' ? 'Kursywa' : 'Italic'}><Italic className="w-4 h-4" /></button>
                    <button onClick={() => formatText('strike')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title={language === 'pl' ? 'Przekreślenie' : 'Strikethrough'}><Strikethrough className="w-4 h-4" /></button>
                  </div>

                  <div className="w-px h-6 bg-[#262626] mx-1 shrink-0"></div>

                  {/* Lists & Quotes */}
                  <div className="flex bg-[#161616] rounded-lg p-1 border border-[#262626] shrink-0">
                    <button onClick={() => formatText('bullet')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title={language === 'pl' ? 'Lista punktowa' : 'Bullet List'}><List className="w-4 h-4" /></button>
                    <button onClick={() => formatText('ordered')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title={language === 'pl' ? 'Lista numerowana' : 'Ordered List'}><ListOrdered className="w-4 h-4" /></button>
                    <button onClick={() => formatText('tasklist')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title={language === 'pl' ? 'Lista zadań' : 'Checklist'}><CheckSquare className="w-4 h-4" /></button>
                    <button onClick={() => formatText('quote')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title={language === 'pl' ? 'Cytat' : 'Quote'}><Quote className="w-4 h-4" /></button>
                  </div>

                  <div className="w-px h-6 bg-[#262626] mx-1 shrink-0"></div>

                  <div className="flex bg-[#161616] rounded-lg p-1 border border-[#262626] shrink-0">
                    <button onClick={() => formatText('code')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors" title={language === 'pl' ? 'Kod inline' : 'Inline Code'}><Code className="w-4 h-4" /></button>
                  </div>

                  <div className="w-px h-6 bg-[#262626] mx-1 shrink-0"></div>

                  {/* Extras */}
                  <div className="flex bg-[#161616] rounded-lg p-1 border border-[#262626] shrink-0">
                    <button onClick={() => formatText('details')} className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222222] rounded-md transition-colors flex items-center gap-1" title={language === 'pl' ? 'Zwijana sekcja' : 'Collapsible Block'}>
                      <ChevronDown className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline-block pr-1 font-mono">
                        {language === 'pl' ? 'Zwijane' : 'Collapsible'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => setIsSettingsPanelOpen(!isSettingsPanelOpen)}
                    className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${isSettingsPanelOpen ? 'text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                    title={language === 'pl' ? 'Ustawienia edytora' : 'Editor Settings'}
                  >
                    <Sliders className="w-4 h-4" />
                    <span className="text-xs font-bold hidden xl:inline-block tracking-wide">
                      {language === 'pl' ? 'Opcje' : 'Options'}
                    </span>
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-xl transition-colors border border-transparent"
                    title={language === 'pl' ? 'Usuń notatkę' : 'Delete note'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative font-sans">
                <div className="max-w-3xl mx-auto h-full flex flex-col">
                  <input
                    type="text"
                    value={activeNote.title}
                    onChange={handleTitleChange}
                    placeholder={language === 'pl' ? 'Tytuł notatki' : 'Note Title'}
                    className="w-full bg-transparent text-4xl font-display font-bold text-white mb-2 focus:outline-none placeholder:text-slate-600 shrink-0"
                  />
                  
                  <div className="flex flex-wrap gap-4 mb-8 text-sm shrink-0">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="font-bold">{language === 'pl' ? 'Folder:' : 'Folder:'}</span>
                      <input 
                        type="text"
                        value={activeNote.category || 'Notes'}
                        onChange={(e) => updateKnowledge(activeNote.id, { category: e.target.value })}
                        className="bg-transparent focus:outline-none focus:text-white border-b border-transparent focus:border-[#4ade80] transition-colors"
                        placeholder={language === 'pl' ? 'Folder' : 'Folder'}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="font-bold">{language === 'pl' ? 'Tagi:' : 'Tags:'}</span>
                      <input 
                        type="text"
                        value={(activeNote.tags || []).join(', ')}
                        onChange={(e) => updateKnowledge(activeNote.id, { tags: e.target.value.split(',').map(tElement => tElement.trim()).filter(Boolean) })}
                        className="bg-transparent focus:outline-none focus:text-white border-b border-transparent focus:border-[#4ade80] transition-colors min-w-[200px]"
                        placeholder={language === 'pl' ? 'oddziel tagi przecinkami' : 'comma separated tags'}
                      />
                    </div>
                    <div className="flex-1 text-right text-xs text-slate-600 self-center">
                      {language === 'pl' ? 'Zaktualizowano:' : 'Updated:'} {new Date(activeNote.updatedAt || Date.now()).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US')}{' '}
                      {new Date(activeNote.updatedAt || Date.now()).toLocaleTimeString(language === 'pl' ? 'pl-PL' : 'en-US')}
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    {editorSettings.renderMarkdown ? (
                      <MarkdownEditor 
                        content={activeNote.content}
                        onChange={handleContentChange}
                        editorRef={editorRef}
                        editorSettings={editorSettings}
                      />
                    ) : (
                      <textarea
                        value={activeNote.content}
                        onChange={(e) => handleContentChange(e.target.value)}
                        onPaste={handlePasteAndConvertLinks}
                        onKeyDown={handleKeyPressInRaw}
                        placeholder={language === 'pl' ? 'Zacznij pisać tutaj przy użyciu czystego formatu Markdown...' : 'Write here using natural Markdown syntax...'}
                        className="w-full flex-1 bg-transparent text-slate-300 font-mono text-sm leading-relaxed focus:outline-none resize-none min-h-[400px]"
                      />
                    )}

                    {activeNote.content === '' && editorSettings.showHelpText && (
                      <div className="mt-8 p-6 rounded-2xl bg-[#0c151a] border border-[#21353e] space-y-3 animate-fade-in text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5" />
                            {language === 'pl' ? 'Pomocnik Autouzupełniania Myśli' : 'Thoughts Autocomplete Assistant'}
                          </span>
                          <button 
                            onClick={() => {
                              let bulletSymbol = editorSettings.defaultBullet === 'dash' ? '-' : '*';
                              let demoNote = language === 'pl' 
                                ? `# Notatka robocza\n\n${bulletSymbol} Główna idea dająca początek planowaniu\n${bulletSymbol} Drugi podpunkt do zrealizowania\n\n### Lista Zadań\n${bulletSymbol} [ ] Przeanalizować cele tygodniowe\n${bulletSymbol} [ ] Wyznaczyć czas pracy w Pomodoro\n\n_Zapisano i uporządkowano w bazie danych._`
                                : `# Scratchpad Note\n\n${bulletSymbol} Primary concept driving this initiative\n${bulletSymbol} Secondary structural step\n\n### Checklist\n${bulletSymbol} [ ] Investigate weekly objectives\n${bulletSymbol} [ ] Run Pomodoro deep focus loops\n\n_Structured and saved in local cloud db._`;
                              handleContentChange(demoNote);
                            }}
                            className="text-[10px] font-bold uppercase tracking-wider bg-teal-400/10 hover:bg-teal-400/20 text-teal-300 px-3 py-1.5 rounded-lg border border-teal-400/30 transition-all font-sans cursor-pointer"
                          >
                            {language === 'pl' ? 'Wstaw szablon notatki' : 'Insert note template'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-sans">
                          {language === 'pl' 
                            ? 'Wskazówka: Możesz włączyć inteligentne poprawianie myślników, rozpoznawanie list zadań oraz automatyczne domykanie nawiasów w wysuwanym panelu "Opcje" po prawej stronie.'
                            : 'Tip: You can toggle markdown render filters, list checkboxes, smart auto-pairing brackets, and clipboard format parsers in the "Options" lateral drawer.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <Menu className="w-12 h-12 mb-4 opacity-20" />
              <p>{language === 'pl' ? 'Wybierz notatkę lub utwórz nową' : 'Select a note or create a new one'}</p>
            </div>
          )}
        </div>

        {/* Configurations Side Panel */}
        {activeNote && isSettingsPanelOpen && (
          <div className="w-85 border-l border-[#222222] bg-[#051115]/95 backdrop-blur-2xl p-6 flex flex-col h-full overflow-y-auto shrink-0 select-none text-slate-300 font-sans">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-400 animate-pulse" />
                <h3 className="text-xs font-bold text-teal-300 uppercase tracking-widest font-mono">
                  {language === 'pl' ? 'Opcje Edytora' : 'Editor Options'}
                </h3>
              </div>
              <button 
                onClick={() => setIsSettingsPanelOpen(false)}
                className="text-xs font-semibold px-2 py-1 rounded bg-[#161a1d] border border-[#2d3748] hover:border-slate-500 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                {language === 'pl' ? 'Zamknij' : 'Close'}
              </button>
            </div>

            <div className="space-y-6">
              
              {/* Option 1: Render Markdown */}
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={editorSettings.renderMarkdown}
                      onChange={e => setEditorSettings(prev => ({ ...prev, renderMarkdown: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${editorSettings.renderMarkdown ? 'bg-teal-500 border-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.4)]' : 'border-slate-600 bg-transparent'}`}>
                      {editorSettings.renderMarkdown && <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
                    </div>
                  </div>
                  <span className="text-sm font-semibold tracking-wide text-slate-200 group-hover:text-white transition-colors">
                    {language === 'pl' ? 'Renderowanie Markdown' : 'Render Markdown'}
                  </span>
                </label>
              </div>

              {/* Option 2: Recognize * as Task */}
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={editorSettings.recognizeAsteriskTask}
                      onChange={e => setEditorSettings(prev => ({ ...prev, recognizeAsteriskTask: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${editorSettings.recognizeAsteriskTask ? 'bg-teal-500 border-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.4)]' : 'border-slate-600 bg-transparent'}`}>
                      {editorSettings.recognizeAsteriskTask && <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
                    </div>
                  </div>
                  <span className="text-sm font-semibold tracking-wide text-slate-200 group-hover:text-white transition-colors">
                    {language === 'pl' ? 'Rozpoznaj * jako zadanie' : 'Recognize * as Task'}
                  </span>
                </label>
              </div>

              {/* Option 3: Recognize - as Task */}
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={editorSettings.recognizeDashTask}
                      onChange={e => setEditorSettings(prev => ({ ...prev, recognizeDashTask: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${editorSettings.recognizeDashTask ? 'bg-teal-500 border-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.4)]' : 'border-slate-600 bg-transparent'}`}>
                      {editorSettings.recognizeDashTask && <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
                    </div>
                  </div>
                  <span className="text-sm font-semibold tracking-wide text-slate-200 group-hover:text-white transition-colors">
                    {language === 'pl' ? 'Rozpoznaj - jako zadanie' : 'Recognize - as Task'}
                  </span>
                </label>
              </div>

              {/* Option 4: Recognize 1. as Task */}
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={editorSettings.recognizeNumberTask}
                      onChange={e => setEditorSettings(prev => ({ ...prev, recognizeNumberTask: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${editorSettings.recognizeNumberTask ? 'bg-teal-500 border-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.4)]' : 'border-slate-600 bg-transparent'}`}>
                      {editorSettings.recognizeNumberTask && <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
                    </div>
                  </div>
                  <span className="text-sm font-semibold tracking-wide text-slate-200 group-hover:text-white transition-colors">
                    {language === 'pl' ? 'Rozpoznaj 1. jako zadanie' : 'Recognize 1. as Task'}
                  </span>
                </label>
                <span className="text-[11px] text-slate-400 leading-relaxed">
                  {language === 'pl' 
                    ? 'Elementy ze standardowymi nawiasami kwadratowymi są domyślnie mapowane do bazy zadań * [ ]'
                    : 'Items with square brackets are parsed into standard Tasks * [ ]'}
                </span>
              </div>

              {/* Radio 1: Use * as default */}
              <div className="flex flex-col gap-1 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="radio" 
                      name="defaultBullet"
                      checked={editorSettings.defaultBullet === 'asterisk'}
                      onChange={() => setEditorSettings(prev => ({ ...prev, defaultBullet: 'asterisk' }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${editorSettings.defaultBullet === 'asterisk' ? 'bg-teal-500 border-teal-400' : 'border-slate-600 bg-transparent'}`}>
                      {editorSettings.defaultBullet === 'asterisk' && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {language === 'pl' ? 'Używaj * jako domyślnego' : 'Use * as default'}
                  </span>
                </label>
              </div>

              {/* Radio 2: Use dash (-) as default */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="radio" 
                      name="defaultBullet"
                      checked={editorSettings.defaultBullet === 'dash'}
                      onChange={() => setEditorSettings(prev => ({ ...prev, defaultBullet: 'dash' }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${editorSettings.defaultBullet === 'dash' ? 'bg-teal-500 border-teal-400' : 'border-slate-600 bg-transparent'}`}>
                      {editorSettings.defaultBullet === 'dash' && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {language === 'pl' ? 'Używaj myślnika (-) jako domyślnego' : 'Use dash (-) as default'}
                  </span>
                </label>
                <span className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  {language === 'pl' 
                    ? 'Skróty klawiszowe wygenerują domyślnie wybrany punktor listy.' 
                    : 'The tab shortcuts will insert the default chosen list bullet symbol.'}
                </span>
              </div>

              {/* Option 5: Show help text */}
              <div className="flex flex-col gap-2 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={editorSettings.showHelpText}
                      onChange={e => setEditorSettings(prev => ({ ...prev, showHelpText: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${editorSettings.showHelpText ? 'bg-teal-500 border-teal-400' : 'border-slate-600 bg-transparent'}`}>
                      {editorSettings.showHelpText && <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {language === 'pl' ? 'Pokazuj pomocniczy widget' : 'Show helper widgets'}
                  </span>
                </label>
              </div>

              {/* Option 6: Smart links */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={editorSettings.smartLinks}
                      onChange={e => setEditorSettings(prev => ({ ...prev, smartLinks: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${editorSettings.smartLinks ? 'bg-teal-500 border-teal-400' : 'border-slate-600 bg-transparent'}`}>
                      {editorSettings.smartLinks && <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {language === 'pl' ? 'Inteligentne linki markdown' : 'Smart Markdown links'}
                  </span>
                </label>
                <span className="text-[11px] text-slate-400 leading-relaxed">
                  {language === 'pl' 
                    ? 'Wklejane linki internetowe są automatycznie zamieniane na sformalizowane hiperłącza z nazwą domeny.' 
                    : 'Pasted links are converted into standard clean markdown elements with fast domain summaries.'}
                </span>
              </div>

              {/* Option 7: Auto pair brackets */}
              <div className="flex flex-col gap-1 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={editorSettings.autoPairBrackets}
                      onChange={e => setEditorSettings(prev => ({ ...prev, autoPairBrackets: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${editorSettings.autoPairBrackets ? 'bg-teal-500 border-teal-400' : 'border-slate-600 bg-transparent'}`}>
                      {editorSettings.autoPairBrackets && <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {language === 'pl' ? 'Automatycznie domykaj nawiasy' : 'Auto pair brackets'}
                  </span>
                </label>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
