import React, { Component } from 'react'
import type { ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    // 更新 state，以便下一次渲染将显示回退 UI
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)

    // 关键一步：清除本地存储，打破崩溃循环
    console.log('Clearing localStorage to prevent crash loop...')
    localStorage.clear()

    // 你也可以在这里记录错误到服务器
  }

  render() {
    if (this.state.hasError) {
      // 你可以渲染任何自定义的回退 UI
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>应用出错了。</h1>
          <p>我们已经清除了缓存，请尝试刷新页面。</p>
          <button onClick={() => window.location.reload()}>刷新</button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
