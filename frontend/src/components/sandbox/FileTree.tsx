import { useState, useMemo } from 'react'
import {
  File, Folder, FolderOpen, ChevronRight, Plus, Trash2, FileCode,
  FileJson, FileText, Image, RefreshCw, FolderTree,
} from 'lucide-react'

interface FileTreeProps {
  files: string[]
  activeFile?: string | null
  onSelectFile?: (path: string) => void
  onCreateFile?: (path: string) => void
  onDeleteFile?: (path: string) => void
  onRefresh?: () => void
  loading?: boolean
}

interface TreeNode {
  name: string
  path: string
  isDir: boolean
  children: TreeNode[]
}

function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode[] = []
  for (const filePath of files) {
    const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean)
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      const isDir = i < parts.length - 1
      const path = parts.slice(0, i + 1).join('/')
      let existing = current.find(n => n.name === name && n.isDir === isDir)
      if (!existing) {
        existing = { name, path, isDir, children: [] }
        current.push(existing)
      }
      current = existing.children
    }
  }
  return sortTree(root)
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    .map(n => ({ ...n, children: sortTree(n.children) }))
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'py': return <FileCode className="w-4 h-4 text-green-400" />
    case 'js': case 'ts': case 'jsx': case 'tsx':
      return <FileCode className="w-4 h-4 text-yellow-400" />
    case 'json': return <FileJson className="w-4 h-4 text-orange-400" />
    case 'md': case 'txt': case 'rst':
      return <FileText className="w-4 h-4 text-blue-400" />
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg':
      return <Image className="w-4 h-4 text-pink-400" />
    default: return <File className="w-4 h-4 text-text-muted" />
  }
}

function TreeNodeItem({ node, depth, activeFile, onSelectFile, onDeleteFile }: {
  node: TreeNode; depth: number; activeFile?: string | null
  onSelectFile?: (path: string) => void; onDeleteFile?: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(depth < 1)

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1.5 py-1.5 px-2 text-sm hover:bg-surface-2/80 rounded-lg transition-all duration-150 group"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <ChevronRight className={`w-3 h-3 text-text-muted transition-transform duration-200 shrink-0 ${expanded ? 'rotate-90' : ''}`} />
          {expanded ? <FolderOpen className="w-4 h-4 text-warning shrink-0" /> : <Folder className="w-4 h-4 text-warning/60 shrink-0" />}
          <span className="truncate text-text-secondary text-xs font-medium">{node.name}</span>
        </button>
        <div className={`overflow-hidden transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 h-0'}`}>
          {expanded && node.children.map(child => (
            <TreeNodeItem key={child.path} node={child} depth={depth + 1} activeFile={activeFile} onSelectFile={onSelectFile} onDeleteFile={onDeleteFile} />
          ))}
        </div>
      </div>
    )
  }

  const isActive = activeFile === node.name || activeFile === node.path

  return (
    <button
      onClick={() => onSelectFile?.(node.path)}
      className={`w-full flex items-center gap-1.5 py-1.5 px-2 text-xs rounded-lg transition-all duration-150 group relative ${
        isActive ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-surface-2/80 hover:text-text-primary'
      }`}
      style={{ paddingLeft: `${depth * 14 + 20}px` }}
    >
      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />}
      {getFileIcon(node.name)}
      <span className="truncate">{node.name}</span>
      {onDeleteFile && (
        <span onClick={(e) => { e.stopPropagation(); onDeleteFile(node.path) }} className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all cursor-pointer p-0.5 rounded hover:bg-danger/10">
          <Trash2 className="w-3 h-3" />
        </span>
      )}
    </button>
  )
}

export default function FileTree({ files, activeFile, onSelectFile, onCreateFile, onDeleteFile, onRefresh, loading }: FileTreeProps) {
  const [creating, setCreating] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const tree = useMemo(() => buildTree(files), [files])

  const handleCreate = () => {
    const name = newFileName.trim()
    if (!name) return
    onCreateFile?.(name)
    setNewFileName('')
    setCreating(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
        <div className="flex items-center gap-1.5">
          <FolderTree className="w-3.5 h-3.5 text-primary/60" />
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Files</span>
        </div>
        <div className="flex items-center gap-0.5">
          {onRefresh && (
            <button onClick={onRefresh} className="p-1 text-text-muted hover:text-primary rounded-md hover:bg-primary/10 transition-all duration-200" title="刷新">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onCreateFile && (
            <button onClick={() => setCreating(true)} className="p-1 text-text-muted hover:text-primary rounded-md hover:bg-primary/10 transition-all duration-200" title="新建文件">
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading && files.length === 0 ? (
          <div className="px-3 py-8 text-center text-text-muted text-xs">加载中...</div>
        ) : tree.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-surface-2/50 flex items-center justify-center animate-float">
              <FolderTree className="w-5 h-5 text-text-muted/50" />
            </div>
            <p className="text-xs text-text-muted mb-1">暂无文件</p>
            {onCreateFile && (
              <button onClick={() => setCreating(true)} className="text-[11px] text-primary hover:underline mt-1">
                创建第一个文件
              </button>
            )}
          </div>
        ) : (
          tree.map(node => (
            <TreeNodeItem key={node.path} node={node} depth={0} activeFile={activeFile} onSelectFile={onSelectFile} onDeleteFile={onDeleteFile} />
          ))
        )}
      </div>

      {/* New file input — slide animation */}
      {creating && (
        <div className="relative z-20 px-3 py-2 border-t border-border/40 animate-in">
          <div className="flex items-center gap-1">
            <input
              type="text" value={newFileName} onChange={e => setNewFileName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewFileName('') } }}
              placeholder="文件名 (如 main.py)" autoFocus
              className="flex-1 bg-surface-2/80 border border-border/50 rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200"
            />
            <button onClick={handleCreate} className="px-2.5 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:shadow-md hover:shadow-primary/20 transition-all duration-200">创建</button>
          </div>
        </div>
      )}
    </div>
  )
}
