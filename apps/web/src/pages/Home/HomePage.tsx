import { HeroSection } from './sections/HeroSection'
import { AwardsSection } from './sections/AwardsSection'
import { WhyUsSection } from './sections/WhyUsSection'
import { ProductDemoSection } from './sections/ProductDemoSection'
import { StudentShowcaseSection } from './sections/StudentShowcaseSection'
import { CurriculumSection } from './sections/CurriculumSection'
import { FinalCTASection } from './sections/FinalCTASection'

export function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <AwardsSection />
      <WhyUsSection />
      <ProductDemoSection />
      <StudentShowcaseSection />
      <CurriculumSection />
      <FinalCTASection />
    </div>
  )
}
