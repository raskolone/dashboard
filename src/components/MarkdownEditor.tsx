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
}

export function MarkdownEditor({ content, onChange, editorRef }: MarkdownEditorProps) {
  const isUpdating = useRef(false);

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
    },
    onUpdate: ({ editor }) => {
      isUpdating.current = true;
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);
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
      const currentMarkdown = turndownService.turndown(currentHtml);
      
      if (currentMarkdown !== content.trim() && currentMarkdown !== content) {
        Promise.resolve(marked.parse(content || '')).then(html => {
          editor.commands.setContent(html as string, { emitUpdate: false });
        });
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
}
