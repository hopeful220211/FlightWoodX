import * as Blockly from 'blockly'
import './blocks'
import { compileWorkspace } from './compiler'
import { restoreWorkspaceXml } from './restoreWorkspaceXml'

/** Run the saved blocks themselves, never an older or mismatched cached IR. */
export function compileWorkspaceXml(xml: string, meta: { name: string; author: string }) {
  const workspace = new Blockly.Workspace()
  try {
    if (!restoreWorkspaceXml(workspace, xml)) throw new Error('程序积木无法读取，请返回编程页检查')
    return compileWorkspace(workspace, meta)
  } finally {
    workspace.dispose()
  }
}
