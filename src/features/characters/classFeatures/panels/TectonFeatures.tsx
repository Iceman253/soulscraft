import { type FS, CountControl } from './controls'

export function TectonFeatures({ fs, onUpdate }: { fs: FS<'Tecton'>; onUpdate: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <div>
          <div className="text-xs text-stone-500 mb-1">Instant Crafts</div>
          <CountControl value={fs.state.instantCraftsRemaining} max={3}
            onDecrement={() => onUpdate({ instantCraftsRemaining: Math.max(0, fs.state.instantCraftsRemaining - 1) })}
            onIncrement={() => onUpdate({ instantCraftsRemaining: Math.min(3, fs.state.instantCraftsRemaining + 1) })} />
        </div>
        <div>
          <div className="text-xs text-stone-500 mb-1">Mechanist Charges</div>
          <CountControl value={fs.state.mechanistCharges} max={2}
            onDecrement={() => onUpdate({ mechanistCharges: Math.max(0, fs.state.mechanistCharges - 1) })}
            onIncrement={() => onUpdate({ mechanistCharges: Math.min(2, fs.state.mechanistCharges + 1) })} />
        </div>
      </div>
    </div>
  )
}
