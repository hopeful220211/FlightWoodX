import { Box } from '@react-three/drei'
import type { PartInstance } from '../../types/design'

interface PlaceholderPartProps {
  instance: PartInstance
}

export function PlaceholderPart({ instance }: PlaceholderPartProps) {
  return (
    <Box
      args={[0.2, 0.2, 0.5]}
      position={instance.position}
      rotation={instance.rotation}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={'#E5D9C4'} />
    </Box>
  )
}

