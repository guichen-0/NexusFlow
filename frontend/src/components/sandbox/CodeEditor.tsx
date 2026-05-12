import { useRef, useEffect, useCallback } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { lintKeymap } from '@codemirror/lint'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, indentOnInput } from '@codemirror/language'
import { tags } from '@lezer/highlight'

type Language = 'python' | 'javascript' | 'typescript' | 'bash'

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: Language
  readOnly?: boolean
  placeholder?: string
  onSubmit?: () => void
  minHeight?: string
}

const languageExtensions: Record<Language, () => ReturnType<typeof python> | ReturnType<typeof javascript>> = {
  python: () => python(),
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  bash: () => javascript(),
}

function nexusTheme(dark: boolean) {
  return EditorView.theme({
    '&': {
      backgroundColor: dark ? '#0e0e16' : '#fafbfe',
      color: dark ? '#e2e8f0' : '#1a1a2e',
      fontSize: '13.5px',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      height: '100%',
    },
    '.cm-content': {
      caretColor: '#6366f1',
      padding: '8px 0',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#6366f1',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: dark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)',
    },
    '.cm-activeLine': {
      backgroundColor: dark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.03)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: dark ? 'rgba(99, 102, 241, 0.07)' : 'rgba(99, 102, 241, 0.05)',
    },
    '.cm-gutters': {
      backgroundColor: dark ? '#0a0a12' : '#f5f6fa',
      color: dark ? '#3a3f55' : '#aab0c0',
      borderRight: `1px solid ${dark ? '#1a1a2e' : '#e8ebf0'}`,
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px 0 12px',
      minWidth: '3em',
    },
    '.cm-foldGutter .cm-gutterElement': {
      padding: '0 4px',
      color: dark ? '#4a5068' : '#9ca3af',
    },
    '.cm-matchingBracket': {
      backgroundColor: dark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)',
      outline: `1px solid ${dark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)'}`,
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(250, 204, 21, 0.2)',
      outline: '1px solid rgba(250, 204, 21, 0.4)',
    },
    '.cm-tooltip': {
      backgroundColor: dark ? '#1a1a2e' : '#ffffff',
      border: `1px solid ${dark ? '#2a2a3e' : '#e5e7eb'}`,
      color: dark ? '#e2e8f0' : '#1a1a2e',
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li': { padding: '2px 8px', borderRadius: '4px' },
      '& > ul > li[aria-selected]': {
        backgroundColor: dark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
      },
    },
    '.cm-panels': {
      backgroundColor: dark ? '#12121a' : '#f8f9fc',
      color: dark ? '#e2e8f0' : '#1a1a2e',
    },
    '.cm-panel.cm-search': {
      backgroundColor: dark ? '#1a1a2e' : '#ffffff',
      borderRadius: '0 0 8px 8px',
    },
  }, { dark })
}

const nexusHighlightStyle = syntaxHighlighting(defaultHighlightStyle, { fallback: true })

export default function CodeEditor({
  value, onChange, language = 'python', readOnly = false, placeholder, onSubmit, minHeight = '200px',
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const isDark = document.documentElement.classList.contains('dark')

  const submitKeymap = onSubmit ? keymap.of([{ key: 'Mod-Enter', run: () => { onSubmit(); return true } }]) : []

  const createView = useCallback(() => {
    if (!containerRef.current) return
    viewRef.current?.destroy()

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      foldGutter(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      highlightSelectionMatches(),
      keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...lintKeymap, indentWithTab]),
      submitKeymap,
      nexusTheme(isDark),
      nexusHighlightStyle,
      languageExtensions[language](),
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
    ]

    if (placeholder) extensions.push(EditorView.contentAttributes.of({ 'aria-placeholder': placeholder }))
    if (onChange) {
      extensions.push(EditorView.updateListener.of((update) => {
        if (update.docChanged) onChangeRef.current?.(update.state.doc.toString())
      }))
    }

    viewRef.current = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: containerRef.current,
    })
  }, [language, readOnly, isDark])

  useEffect(() => {
    createView()
    return () => { viewRef.current?.destroy(); viewRef.current = null }
  }, [createView])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      className="overflow-auto rounded-lg border border-border/40 shadow-inner shadow-black/5 focus-within:border-primary/30 focus-within:shadow-primary/5 transition-all duration-300"
      style={{ minHeight }}
    />
  )
}
