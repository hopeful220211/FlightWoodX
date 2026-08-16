import React, { Component } from 'react'
import type { ReactNode } from 'react'

interface PartErrorBoundaryProps {
  children: ReactNode
  partId: string
}

interface PartErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * 专门用于 GLBPart 的 ErrorBoundary
 * 当单个模型加载失败时，只渲染该模型为 null，不影响其他模型
 */
export class PartErrorBoundary extends Component<PartErrorBoundaryProps, PartErrorBoundaryState> {
  constructor(props: PartErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): PartErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[PartErrorBoundary] Failed to render part ${this.props.partId}:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // 静默失败：不渲染任何内容，让其他零件继续正常显示
      console.warn(`[PartErrorBoundary] Part ${this.props.partId} failed to render, skipping...`)
      return null
    }

    return this.props.children
  }
}
