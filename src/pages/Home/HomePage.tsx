import { HeroSection } from './sections/HeroSection'
import { AwardsSection } from './sections/AwardsSection'
import { STEAMSection } from './sections/STEAMSection'
import { UIShowcaseSection } from './sections/UIShowcaseSection'
import { StudentShowcaseSection } from './sections/StudentShowcaseSection'
import { CurriculumSection } from './sections/CurriculumSection'
import { FinalCTASection } from './sections/FinalCTASection'

export function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <HeroSection />
      <AwardsSection />
      <STEAMSection />
      <UIShowcaseSection />
      <StudentShowcaseSection />
      <CurriculumSection />
      <FinalCTASection />
    </div>
  )
}
