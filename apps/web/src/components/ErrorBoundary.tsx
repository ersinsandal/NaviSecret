import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white/90 border border-slate-200 shadow-sm rounded-2xl m-3 text-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 mb-3 shadow-xs">
            <span className="text-xl">⚠️</span>
          </div>
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Something went wrong
          </h2>
          <p className="text-xs text-slate-500 mb-4 max-w-sm">
            An unexpected error occurred while loading this view.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00B894] text-white hover:bg-[#00a382] transition-transform active:scale-95 shadow-xs cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
