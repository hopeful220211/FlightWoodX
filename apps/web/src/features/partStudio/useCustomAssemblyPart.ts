import { useQuery } from '@tanstack/react-query'
import { CustomPartSourceSchema, type DesignPartInstance } from '@fwx/parts-schema'
import { useAuthStore } from '../../stores/authStore'
import { getCustomPart } from '../../utils/api'
import { resolveCustomPart } from './customAssembly'

export function useCustomAssemblyPart(instance: DesignPartInstance) {
  const token = useAuthStore(state => state.token)
  const ownerId = useAuthStore(state => state.user?.id)
  const source = instance.source
  return useQuery({
    queryKey: ['custom-assembly-part', ownerId, source?.id, source?.version, source?.updatedAt, instance.category],
    enabled: !!token && !!ownerId && !!source,
    queryFn: async () => {
      if (!source) throw new Error('零件缺少来源引用')
      const reference = CustomPartSourceSchema.parse(source)
      const response = await getCustomPart(reference.id)
      if (useAuthStore.getState().token !== token) throw new Error('登录账号已改变，请重新打开作品')
      if (!response.success || !response.data) throw new Error(response.error || '原零件已删除或无权访问；作品中的引用仍保留')
      return resolveCustomPart(response.data, instance, ownerId)
    },
    retry: false,
    staleTime: 0,
  })
}
