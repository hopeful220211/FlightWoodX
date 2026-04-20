import { useState } from 'react'
import { Button } from '../common/Button'
import { Card } from '../common/Card'
import { testModelConnectors } from '../../utils/testConnectors'
import { Eye, X } from 'lucide-react'

export function ConnectorDebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<string>('')
  const [testing, setTesting] = useState(false)

  const testModel = async (modelUrl: string, modelName: string) => {
    setTesting(true)
    setResults(`正在测试 ${modelName}...\n`)

    // 捕获控制台输出
    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error
    let output = ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log = (...args: any[]) => {
      output += args.join(' ') + '\n'
      originalLog(...args)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.warn = (...args: any[]) => {
      output += '⚠️ ' + args.join(' ') + '\n'
      originalWarn(...args)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error = (...args: any[]) => {
      output += '❌ ' + args.join(' ') + '\n'
      originalError(...args)
    }

    try {
      await testModelConnectors(modelUrl)
    } catch (error) {
      output += `\n错误: ${error}\n`
    }

    // 恢复控制台
    console.log = originalLog
    console.warn = originalWarn
    console.error = originalError

    setResults(output)
    setTesting(false)
  }

  const testAllNewModels = async () => {
    await testModel('/models/core_plate_02.glb', '机身02')
    await new Promise(resolve => setTimeout(resolve, 500))
    await testModel('/models/arm_02.glb', '机臂02')
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-tech-500 text-white shadow-lg hover:bg-tech-600"
        title="打开连接点调试面板"
      >
        <Eye size={20} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[600px] max-h-[80vh] overflow-hidden">
      <Card hoverable={false} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold">连接点调试面板</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-wood-50 dark:hover:bg-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 mb-3">
          <Button
            size="sm"
            onClick={() => testModel('/models/core_plate_01.glb', '机身01')}
            disabled={testing}
          >
            测试机身01
          </Button>
          <Button
            size="sm"
            onClick={() => testModel('/models/core_plate_02.glb', '机身02')}
            disabled={testing}
          >
            测试机身02
          </Button>
          <Button
            size="sm"
            onClick={() => testModel('/models/arm_01.glb', '机臂01')}
            disabled={testing}
          >
            测试机臂01
          </Button>
          <Button
            size="sm"
            onClick={() => testModel('/models/arm_02.glb', '机臂02')}
            disabled={testing}
          >
            测试机臂02
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={testAllNewModels}
            disabled={testing}
          >
            测试所有新模型
          </Button>
        </div>

        <div className="rounded-lg bg-slate-950 p-3 overflow-auto max-h-[500px]">
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
            {results || '点击上方按钮测试模型连接点...'}
          </pre>
        </div>

        <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          <p>💡 提示：空物体命名格式应为：</p>
          <ul className="list-disc list-inside mt-1">
            <li>conn_socket_01, conn_socket_02 (接收点)</li>
            <li>conn_plug_01, conn_plug_02 (连接点)</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
