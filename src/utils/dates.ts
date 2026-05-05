export function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISODate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}

export function getMonday(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  const day = copy.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  copy.setDate(copy.getDate() + diff)
  return copy
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function daysBetween(start: Date, end: Date) {
  const one = new Date(start)
  const two = new Date(end)
  one.setHours(0, 0, 0, 0)
  two.setHours(0, 0, 0, 0)
  return Math.floor((two.getTime() - one.getTime()) / 86_400_000)
}

export function formatFriendlyDate(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function defaultWeek1Start() {
  return toISODate(getMonday(new Date()))
}

export function raceDateFromWeek1(week1StartISO: string) {
  return toISODate(addDays(parseISODate(week1StartISO), 104))
}

export function week1FromRaceDate(raceDateISO: string) {
  return toISODate(addDays(parseISODate(raceDateISO), -104))
}
