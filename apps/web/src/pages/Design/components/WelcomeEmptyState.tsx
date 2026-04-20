import { Box } from 'lucide-react'

interface WelcomeEmptyStateProps {
  onStartNew: () => void
  onViewHistory?: () => void
  historyCount: number
}

export function WelcomeEmptyState({ onStartNew, onViewHistory, historyCount }: WelcomeEmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gradient-to-br from-wood-50 to-tech-50">
      <div className="text-center max-w-md px-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-lg bg-wood-100 flex items-center justify-center mb-6">
          <Box className="w-10 h-10 text-wood-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          开始设计你的第一架木质无人机
        </h1>
        <p className="text-gray-500 mb-8">
          我们会一步步引导你完成搭建
        </p>

        {/* Primary CTA */}
        <button
          onClick={onStartNew}
          className="w-full max-w-xs mx-auto block px-8 py-4 text-lg font-semibold text-white bg-wood-600 rounded-lg hover:bg-wood-700 shadow-lg hover:shadow-xl transition-all"
        >
          开始新设计
        </button>

        {/* Secondary: View History */}
        {onViewHistory && historyCount > 0 && (
          <button
            onClick={onViewHistory}
            className="mt-4 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
          >
            查看我以前的设计（{historyCount} 个）
          </button>
        )}

        {/* Footer note */}
        <p className="mt-8 text-xs text-gray-400">
          完成后你可以将作品发布到作品展示区
        </p>
      </div>
    </div>
  )
}
