import { useState, useRef, useEffect } from 'react'

interface EditableTextProps {
  value: string
  onSave: (val: string) => void
  className?: string
  placeholder?: string
  multiline?: boolean
}

export function EditableText({ value, onSave, className = '', placeholder = 'Click to edit...', multiline }: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  const commit = () => { setEditing(false); if (draft !== value) onSave(draft) }

  if (editing) {
    const sharedProps = {
      ref,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!multiline && e.key === 'Enter') commit()
        if (e.key === 'Escape') { setEditing(false); setDraft(value) }
      },
      className: `bg-stone-900 border border-gold/50 rounded px-2 py-1 text-stone-100 outline-none w-full ${className}`,
    }
    return multiline
      ? <textarea {...sharedProps} rows={3} />
      : <input type="text" {...sharedProps} />
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-text hover:bg-stone-700/50 rounded px-1 -mx-1 transition-colors ${value ? '' : 'text-stone-500 italic'} ${className}`}
    >
      {value || placeholder}
    </span>
  )
}
