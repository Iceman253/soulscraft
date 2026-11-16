import { useLogStore } from '../log/store'

interface Props {
  /** 'lg' for the phone layout's larger type. */
  size?: 'sm' | 'lg'
}

/** Read-only session log for players — same entries the GM sees in the right
 *  rail, newest first. Players get no add/delete controls. */
export function PlayerSessionLog({ size = 'sm' }: Props) {
  const entries = useLogStore(s => s.entries)

  const text = size === 'lg' ? 'text-base' : 'text-sm'
  const time = size === 'lg' ? 'text-sm' : 'text-xs'

  if (entries.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-stone-500 py-10">
        <span className="text-2xl">📜</span>
        <span className={text}>Nothing has been chronicled yet.</span>
      </div>
    )
  }

  return (
    <div className="divide-y divide-stone-800">
      {entries.map(e => (
        <div key={e.id} className="px-4 py-2.5">
          <div className={`${time} text-stone-600 font-mono tabular-nums`}>
            {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className={`${text} text-stone-300 leading-snug`}>{e.text}</div>
        </div>
      ))}
    </div>
  )
}
