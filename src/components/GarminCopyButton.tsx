import { Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import type { Workout } from '../data/trainingPlan'
import { copyWorkoutText } from '../utils/workouts'

export function GarminCopyButton({ workout, week1Start }: { workout: Workout; week1Start: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const text = copyWorkoutText(workout, week1Start)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="button-row utility-row">
      <button className="secondary-button" type="button" onClick={copy}>
        <Copy size={18} aria-hidden="true" />
        {copied ? 'Copied' : 'Copy Workout'}
      </button>
      <a className="secondary-button" href="https://connect.garmin.com/modern/workouts" target="_blank" rel="noreferrer">
        <ExternalLink size={18} aria-hidden="true" />
        Garmin
      </a>
    </div>
  )
}
