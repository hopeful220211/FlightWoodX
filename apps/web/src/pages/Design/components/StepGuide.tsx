import { STEP_INFO } from '@fwx/parts-schema'
import type { BuildStep } from '@fwx/parts-schema'

interface StepGuideProps {
  currentStep: BuildStep
  canAdvance: boolean
  advanceReason?: string
}

const STEP_HELP: Record<BuildStep, string> = {
  HUB: '不同形状的主板适合不同飞行风格：圆形稳、十字形灵活、多边形个性。',
  ARM: '4臂最常见（四轴），6臂更稳（六轴），8臂用于载重。机臂会对称安装。',
  MOTOR: '电机让螺旋桨转起来，螺旋桨把空气向下推，无人机就飞起来了。',
  GUARD: '三种保护罩：一体版保护最强但最重、分体版更轻更灵活、半体版折中。',
  DECO: '衔接件把上下两层主板连起来，让结构更牢固。必须对称安装。',
  REVIEW: '检查总重量、重心位置、推重比和对称性，看看你的无人机能不能飞！',
}

export function StepGuide({ currentStep, canAdvance, advanceReason }: StepGuideProps) {
  const info = STEP_INFO[currentStep]
  const help = STEP_HELP[currentStep]

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-gray-800">
          第 {info.number} 步 · {info.label}
        </h3>
        <p className="text-sm text-gray-600 mt-1">{info.description}</p>
      </div>

      <div className="bg-tech-50 border border-tech-100 rounded-lg p-3">
        <p className="text-xs text-tech-700">{help}</p>
      </div>

      {!canAdvance && advanceReason && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700">{advanceReason}</p>
        </div>
      )}

      {canAdvance && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-700">可以进入下一步了！</p>
        </div>
      )}
    </div>
  )
}
