import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.tsx'

export default function Signup() {
  const { user, signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password) {
      return setError('Please fill in every field.')
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('That email address doesn’t look right.')
    if (form.password.length < 8) return setError('Use at least 8 characters for your password.')
    if (form.password !== form.confirm) return setError('Passwords don’t match.')

    setBusy(true)
    try {
      await signup({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      navigate('/')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section auth">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h1>Create your account</h1>
        <p className="muted">Join to chat with our shop assistant about sizes, stock and the perfect gift.</p>

        <div className="row">
          <label>
            First name
            <input autoComplete="given-name" value={form.firstName} onChange={set('firstName')} maxLength={60} required />
          </label>
          <label>
            Last name
            <input autoComplete="family-name" value={form.lastName} onChange={set('lastName')} maxLength={60} required />
          </label>
        </div>
        <label>
          Email
          <input type="email" autoComplete="email" value={form.email} onChange={set('email')} maxLength={254} required />
        </label>
        <label>
          Password <small className="muted">(8+ characters)</small>
          <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} maxLength={128} required />
        </label>
        <label>
          Confirm password
          <input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} maxLength={128} required />
        </label>

        {error && <p className="form-message error" role="alert">{error}</p>}
        <button className="btn btn-block" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="muted small center">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </section>
  )
}
