import { Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import type { Workout } from '../data/trainingPlan'
import { copyWorkoutText } from '../utils/workouts'

const GARMIN_WEB_WORKOUTS_URL = 'https://connect.garmin.com/modern/workouts'
const GARMIN_IOS_APP_URL = 'gcm-ciq://'
const GARMIN_IOS_STORE_URL = 'https://apps.apple.com/us/app/garmin-connect/id583446403'
const GARMIN_ANDROID_INTENT_URL =
  'intent://connect.garmin.com/modern/workouts#Intent;scheme=https;package=com.garmin.android.apps.connectmobile;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.garmin.android.apps.connectmobile;end'

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

  function openGarmin() {
    const userAgent = window.navigator.userAgent
    const isIphone = /iPhone/.test(userAgent)
    const isAndroid = /Android/.test(userAgent)

    if (isIphone) {
      window.location.href = GARMIN_IOS_APP_URL
      window.setTimeout(() => {
        if (!document.hidden) {
          window.location.href = GARMIN_IOS_STORE_URL
        }
      }, 900)
      return
    }

    if (isAndroid) {
      window.location.href = GARMIN_ANDROID_INTENT_URL
      return
    }

    window.open(GARMIN_WEB_WORKOUTS_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="button-row utility-row">
      <button className="secondary-button" type="button" onClick={copy}>
        <Copy size={18} aria-hidden="true" />
        {copied ? 'Copied' : 'Copy Workout'}
      </button>
      <button className="secondary-button" type="button" onClick={openGarmin}>
        <ExternalLink size={18} aria-hidden="true" />
        Garmin
      </button>
    </div>
  )
}
