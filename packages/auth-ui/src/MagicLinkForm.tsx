"use client"

import { useState, type FormEvent } from "react"

export interface MagicLinkFormProps {
  onSubmit: (email: string) => void | Promise<void>
  submitting?: boolean
  className?: string
}

// Owns only the email field and submit affordance. It never calls Supabase
// (or any provider) directly -- the host wires signInWithOtp (or its
// equivalent) into onSubmit, so this component stays provider-agnostic.
export function MagicLinkForm({ onSubmit, submitting, className }: MagicLinkFormProps) {
  const [email, setEmail] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email) return
    void onSubmit(email)
  }

  return (
    <form className={className} data-avatark-component="magic-link-form" onSubmit={handleSubmit}>
      <label data-avatark-part="email-label" htmlFor="auth-ui-email">
        Email
      </label>
      <input
        id="auth-ui-email"
        data-avatark-part="email-input"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <button type="submit" data-avatark-part="submit" disabled={submitting}>
        Send magic link
      </button>
    </form>
  )
}
