import * as Blockly from 'blockly'

/**
 * 先在临时工作区验证 XML，避免损坏数据清空用户当前画布。
 */
export function restoreWorkspaceXml(workspace: Blockly.Workspace, xml: string, validate?: (candidate: Blockly.Workspace) => void): boolean {
  const validationWorkspace = new Blockly.Workspace()
  let previous: Element | null = null
  try {
    // Blockly.textToDom 会在 XML 解析失败后用 HTML 解析器容错，例如未闭合标签也会被
    // 当成空工作区成功恢复。持久化草稿要严格验证，避免把损坏数据静默覆盖。
    const document = new DOMParser().parseFromString(xml, 'application/xml')
    const dom = document.documentElement
    if (document.getElementsByTagName('parsererror').length > 0 || dom.nodeName.toLowerCase() !== 'xml') {
      throw new Error('Invalid Blockly XML')
    }
    Blockly.Xml.domToWorkspace(dom, validationWorkspace)
    validate?.(validationWorkspace)
    previous = Blockly.Xml.workspaceToDom(workspace)
    workspace.clear()
    Blockly.Xml.domToWorkspace(dom, workspace)
    return true
  } catch {
    if (previous) {
      workspace.clear()
      Blockly.Xml.domToWorkspace(previous, workspace)
    }
    return false
  } finally {
    validationWorkspace.dispose()
  }
}
