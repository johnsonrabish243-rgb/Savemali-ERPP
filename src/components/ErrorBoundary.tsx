import * as React from "react"

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-xl font-semibold text-foreground">Une erreur est survenue</h1>
            <p className="text-sm text-muted-foreground">
              L'application a rencontré un problème. Veuillez rafraîchir la page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Rafraîchir
            </button>
            <details className="text-left text-xs text-muted-foreground mt-4">
              <summary>Détails techniques</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words bg-muted p-2 rounded">
                {this.state.error?.message}
              </pre>
            </details>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
