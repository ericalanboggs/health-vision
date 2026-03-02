import React from 'react'
import { trackEvent } from '../lib/posthog'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    trackEvent('app_error_boundary', {
      error_message: error?.message,
      error_stack: error?.stack?.substring(0, 500),
      component_stack: errorInfo?.componentStack?.substring(0, 500),
    })
  }

  handleRefresh = () => {
    window.location.reload()
  }

  handleTryAgain = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          padding: '24px',
        }}>
          <div style={{
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '40px 32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              &#9888;&#65039;
            </div>
            <h1 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#1a1a1a',
              margin: '0 0 12px 0',
            }}>
              Something went wrong
            </h1>
            <p style={{
              fontSize: '15px',
              color: '#6a6a6a',
              margin: '0 0 28px 0',
              lineHeight: 1.5,
            }}>
              An unexpected error occurred. You can try again or refresh the page.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleTryAgain}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleRefresh}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
