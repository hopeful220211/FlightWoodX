import React, { Component } from 'react'
import type { ReactNode } from 'react'
import { Html, useGLTF } from '@react-three/drei'
import { partsData } from '../../data/parts'

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
 * 单个模型失败时保留其他零件，提供可见错误和重新加载入口。
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
      const part = partsData.find(p => p.id === this.props.partId)
      return <Html center>
        <div role="alert" className="w-56 rounded-xl border border-red-200 bg-white p-4 text-center text-sm shadow-lg">
          <p className="text-gray-700">{part?.name ?? '零件'}加载失败</p>
          <button type="button" className="mt-3 rounded-lg bg-sky-500 px-4 py-2 text-white" onClick={() => {
            if (part) useGLTF.clear(part.modelUrl)
            this.setState({ hasError: false, error: null })
          }}>重新加载</button>
        </div>
      </Html>
    }

    return this.props.children
  }
}
