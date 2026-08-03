'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SelectOption } from '../../contracts/adapters.ts'
import { filterOptions } from '../../data/geography.ts'

// Generic filterable text-input + listbox, no new runtime dependency (see
// data/geography.ts's header comment for why). Two modes:
// - Strict (default): the committed `value` only ever changes when an
//   option is clicked. Typed text that matches nothing reverts to the last
//   committed value's label on blur -- used for Country/State/City, where a
//   fabricated free-value would be a real data-integrity problem.
// - `allowFreeText`: every keystroke commits immediately (a real combobox,
//   not a strict picker) -- used for Organization, where a name not yet in
//   the suggestion list must still be accepted.
export function SearchableSelect({
  value, onChange, options, placeholder, allowFreeText = false, disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  allowFreeText?: boolean
  disabled?: boolean
}) {
  const resolvedLabel = (v: string) => options.find((o) => o.value === v)?.label ?? (allowFreeText ? v : '')
  const [query, setQuery] = useState(resolvedLabel(value))
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) setQuery(resolvedLabel(value))
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery(resolvedLabel(value))
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options, allowFreeText])

  const filtered = useMemo(() => filterOptions(query, options).slice(0, 50), [query, options])

  function selectOption(option: SelectOption) {
    onChange(option.value)
    setQuery(option.label)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (allowFreeText) onChange(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); selectOption(filtered[0]) }
          if (e.key === 'Escape') { setOpen(false); setQuery(resolvedLabel(value)) }
        }}
        className="w-full mt-1 rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)] disabled:opacity-50"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-[#1c1c26] bg-[var(--surface,#12121a)] text-sm shadow-lg">
          {filtered.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => selectOption(o)}
                className="block w-full px-3 py-1.5 text-left text-[var(--text-primary,#f5f2ea)] hover:bg-white/5"
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
