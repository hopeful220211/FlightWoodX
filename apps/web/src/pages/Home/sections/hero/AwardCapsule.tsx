import { Trophy } from 'lucide-react'

interface AwardCapsuleProps {
  onClick?: () => void
  delay?: number
}

export function AwardCapsule({ onClick, delay = 0 }: AwardCapsuleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-accent-gold bg-paper-100 px-4 py-2 text-[13px] font-medium text-ink-700 transition-colors hover:border-accent-gold/80 hover:bg-paper-200"
      style={{
        opacity: 0,
        transform: 'translateY(12px)',
        animation: `fadeInUp 500ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms forwards`,
      }}
    >
      <Trophy size={14} className="text-accent-gold" />
      <span>Red Dot 2024 · iF 2026 · IDEA · G-Mark</span>
    </button>
  )
}
