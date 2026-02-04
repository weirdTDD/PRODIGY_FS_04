import { useState } from 'react'

export function AuthScreen({ onLogin, onRegister, isLoading, error }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      if (mode === 'login') {
        await onLogin(email, password)
      } else {
        await onRegister(email, password)
      }
    } catch {
      // errors handled in the auth hook
    }
  }

  return (
    <div className="flex min-h-[560px] flex-col items-center justify-center gap-6 rounded-[32px] bg-white px-6 py-10 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-800">
          Welcome to WebSocket Chat
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to join rooms and receive real-time updates.
        </p>
      </div>

      <div className="flex rounded-full bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`px-4 py-2 text-sm font-semibold transition ${
            mode === 'login'
              ? 'rounded-full bg-blue-500 text-white'
              : 'text-slate-500'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`px-4 py-2 text-sm font-semibold transition ${
            mode === 'register'
              ? 'rounded-full bg-blue-500 text-white'
              : 'text-slate-500'
          }`}
        >
          Register
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
          required
        />

        {error && (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-600 disabled:bg-slate-300"
        >
          {isLoading
            ? 'Please wait...'
            : mode === 'login'
            ? 'Sign In'
            : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
