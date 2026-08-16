import * as Blockly from 'blockly'

/**
 * 把持久化的 XML 恢复进工作区。失败时清理可能已部分写入的积木，
 * 并把结果交给调用方决定是否保留原草稿。
 */
export function restoreWorkspaceXml(workspace: Blockly.Workspace, xml: string): boolean {
  try {
    // Blockly.textToDom 会在 XML 解析失败后用 HTML 解析器容错，例如未闭合标签也会被
    // 当成空工作区成功恢复。持久化草稿要严格验证，避免把损坏数据静默覆盖。
    const document = new DOMParser().parseFromString(xml, 'application/xml')
    const dom = document.documentElement
    if (document.getElementsByTagName('parsererror').length > 0 || dom.nodeName.toLowerCase() !== 'xml') {
      throw new Error('Invalid Blockly XML')
    }
    workspace.clear()
    Blockly.Xml.domToWorkspace(dom, workspace)
    return true
  } catch {
    workspace.clear()
    return false
  }
}
