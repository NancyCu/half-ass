import fs from 'node:fs/promises'
import { trainingPlan } from '../src/data/trainingPlan'
import { createTrainingPlanExport } from '../src/lib/trainingPlanExport'

const OUTPUT_PATH = '/tmp/half-ass-training-plan-export.json'

async function main() {
  const payload = createTrainingPlanExport({
    weeks: trainingPlan,
    settings: {
      week1Start: '2026-05-04',
      raceDate: '2026-08-16',
    },
  })

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  const plannedWorkoutCount = payload.plan.weeks.reduce((sum, week) => sum + week.days.length, 0)
  console.log(`Wrote ${plannedWorkoutCount} planned workout export record(s) to ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
