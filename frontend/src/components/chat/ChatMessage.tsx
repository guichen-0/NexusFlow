import { useState, useEffect, useRef } from 'react'
import { MessageCircle, User, CheckCircle, XCircle, Clock, Copy, Check, Play, ChevronDown, ChevronRight, Brain, Users, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useSandboxStore } from '../../stores/sandboxStore'
import type { AgentPipelineBlock } from '../../stores/chatStore'

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
  thinkingContent?: string
  isThinkingStreaming?: boolean
  agentPipeline?: AgentPipelineBlock[]
  isAgentResult?: boolean
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
    if (!activeWorkspaceId) {
      await createWorkspace()
    }
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

function ThinkingBlock({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isStreaming && expanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content, isStreaming, expanded])

  return (
    <div className="mb-2 rounded-xl border border-border-tertiary overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/50 transition-colors"
      >
        <Brain className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        {expanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
        <span className="truncate">
          {isStreaming ? '思考中...' : '思考过程'}
        </span>
        {isStreaming && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
        )}
      </button>
      {expanded && (
        <div
          ref={contentRef}
          className="px-3 pb-2 text-xs text-text-secondary leading-relaxed max-h-48 overflow-y-auto bg-surface-tertiary/30 whitespace-pre-wrap border-t border-border-tertiary"
        >
          {content}
          {isStreaming && (
            <span className="inline-block w-0.5 h-3 bg-purple-400 align-text-bottom animate-pulse ml-0.5" />
          )}
        </div>
      )}
    </div>
  )
}


function AgentPipelineBlock({ block }: { block: AgentPipelineBlock }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`mb-2 rounded-xl border overflow-hidden ${
      block.status === 'error' ? 'border-danger/30' : 'border-accent/20'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-tertiary/50 transition-colors"
      >
        {block.status === 'error' ? (
          <XCircle className="w-3.5 h-3.5 text-danger shrink-0" />
        ) : (
          <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
        )}
        {expanded ? <ChevronDown className="w-3 h-3 shrink-0 text-text-tertiary" /> : <ChevronRight className="w-3 h-3 shrink-0 text-text-tertiary" />}
        <span className="font-medium text-text-primary">{block.agent_name}</span>
        {block.tokens && block.tokens.total_tokens > 0 && (
          <span className="text-text-tertiary ml-auto flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {block.tokens.total_tokens} tok
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-2 text-xs text-text-secondary leading-relaxed max-h-60 overflow-y-auto bg-surface-tertiary/30 whitespace-pre-wrap border-t border-border-tertiary">
          {block.status === 'error' ? (
            <span className="text-danger">{block.error}</span>
          ) : (
            block.output
          )}
        </div>
      )}
    </div>
  )
}


export default function ChatMessage({
  role, content, isStreaming, executions, thinkingContent,
  isThinkingStreaming, agentPipeline, isAgentResult,
}: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 px-4 py-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isAgentResult ? 'bg-accent/10' : 'bg-primary/10'
        }`}>
          {isAgentResult ? (
            <Users className="w-4 h-4 text-accent" />
          ) : (
            <MessageCircle className="w-4 h-4 text-primary" />
          )}
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'order-1' : ''}`}>
        {/* 思考过程（仅 assistant） */}
        {!isUser && thinkingContent && (
          <ThinkingBlock content={thinkingContent} isStreaming={isThinkingStreaming} />
        )}

        {/* Agent 流水线块 */}
        {!isUser && agentPipeline && agentPipeline.length > 0 && (
          <div className="mb-2">
            {agentPipeline.map((block) => (
              <AgentPipelineBlock key={block.agent_id} block={block} />
            ))}
          </div>
        )}

        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-primary text-white rounded-br-md whitespace-pre-wrap'
              : isAgentResult
                ? 'bg-accent/5 border border-accent/20 text-text-primary rounded-bl-md'
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
