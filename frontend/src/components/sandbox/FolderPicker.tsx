import { useState, useEffect, useCallback } from 'react'
import { Folder, FolderOpen, ChevronRight, ChevronUp, HardDrive, RefreshCw, Monitor } from 'lucide-react'
import { apiBrowseDirectory, type BrowseEntry, type BrowseResult } from '../../types/sandbox'

interface FolderPickerProps {
  onSelect: (path: string) => void
  onCancel: () => void
}

export default function FolderPicker({ onSelect, onCancel }: FolderPickerProps) {
  const [currentPath, setCurrentPath] = useState('')
  const [entries, setEntries] = useState<BrowseEntry[]>([])
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isDriveList = currentPath === 'drives'

  const loadDir = useCallback(async (path: string) => {
    setLoading(true)
    setError('')
    try {
      const data: BrowseResult = await apiBrowseDirectory(path || undefined)
      setCurrentPath(data.path)
      setParentPath(data.parent)
      // 只显示目录
      setEntries(data.entries.filter(e => e.is_dir))
    } catch (e: any) {
      setError(e.message || '加载目录失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDir('')
  }, [loadDir])

  const navigateTo = (path: string) => {
    loadDir(path)
  }

  const navigateUp = () => {
    if (parentPath) loadDir(parentPath)
  }

  // 获取路径各段，支持面包屑导航
  const pathParts = currentPath.split(/[/\\]/).filter(Boolean)

  // 面包屑导航组件
  const renderBreadcrumb = () => (
    <div className="flex items-center gap-1 text-xs text-text-muted overflow-x-auto">
      {isDriveList ? (
        <span className="flex items-center gap-1 text-text-primary">
          <Monitor className="w-3.5 h-3.5" />
          此电脑
        </span>
      ) : (
        <>
          {/* 盘符列表入口 */}
          <button
            onClick={() => loadDir('drives')}
            className="flex items-center gap-1 hover:text-primary transition-colors shrink-0"
          >
            <Monitor className="w-3.5 h-3.5" />
            此电脑
          </button>
          {pathParts.map((part, idx) => {
            const subPath = currentPath.split(/[/\\]/).slice(0, idx + 1).join('\\')
            return (
              <span key={idx} className="flex items-center gap-1 shrink-0">
                <ChevronRight className="w-3 h-3" />
                {idx === 0 ? (
                  <button onClick={() => navigateTo(subPath)} className="hover:text-primary transition-colors flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    {part}
                  </button>
                ) : (
                  <button onClick={() => navigateTo(subPath)} className="hover:text-primary transition-colors">
                    {part}
                  </button>
                )}
              </span>
            )
          })}
        </>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-border-secondary rounded-2xl w-full max-w-xl max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-secondary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-text-primary">选择目录</h3>
          </div>
          <button
            onClick={() => loadDir(currentPath)}
            className="text-text-tertiary hover:text-primary transition-colors"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* 面包屑路径 */}
        <div className="px-5 py-2 bg-surface-2 border-b border-border-tertiary">
          {renderBreadcrumb()}
        </div>

        {/* 目录列表 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-text-muted text-sm">
              加载中...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-danger text-sm">
              {error}
            </div>
          ) : (
            <div className="py-1">
              {/* 返回上级 */}
              {parentPath && (
                <button
                  onClick={navigateUp}
                  className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-surface-2 transition-colors text-left"
                >
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                  <span className="text-sm text-text-secondary">..</span>
                </button>
              )}
              {entries.map(entry => (
                <button
                  key={entry.path}
                  onClick={() => navigateTo(entry.path)}
                  className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-surface-2 transition-colors text-left group"
                >
                  {isDriveList ? (
                    <HardDrive className="w-4 h-4 text-primary/70 group-hover:text-primary shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-warning/70 group-hover:text-warning shrink-0" />
                  )}
                  <span className="text-sm text-text-primary truncate">{entry.name}</span>
                  {entry.error && (
                    <span className="text-xs text-text-muted shrink-0">({entry.error})</span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-text-tertiary ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {!parentPath && entries.length === 0 && (
                <div className="text-center py-12 text-text-muted text-sm">
                  当前目录为空
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="px-5 py-3 border-t border-border-secondary bg-surface-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-mono truncate max-w-[60%]" title={currentPath}>
              {isDriveList ? '此电脑' : currentPath}
            </span>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-1 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => onSelect(currentPath)}
                disabled={isDriveList}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                选择此目录
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
