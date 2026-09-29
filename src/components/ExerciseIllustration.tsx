import React, { useEffect, useMemo, useState } from 'react'
import {
  getAssetUrl,
  getExercise,
  searchExercises,
  type Exercise as WorkoutGuideExercise,
  type ExerciseSearchFilters,
} from '@bryllim/workout-guide'
import { Sparkles } from 'lucide-react'

const FRAME_DURATION_MS = 720
const ANIMATION_SEQUENCE = [0, 1] as const

type ExerciseIllustrationProps = {
  exerciseId?: string
  exerciseName?: string
  legacyVisual?: string
  animated?: boolean
  singleFrame?: boolean
  showLabel?: boolean
}

export function resolveWorkoutGuideExercise(exerciseId?: string, exerciseName?: string) {
  const directMatch = exerciseId ? getExercise(exerciseId) : null
  if (directMatch) return directMatch
  if (!exerciseName) return null
  return searchExercises(exerciseName)[0] ?? null
}

export function searchWorkoutGuideExercises(query = '', filters: ExerciseSearchFilters = {}) {
  return searchExercises(query, filters)
}

function ExerciseIllustrationFallback({ legacyVisual }: { legacyVisual?: string }) {
  if (!legacyVisual) {
    return <div className="exercise-visual exercise-placeholder exercise-illustration-fallback" role="img" aria-label="Exercise illustration unavailable"><Sparkles size={25} /><span>Illustration coming soon</span></div>
  }

  return <div className={`exercise-visual exercise-${legacyVisual} exercise-illustration-fallback`} role="img" aria-label="Exercise illustration unavailable"><div className="exercise-ground" /><div className="exercise-person"><span className="exercise-head" /><span className="exercise-body" /><span className="exercise-arm arm-left" /><span className="exercise-arm arm-right" /><span className="exercise-leg leg-left" /><span className="exercise-leg leg-right" /></div><span className="exercise-spark spark-one" /><span className="exercise-spark spark-two" /></div>
}

export function ExerciseIllustration({ exerciseId, exerciseName, legacyVisual, animated = true, singleFrame = false, showLabel = true }: ExerciseIllustrationProps) {
  const guideExercise = useMemo<WorkoutGuideExercise | null>(() => resolveWorkoutGuideExercise(exerciseId, exerciseName), [exerciseId, exerciseName])
  const frameUrls = useMemo(() => guideExercise?.frames.filter((frame) => frame.index !== 2).map((frame) => getAssetUrl(guideExercise.id, frame.index)).filter((url): url is string => Boolean(url)) ?? [], [guideExercise])
  const displayFrameUrls = useMemo(() => singleFrame ? frameUrls.slice(0, 1) : frameUrls, [frameUrls, singleFrame])
  const [sequencePosition, setSequencePosition] = useState(0)
  const [assetFailed, setAssetFailed] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    setSequencePosition(0)
    setAssetFailed(false)
  }, [guideExercise?.id])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)
    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    if (!animated || prefersReducedMotion || assetFailed || displayFrameUrls.length < 2) return
    const timer = window.setInterval(() => setSequencePosition((position) => (position + 1) % ANIMATION_SEQUENCE.length), FRAME_DURATION_MS)
    return () => window.clearInterval(timer)
  }, [animated, assetFailed, displayFrameUrls.length, prefersReducedMotion])

  if (!guideExercise || frameUrls.length === 0 || assetFailed) return <ExerciseIllustrationFallback legacyVisual={legacyVisual} />

  const activeFrame = displayFrameUrls[ANIMATION_SEQUENCE[sequencePosition % ANIMATION_SEQUENCE.length] % displayFrameUrls.length]
  const label = `${guideExercise.name} demonstration`

  return <div className="exercise-visual exercise-guide-visual" role="img" aria-label={label}><div className="exercise-guide-stage">{displayFrameUrls.map((url) => <img key={url} className={`exercise-guide-frame ${url === activeFrame ? 'is-active' : ''}`} src={url} alt="" aria-hidden="true" onError={() => setAssetFailed(true)} />)}</div>{showLabel && <span className="exercise-guide-label">MOTION GUIDE</span>}</div>
}

export function WorkoutGuideCredits() {
  return <p className="workout-guide-credits">Illustrations by <a href="https://bryllim.com" target="_blank" rel="noreferrer">Bryl Lim</a> · original poses <a href="https://github.com/everkinetic/data" target="_blank" rel="noreferrer">Everkinetic</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a></p>
}
