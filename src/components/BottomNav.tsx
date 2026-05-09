import { Activity, BarChart3, CalendarRange, Dumbbell, Gauge, HeartPulse } from 'lucide-react'

export type Screen = 'dashboard' | 'calendar' | 'zones' | 'library' | 'progress' | 'settings'

const items = [
  { id: 'dashboard', label: 'Dash', icon: Activity },
  { id: 'calendar', label: 'Calendar', icon: CalendarRange },
  { id: 'zones', label: 'Zones', icon: Gauge },
  { id: 'library', label: 'Library', icon: Dumbbell },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
] satisfies { id: Screen; label: string; icon: typeof Activity }[]

const stridesyncUrl = import.meta.env.VITE_STRIDESYNC_URL || 'http://localhost:5173/?trainingTab=1'

export function BottomNav({ active, onChange }: { active: Screen; onChange: (screen: Screen) => void }) {
  function openStrideSync() {
    window.location.assign(stridesyncUrl)
  }

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            className={active === item.id ? 'nav-item active' : 'nav-item'}
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        )
      })}
      <button className="nav-item nav-item-stridesync" type="button" onClick={openStrideSync}>
        <HeartPulse size={20} aria-hidden="true" />
        <span>StrideSync</span>
      </button>
    </nav>
  )
}
