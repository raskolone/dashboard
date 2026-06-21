import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { marked } from 'marked';
import TurndownService from 'turndown';

import { Node, mergeAttributes } from '@tiptap/core';

import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';

const DetailsComponent = (props: any) => {
  return (
    <NodeViewWrapper as="details" open={props.node.attrs.open} onClick={(e: React.MouseEvent) => {
      // Allow toggle
      if ((e.target as HTMLElement).tagName.toLowerCase() === 'summary') {
        props.updateAttributes({
          open: !props.node.attrs.open,
        });
      }
    }}>
      <NodeViewContent />
    </NodeViewWrapper>
  );
};

const Details = Node.create({
  name: 'details',
  group: 'block',
  content: 'summary block+',
  parseHTML() {
    return [{ tag: 'details' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes(HTMLAttributes), 0];
  },
  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: element => element.hasAttribute('open'),
        renderHTML: attributes => {
          if (!attributes.open) {
            return {};
          }
          return { open: 'open' };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(DetailsComponent);
  },
});

const Summary = Node.create({
  name: 'summary',
  content: 'text*',
  parseHTML() {
    return [{ tag: 'summary' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['summary', mergeAttributes(HTMLAttributes), 0];
  },
});

// Configure Turndown Service to convert HTML back to Markdown
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});

turndownService.keep(['details', 'summary']);

interface MarkdownEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  editorRef?: React.MutableRefObject<any>;
  editorSettings?: {
    renderMarkdown: boolean;
    recognizeAsteriskTask: boolean;
    recognizeDashTask: boolean;
    recognizeNumberTask: boolean;
    defaultBullet: string;
    showHelpText: boolean;
    smartLinks: boolean;
    autoPairBrackets: boolean;
  };
}

export function MarkdownEditor({ content, onChange, editorRef, editorSettings }: MarkdownEditorProps) {
  const isUpdating = useRef(false);

  const defaultSettings = {
    renderMarkdown: true,
    recognizeAsteriskTask: true,
    recognizeDashTask: true,
    recognizeNumberTask: false,
    defaultBullet: 'dash',
    showHelpText: true,
    smartLinks: true,
    autoPairBrackets: true
  };

  const activeSettings = editorSettings || defaultSettings;

  const settingsRef = useRef(activeSettings);
  useEffect(() => {
    settingsRef.current = activeSettings;
  }, [activeSettings]);

  const turndown = React.useMemo(() => {
    const defaultMarker = activeSettings.defaultBullet === 'asterisk' ? '*' : '-';
    const td = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: defaultMarker,
      codeBlockStyle: 'fenced'
    });
    td.keep(['details', 'summary']);
    return td;
  }, [activeSettings.defaultBullet]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Zacznij pisać tutaj... Możesz korzystać z Markdown (np. wpisz # a następnie spację).',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Details,
      Summary,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none w-full max-w-none text-slate-300 markdown-container min-h-[500px]',
      },
      handleKeyDown(view, event) {
        const settings = settingsRef.current;
        const { state } = view;
        const { selection } = state;
        const { from, to } = selection;

        // Auto pairing brackets
        if (settings.autoPairBrackets) {
          if (event.key === '[') {
            event.preventDefault();
            const tr = state.tr.insertText('[]', from, to);
            const newTr = tr.setSelection((selection as any).constructor.create(tr.doc, from + 1));
            view.dispatch(newTr);
            return true;
          }
          if (event.key === '(') {
            event.preventDefault();
            const tr = state.tr.insertText('()', from, to);
            const newTr = tr.setSelection((selection as any).constructor.create(tr.doc, from + 1));
            view.dispatch(newTr);
            return true;
          }
          if (event.key === '{') {
            event.preventDefault();
            const tr = state.tr.insertText('{}', from, to);
            const newTr = tr.setSelection((selection as any).constructor.create(tr.doc, from + 1));
            view.dispatch(newTr);
            return true;
          }
        }

        // Recognize keys as Task list on Space key
        if (event.key === ' ' && selection.empty) {
          const { $from } = selection;
          const textContentBeforeCursor = $from.parent.textBetween(0, $from.parentOffset);

          if (textContentBeforeCursor === '*' && settings.recognizeAsteriskTask) {
            event.preventDefault();
            const tr = state.tr.delete($from.pos - 1, $from.pos);
            view.dispatch(tr);
            editor?.commands.toggleTaskList();
            return true;
          }

          if (textContentBeforeCursor === '-' && settings.recognizeDashTask) {
            event.preventDefault();
            const tr = state.tr.delete($from.pos - 1, $from.pos);
            view.dispatch(tr);
            editor?.commands.toggleTaskList();
            return true;
          }

          if (textContentBeforeCursor === '1.' && settings.recognizeNumberTask) {
            event.preventDefault();
            const tr = state.tr.delete($from.pos - 2, $from.pos);
            view.dispatch(tr);
            editor?.commands.toggleTaskList();
            return true;
          }
        }

        return false;
      },
      handlePaste(view, event) {
        const settings = settingsRef.current;
        if (!settings.smartLinks) return false;

        const text = event.clipboardData?.getData('text') || '';
        const urlRegex = /^(https?:\/\/[^\s]+)$/g;
        if (urlRegex.test(text.trim())) {
          event.preventDefault();
          let domain = 'Link';
          try {
            const urlObj = new URL(text.trim());
            domain = urlObj.hostname.replace('www.', '');
          } catch {}

          const { state } = view;
          const { selection } = state;
          const { from, to } = selection;

          const mark = state.schema.marks.link?.create({ href: text.trim() });
          const textNode = state.schema.text(domain, mark ? [mark] : []);
          const tr = state.tr.replaceWith(from, to, textNode);
          view.dispatch(tr);
          return true;
        }

        return false;
      }
    },
    onUpdate: ({ editor }) => {
      isUpdating.current = true;
      const html = editor.getHTML();
      const markdown = turndown.turndown(html);
      onChange(markdown);
      
      setTimeout(() => {
        isUpdating.current = false;
      }, 50);
    },
  });

  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  useEffect(() => {
    if (editor && content !== undefined && !isUpdating.current) {
      const currentHtml = editor.getHTML();
      const currentMarkdown = turndown.turndown(currentHtml);
      
      if (currentMarkdown !== content.trim() && currentMarkdown !== content) {
        Promise.resolve(marked.parse(content || '')).then(html => {
          editor.commands.setContent(html as string, { emitUpdate: false });
        });
      }
    }
  }, [content, editor, turndown]);

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
}
