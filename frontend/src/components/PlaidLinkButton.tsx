import React, { useState, useEffect, useCallback } from 'react'
import { usePlaidLink, type PlaidLinkOnSuccess } from 'react-plaid-link'
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react'

interface PlaidLinkButtonProps {
  onSuccess: () => void
}

export const PlaidLinkButton: React.FC<PlaidLinkButtonProps> = ({ onSuccess }) => {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [exchanging, setExchanging] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const generateToken = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/plaid/create_link_token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error_message || data.error || 'Failed to create link token')
      }
      setToken(data.link_token)
    } catch (err: any) {
      setError(err.message || 'Error generating link token')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    generateToken()
  }, [generateToken])

  const handleOnSuccess: PlaidLinkOnSuccess = useCallback(
    async (public_token, metadata) => {
      if (!public_token) return
      setExchanging(true)
      setError(null)
      try {
        const response = await fetch('/api/plaid/exchange_public_token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token,
            institution_id: metadata?.institution?.institution_id,
            institution_name: metadata?.institution?.name,
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error_message || 'Failed to exchange public token')
        }
        // Regenerate link token for potential future links
        generateToken()
        onSuccess()
      } catch (err: any) {
        setError(err.message || 'Error exchanging token')
      } finally {
        setExchanging(false)
      }
    },
    [generateToken, onSuccess]
  )

  const { open, ready } = usePlaidLink({
    token,
    onSuccess: handleOnSuccess,
  })

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={() => open()}
        disabled={!ready || loading || exchanging}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition shadow-sm cursor-pointer"
      >
        {loading || exchanging ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <PlusCircle className="w-4 h-4" />
        )}
        {exchanging
          ? 'Linking Account...'
          : loading
          ? 'Initializing Plaid...'
          : 'Connect Account with Plaid'}
      </button>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 px-3 py-1.5 rounded-md mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
          <button
            onClick={generateToken}
            className="underline ml-2 hover:text-rose-300 font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
