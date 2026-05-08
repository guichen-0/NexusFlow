import { useState } from 'react'
import { MessageCircle, User, CheckCircle, XCircle, Clock, Copy, Check, Play } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useSandboxStore } from '../../stores/sandboxStore'

interface CodeExecution {
  language: string
  exit_code: number
  stdout: string
  stderr: string
  duration_ms: number
  success: boolean
  timed_out: boolean
}

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  executions?: CodeExecution[]
}

function ExecutionResult({ exec }: { exec: CodeExecution }) {
  const [copied, setCopied] = useState(false)
  const outputText = exec.stdout || exec.stderr

  const handleCopy = () => {
    if (outputText) {
      navigator.clipboard.writeText(outputText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="mt-1.5 rounded-lg overflow-hidden border border-border-tertiary">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-tertiary text-xs">
        <div className="flex items-center gap-1.5">
          {exec.timed_out ? (
            <Clock className="w-3.5 h-3.5 text-warning" />
          ) : exec.success ? (
            <CheckCircle className="w-3.5 h-3.5 text-success" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-danger" />
          )}
          <span className="text-text-secondary">
            {exec.timed_out ? 'Timed out' : exec.success ? 'Success' : `Error (exit ${exec.exit_code})`}
          </span>
          <span className="text-text-tertiary">|</span>
          <span className="text-text-tertiary">{exec.duration_ms}ms</span>
          <span className="text-text-tertiary">|</span>
          <span className="text-text-tertiary">{exec.language}</span>
        </div>
        {outputText && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      {outputText && (
        <pre className="px-3 py-2 text-xs text-text-secondary overflow-auto max-h-40 bg-background font-mono whitespace-pre-wrap">
          {outputText}
        </pre>
      )}
    </div>
  )
}

function CodeBlockWithRun({ children, className, codeText }: { children: React.ReactNode; className?: string; codeText: string }) {
  const [copied, setCopied] = useState(false)
  const { executeCode, togglePanel, setPanelOpen, activeWorkspaceId, createWorkspace, isExecuting } = useSandboxStore()

  const langMatch = className?.match(/language-(\w+)/)
  const lang = langMatch ? langMatch[1] : 'text'

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRunInSandbox = async () => {
    const mappedLang = lang === 'py' ? 'python' : lang === 'js' ? 'javascript' : lang === 'ts' ? 'javascript' : lang
    if (!['python', 'javascript', 'typescript'].includes(mappedLang)) {
      alert(`暂不支持在沙箱中运行 ${lang}`)
      return
    }
    // 如果没有工作空间，自动创建
    if (!activeWorkspaceId) {
      await createWorkspace()
    }
    // 确保面板打开
    setPanelOpen(true)
    try {
      await executeCode(codeText, mappedLang)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const isRunnable = ['python', 'py', 'javascript', 'js', 'typescript', 'ts'].includes(lang)

  return (
    <div className="relative group rounded-lg overflow-hidden">
      {/* 代码块工具栏 */}
      <div className="absolute top-0 right-0 flex items-center gap-0.5 px-2 py-1 bg-surface-tertiary/90 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {lang && (
          <span className="text-xs text-text-tertiary mr-2">{lang}</span>
        )}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-text-tertiary hover:text-text-secondary hover:bg-surface-2 transition-colors"
          title="复制"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
        {isRunnable && (
          <button
            onClick={handleRunInSandbox}
            disabled={isExecuting}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            title="在沙箱中运行"
          >
            <Play className="w-3 h-3" />
          </button>
        )}
      </div>
      <pre className="bg-background rounded-lg p-3 overflow-x-auto pt-7">
        <code className="text-xs">{children}</code>
      </pre>
    </div>
  )
}

export default function ChatMessage({ role, content, isStreaming, executions }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 px-4 py-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MessageCircle className="w-4 h-4 text-primary" />
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'order-1' : ''}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-primary text-white rounded-br-md whitespace-pre-wrap'
              : 'bg-surface-2 text-text-primary rounded-bl-md'
          }`}
        >
          {isUser ? (
            content
          ) : (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  pre: ({ children }) => {
                    // 提取代码文本
                    const codeEl = (children as any)?.props?.children
                    const codeText = typeof codeEl === 'string' ? codeEl : ''
                    const className = (children as any)?.props?.className
                    return <CodeBlockWithRun className={className} codeText={codeText}>{children}</CodeBlockWithRun>
                  },
                  code: ({ children, className }) => {
                    const isInline = !className
                    if (isInline) {
                      return <code className="bg-surface-tertiary px-1.5 py-0.5 rounded text-xs">{children}</code>
                    }
                    return <code className="text-xs">{children}</code>
                  },
                }}
              >
                {content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-current align-text-bottom animate-pulse ml-0.5" />
              )}
            </div>
          )}
        </div>

        {!isUser && executions && executions.length > 0 && !isStreaming && (
          <div className="space-y-1.5 mt-1.5">
            {executions.map((exec, idx) => (
              <ExecutionResult key={idx} exec={exec} />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 order-2">
          <User className="w-4 h-4 text-accent" />
        </div>
      )}
    </div>
  )
}
