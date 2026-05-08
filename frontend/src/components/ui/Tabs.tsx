import { useState, createContext, useContext, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface TabsContextValue {
  activeTab: string
  setActiveTab: (id: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

interface TabsProps {
  defaultValue: string
  children: ReactNode
  className?: string
  onValueChange?: (value: string) => void
}

export function Tabs({ defaultValue, children, className, onValueChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue)

  const handleSetActiveTab = (id: string) => {
    setActiveTab(id)
    onValueChange?.(id)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 bg-surface-2/50 rounded-lg border border-border/50',
        className
      )}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function TabsTrigger({ value, children, className, disabled }: TabsTriggerProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')

  const isActive = context.activeTab === value

  return (
    <button
      onClick={() => !disabled && context.setActiveTab(value)}
      disabled={disabled}
      className={cn(
        'relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        isActive
          ? 'text-text-primary bg-surface-2 shadow-sm'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
      {isActive && (
        <span className="absolute inset-x-1 bottom-0 h-0.5 bg-gradient-to-r from-primary to-accent rounded-full" />
      )}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')

  if (context.activeTab !== value) return null

  return (
    <div className={cn('mt-4 animate-in', className)}>
      {children}
    </div>
  )
}
