import { Activity, BarChart3, CalendarDays, CalendarRange, Dumbbell, Gauge, Settings } from 'lucide-react'

export type Screen = 'dashboard' | 'plan' | 'month' | 'zones' | 'library' | 'progress' | 'settings'

const items = [
  { id: 'dashboard', label: 'Dash', icon: Activity },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'month', label: 'Month', icon: CalendarRange },
  { id: 'zones', label: 'Zones', icon: Gauge },
  { id: 'library', label: 'Library', icon: Dumbbell },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
] satisfies { id: Screen; label: string; icon: typeof Activity }[]

export function BottomNav({ active, onChange }: { active: Screen; onChange: (screen: Screen) => void }) {
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
    </nav>
  )
}
