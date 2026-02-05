import { useEffect } from 'react'
import { useLearningStore } from '../stores/learningStore'
import { useProfileStore } from '../stores/profileStore'
import { useSettingsStore } from '../stores/settingsStore'

export function useHydrate() {
  const hydrateSettings = useSettingsStore((s) => s.hydrate)
  const hydrateProfile = useProfileStore((s) => s.hydrate)
  const hydrateLearning = useLearningStore((s) => s.hydrate)

  useEffect(() => {
    hydrateSettings()
    hydrateProfile()
    hydrateLearning()
  }, [hydrateLearning, hydrateProfile, hydrateSettings])
}

