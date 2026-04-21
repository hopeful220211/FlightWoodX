import { HeroSection } from './sections/HeroSection'
import { AwardsSection } from './sections/AwardsSection'
import { WhyUsSection } from './sections/WhyUsSection'
import { ProductDemoSection } from './sections/ProductDemoSection'
import { StudentGallerySection } from './sections/StudentGallerySection'
import { CurriculumSection } from './sections/CurriculumSection'
import { ForWhoSection } from './sections/ForWhoSection'
import { LovedBySection } from './sections/LovedBySection'
import { FinalCTASection } from './sections/FinalCTASection'
import { Footer } from '../../components/layout/Footer'

export function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <AwardsSection />
      <WhyUsSection />
      <ProductDemoSection />
      <StudentGallerySection />
      <CurriculumSection />
      <ForWhoSection />
      <LovedBySection />
      <FinalCTASection />
      <Footer />
    </div>
  )
}
