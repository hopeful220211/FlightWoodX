import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  readdirSync,
  statSync,
} from 'node:fs'
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export const MAX_AGENTS_BYTES = 16 * 1024

export const REQUIRED_GOVERNANCE_FILES = Object.freeze([
  'AGENTS.md',
  'ARCHITECTURE.md',
  'CURRENT_STATUS.md',
  'apps/web/AGENTS.md',
  'apps/api/AGENTS.md',
  'packages/AGENTS.md',
  'docs/index.md',
  'docs/product-specs/core-flow.md',
  'docs/quality/HARNESS.md',
  'docs/quality/QUALITY_SCORE.md',
  'docs/quality/SECURITY.md',
  'docs/quality/RELIABILITY.md',
  'docs/quality/TECH_DEBT.md',
  'docs/exec-plans/index.md',
  '.agents/skills/flightwoodx-development/SKILL.md',
  '.agents/skills/flightwoodx-development/agents/openai.yaml',
])

export const KEY_MARKDOWN_FILES = Object.freeze([
  ...REQUIRED_GOVERNANCE_FILES.filter((filePath) => filePath.endsWith('.md')),
  'README.md',
  'CLAUDE.md',
])

export const ALLOWED_REPOSITORY_SKILLS = Object.freeze([
  'flightwoodx-development',
])

export const DOCUMENTS_REQUIRING_METADATA = Object.freeze([
  'docs/index.md',
  'docs/product-specs/core-flow.md',
  'docs/quality/HARNESS.md',
  'docs/quality/QUALITY_SCORE.md',
  'docs/quality/SECURITY.md',
  'docs/quality/RELIABILITY.md',
  'docs/quality/TECH_DEBT.md',
  'docs/exec-plans/index.md',
])

const REQUIRED_DOCUMENT_METADATA = ['状态', '更新时间', '适用范围', '替代关系']
const GOVERNED_DOCUMENT_DIRECTORIES = [
  'docs/product-specs',
  'docs/quality',
  'docs/exec-plans',
]

const SOURCE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
])
const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]
const FORBIDDEN_PACKAGE_RUNTIME_DEPENDENCIES = new Set([
  'express',
  'mongoose',
  'react',
  'react-dom',
])
const FILESYSTEM_MODULES = new Set(['fs', 'node:fs', 'fs/promises', 'node:fs/promises'])
const FILESYSTEM_SINGLE_PATH_METHODS = new Set([
  'access',
  'accessSync',
  'appendFile',
  'appendFileSync',
  'chmod',
  'chmodSync',
  'chown',
  'chownSync',
  'createReadStream',
  'createWriteStream',
  'exists',
  'existsSync',
  'glob',
  'globSync',
  'lchmod',
  'lchmodSync',
  'lchown',
  'lchownSync',
  'lstat',
  'lstatSync',
  'lutimes',
  'lutimesSync',
  'mkdir',
  'mkdirSync',
  'mkdtemp',
  'mkdtempDisposable',
  'mkdtempSync',
  'open',
  'openAsBlob',
  'openSync',
  'opendir',
  'opendirSync',
  'readFile',
  'readFileSync',
  'readdir',
  'readdirSync',
  'readlink',
  'readlinkSync',
  'realpath',
  'realpathSync',
  'rm',
  'rmSync',
  'rmdir',
  'rmdirSync',
  'stat',
  'statfs',
  'statfsSync',
  'statSync',
  'truncate',
  'truncateSync',
  'unlink',
  'unlinkSync',
  'unwatchFile',
  'utimes',
  'utimesSync',
  'watch',
  'watchFile',
  'writeFile',
  'writeFileSync',
])
const FILESYSTEM_DUAL_PATH_METHODS = new Set([
  'copyFile',
  'copyFileSync',
  'cp',
  'cpSync',
  'link',
  'linkSync',
  'rename',
  'renameSync',
  'symlink',
  'symlinkSync',
])
const FILESYSTEM_METHODS = new Set([
  ...FILESYSTEM_SINGLE_PATH_METHODS,
  ...FILESYSTEM_DUAL_PATH_METHODS,
])
const PATH_METHODS = new Set(['join', 'resolve'])
const MANIFEST_ENTRY_FIELDS = ['main', 'module', 'types', 'typings']
const STYLE_EXTENSIONS = new Set(['.css', '.less', '.sass', '.scss'])
const SAFE_REQUIRE_PROPERTIES = new Set(['cache', 'extensions', 'main'])
const WALK_IGNORES = new Set(['.git', 'coverage', 'dist', 'dist-cjs', 'node_modules'])

function sourceExtension(filePath) {
  return filePath.slice(filePath.lastIndexOf('.'))
}

function isSourceFile(filePath) {
  return SOURCE_EXTENSIONS.has(sourceExtension(filePath).toLowerCase())
}

function toRepositoryPath(rootDir, absolutePath) {
  return relative(rootDir, absolutePath).split(sep).join('/')
}

function finding(code, path, message) {
  return { code, path, message }
}

function walkFiles(startDir, accept, ignoredDirectories = WALK_IGNORES) {
  if (!existsSync(startDir)) return []

  const files = []
  const pending = [startDir]
  while (pending.length > 0) {
    const directory = pending.pop()
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))

    for (const entry of entries) {
      const absolutePath = join(directory, entry.name)
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) pending.push(absolutePath)
      } else if (entry.isFile() && accept(absolutePath)) {
        files.push(absolutePath)
      }
    }
  }

  return files.sort()
}

function walkEntries(startDir, accept, ignoredDirectories = WALK_IGNORES) {
  if (!existsSync(startDir)) return []

  const paths = []
  const pending = [startDir]
  while (pending.length > 0) {
    const directory = pending.pop()
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))

    for (const entry of entries) {
      const absolutePath = join(directory, entry.name)
      if (accept(absolutePath, entry)) paths.push(absolutePath)
      if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
        pending.push(absolutePath)
      }
    }
  }
  return paths.sort()
}

function pathEntryExists(filePath) {
  try {
    lstatSync(filePath)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function childPackageManifests(rootDir, parentDirectory) {
  const absoluteParent = join(rootDir, parentDirectory)
  if (!existsSync(absoluteParent)) return []

  return readdirSync(absoluteParent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(absoluteParent, entry.name, 'package.json'))
    .filter((filePath) => existsSync(filePath))
    .sort()
}

function applicationPackageNames(rootDir) {
  const names = new Set()
  for (const manifestPath of childPackageManifests(rootDir, 'apps')) {
    try {
      const manifest = readJson(manifestPath)
      if (typeof manifest.name === 'string' && manifest.name.length > 0) {
        names.add(manifest.name)
      }
    } catch {
      // Invalid manifests are reported by the manifest boundary check when relevant.
    }
  }
  return names
}

function governedMarkdownFiles(rootDir) {
  const files = new Set()
  const indexPath = join(rootDir, 'docs/index.md')
  if (existsSync(indexPath)) files.add(indexPath)

  for (const relativeDirectory of GOVERNED_DOCUMENT_DIRECTORIES) {
    for (const filePath of walkFiles(
      join(rootDir, relativeDirectory),
      (candidatePath) => candidatePath.endsWith('.md'),
    )) {
      files.add(filePath)
    }
  }
  return [...files].sort()
}

function applicationPackages(rootDir) {
  const applications = []
  for (const manifestPath of childPackageManifests(rootDir, 'apps')) {
    try {
      const manifest = readJson(manifestPath)
      if (typeof manifest.name !== 'string' || manifest.name.length === 0) continue
      applications.push({
        directory: dirname(manifestPath),
        manifest,
        manifestPath,
        name: manifest.name,
      })
    } catch {
      // Other checks remain deterministic even when a manifest is temporarily invalid.
    }
  }
  return applications
}

function repositoryModules(rootDir) {
  return ['apps', 'packages'].flatMap((moduleKind) => (
    childPackageManifests(rootDir, moduleKind).map((manifestPath) => ({
      directory: dirname(manifestPath),
      kind: moduleKind === 'apps' ? 'app' : 'package',
      manifestPath,
    }))
  ))
}

function owningRepositoryModule(modules, filePath) {
  return modules
    .filter((repositoryModule) => isWithin(repositoryModule.directory, filePath))
    .sort((left, right) => right.directory.length - left.directory.length)[0]
}

function crossesPeerModuleBoundary(modules, owner, candidatePath, mayExpand = false) {
  return modules.some((repositoryModule) => (
    repositoryModule.directory !== owner.directory
    && (isWithin(repositoryModule.directory, candidatePath)
      || (mayExpand && isWithin(candidatePath, repositoryModule.directory)))
  ))
}

function sourceRootDirectories(rootDir) {
  return ['apps', 'packages']
    .flatMap((parentDirectory) => (
      childPackageManifests(rootDir, parentDirectory)
        .map((manifestPath) => join(dirname(manifestPath), 'src'))
    ))
    .filter((sourceRoot) => pathEntryExists(sourceRoot))
    .sort()
}

function stripMarkdownCode(markdown) {
  const kept = []
  let fence = null
  for (const line of markdown.split('\n')) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1][0]
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      continue
    }
    if (fence === null) kept.push(line.replace(/`[^`]*`/g, ''))
  }
  return kept.join('\n')
}

function markdownDestinations(markdown) {
  const text = stripMarkdownCode(markdown)
  const destinations = []
  const inlineLink = /!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^)]*["'])?\s*\)/g
  const referenceLink = /^\s{0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm

  for (const pattern of [inlineLink, referenceLink]) {
    for (const match of text.matchAll(pattern)) {
      destinations.push(match[1] ?? match[2])
    }
  }
  return destinations
}

function localMarkdownTarget(rootDir, markdownPath, destination) {
  const trimmed = destination.trim()
  if (
    trimmed.length === 0
    || trimmed.startsWith('#')
    || trimmed.startsWith('//')
    || /^[a-z][a-z\d+.-]*:/i.test(trimmed)
  ) {
    return null
  }

  const withoutFragment = trimmed.split('#', 1)[0].split('?', 1)[0]
  if (withoutFragment.length === 0) return null

  let decoded
  try {
    decoded = decodeURIComponent(withoutFragment)
  } catch {
    decoded = withoutFragment
  }

  if (decoded.startsWith('/')) return join(rootDir, decoded.slice(1))
  return resolve(dirname(markdownPath), decoded)
}

function sourceScriptKind(sourcePath) {
  const normalizedPath = sourcePath.toLowerCase()
  if (normalizedPath.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (normalizedPath.endsWith('.ts') || normalizedPath.endsWith('.mts') || normalizedPath.endsWith('.cts')) {
    return ts.ScriptKind.TS
  }
  if (normalizedPath.endsWith('.jsx')) return ts.ScriptKind.JSX
  return ts.ScriptKind.JS
}

function literalText(node) {
  return ts.isStringLiteralLike(node) && node.text.length > 0 ? node.text : null
}

function propertyName(node) {
  if (ts.isPropertyAccessExpression(node)) return node.name.text
  if (ts.isElementAccessExpression(node) && node.argumentExpression !== undefined) {
    return literalText(node.argumentExpression)
  }
  return null
}

function propertyObject(node) {
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
    return node.expression
  }
  return null
}

function isImportMeta(node) {
  return ts.isMetaProperty(node)
    && node.keywordToken === ts.SyntaxKind.ImportKeyword
    && node.name.text === 'meta'
}

function isImportMetaProperty(node, name) {
  const object = propertyObject(node)
  return object !== null && isImportMeta(object) && propertyName(node) === name
}

function staticRequireModule(node) {
  if (
    !ts.isCallExpression(node)
    || !ts.isIdentifier(node.expression)
    || node.expression.text !== 'require'
    || node.arguments.length !== 1
  ) {
    return null
  }
  return literalText(node.arguments[0])
}

function collectSourceBindings(sourceFile) {
  const bindings = {
    createRequireFunctions: new Set(['createRequire']),
    filesystemFunctions: new Map(
      [...FILESYSTEM_METHODS].map((methodName) => [methodName, methodName]),
    ),
    filesystemNamespaces: new Set(['fs']),
    moduleNamespaces: new Set(),
    pathFunctions: new Set(['join', 'resolve']),
    pathNamespaces: new Set(['path']),
    urlConstructors: new Set(['URL']),
    urlNamespaces: new Set(),
  }

  function addFilesystemBinding(importedName, localName) {
    if (importedName === 'promises') {
      bindings.filesystemNamespaces.add(localName)
    } else if (FILESYSTEM_METHODS.has(importedName)) {
      bindings.filesystemFunctions.set(localName, importedName)
    }
  }

  function addNamedImports(namedBindings, moduleName) {
    for (const element of namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text
      const localName = element.name.text
      if ((moduleName === 'path' || moduleName === 'node:path')
        && (importedName === 'join' || importedName === 'resolve')) {
        bindings.pathFunctions.add(localName)
      }
      if ((moduleName === 'url' || moduleName === 'node:url') && importedName === 'URL') {
        bindings.urlConstructors.add(localName)
      }
      if ((moduleName === 'module' || moduleName === 'node:module')
        && importedName === 'createRequire') {
        bindings.createRequireFunctions.add(localName)
      }
      if (FILESYSTEM_MODULES.has(moduleName)) {
        addFilesystemBinding(importedName, localName)
      }
    }
  }

  function addObjectBindings(bindingPattern, moduleName) {
    for (const element of bindingPattern.elements) {
      if (!ts.isIdentifier(element.name)) continue
      const importedName = element.propertyName !== undefined
        ? (ts.isIdentifier(element.propertyName)
            ? element.propertyName.text
            : literalText(element.propertyName))
        : element.name.text
      if (importedName === null) continue
      const localName = element.name.text
      if ((moduleName === 'path' || moduleName === 'node:path')
        && (importedName === 'join' || importedName === 'resolve')) {
        bindings.pathFunctions.add(localName)
      }
      if ((moduleName === 'url' || moduleName === 'node:url') && importedName === 'URL') {
        bindings.urlConstructors.add(localName)
      }
      if ((moduleName === 'module' || moduleName === 'node:module')
        && importedName === 'createRequire') {
        bindings.createRequireFunctions.add(localName)
      }
      if (FILESYSTEM_MODULES.has(moduleName)) {
        addFilesystemBinding(importedName, localName)
      }
    }
  }

  function addNamespaceBinding(localName, moduleName) {
    if (moduleName === 'path' || moduleName === 'node:path') {
      bindings.pathNamespaces.add(localName)
    } else if (moduleName === 'url' || moduleName === 'node:url') {
      bindings.urlNamespaces.add(localName)
    } else if (moduleName === 'module' || moduleName === 'node:module') {
      bindings.moduleNamespaces.add(localName)
    } else if (FILESYSTEM_MODULES.has(moduleName)) {
      bindings.filesystemNamespaces.add(localName)
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      const moduleName = literalText(node.moduleSpecifier)
      const importClause = node.importClause
      if (moduleName !== null && importClause !== undefined) {
        if (importClause.name !== undefined) addNamespaceBinding(importClause.name.text, moduleName)
        const namedBindings = importClause.namedBindings
        if (namedBindings !== undefined && ts.isNamespaceImport(namedBindings)) {
          addNamespaceBinding(namedBindings.name.text, moduleName)
        } else if (namedBindings !== undefined && ts.isNamedImports(namedBindings)) {
          addNamedImports(namedBindings, moduleName)
        }
      }
    } else if (
      ts.isImportEqualsDeclaration(node)
      && ts.isExternalModuleReference(node.moduleReference)
      && node.moduleReference.expression !== undefined
    ) {
      const moduleName = literalText(node.moduleReference.expression)
      if (moduleName !== null) addNamespaceBinding(node.name.text, moduleName)
    } else if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      const moduleName = staticRequireModule(node.initializer)
      if (moduleName !== null) {
        if (ts.isIdentifier(node.name)) addNamespaceBinding(node.name.text, moduleName)
        else if (ts.isObjectBindingPattern(node.name)) addObjectBindings(node.name, moduleName)
      } else if (ts.isIdentifier(node.name)) {
        if (isFilesystemNamespaceExpression(node.initializer, bindings)) {
          bindings.filesystemNamespaces.add(node.name.text)
        } else {
          const filesystemMethod = filesystemMethodExpression(node.initializer, bindings)
          if (filesystemMethod !== null) {
            bindings.filesystemFunctions.set(node.name.text, filesystemMethod)
          } else if (pathMethodExpression(node.initializer, bindings) !== null) {
            bindings.pathFunctions.add(node.name.text)
          }
        }
      } else if (
        ts.isObjectBindingPattern(node.name)
        && isFilesystemNamespaceExpression(node.initializer, bindings)
      ) {
        for (const element of node.name.elements) {
          if (!ts.isIdentifier(element.name)) continue
          const importedName = element.propertyName === undefined
            ? element.name.text
            : objectPropertyName(element.propertyName)
          if (importedName !== null) addFilesystemBinding(importedName, element.name.text)
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return bindings
}

function isBoundMemberCall(expression, namespaces, members) {
  const object = propertyObject(expression)
  return object !== null
    && ts.isIdentifier(object)
    && namespaces.has(object.text)
    && members.has(propertyName(expression))
}

function isPathNamespaceExpression(expression, bindings) {
  if (ts.isIdentifier(expression) && bindings.pathNamespaces.has(expression.text)) return true
  const moduleName = staticRequireModule(expression)
  return moduleName === 'path' || moduleName === 'node:path'
}

function pathMethodExpression(expression, bindings) {
  if (ts.isIdentifier(expression) && bindings.pathFunctions.has(expression.text)) {
    return expression.text
  }
  const object = propertyObject(expression)
  const methodName = propertyName(expression)
  return object !== null
    && PATH_METHODS.has(methodName)
    && isPathNamespaceExpression(object, bindings)
    ? methodName
    : null
}

function isPathCall(expression, bindings) {
  return pathMethodExpression(expression, bindings) !== null
}

function isUrlConstructor(expression, bindings) {
  return (ts.isIdentifier(expression) && bindings.urlConstructors.has(expression.text))
    || isBoundMemberCall(expression, bindings.urlNamespaces, new Set(['URL']))
}

function isCreateRequireCall(expression, bindings) {
  return (ts.isIdentifier(expression) && bindings.createRequireFunctions.has(expression.text))
    || isBoundMemberCall(
      expression,
      bindings.moduleNamespaces,
      new Set(['createRequire']),
    )
}

function isFilesystemNamespaceExpression(expression, bindings) {
  if (
    ts.isIdentifier(expression)
    && bindings.filesystemNamespaces.has(expression.text)
  ) {
    return true
  }

  const moduleName = staticRequireModule(expression)
  if (moduleName !== null && FILESYSTEM_MODULES.has(moduleName)) return true

  const object = propertyObject(expression)
  return object !== null
    && propertyName(expression) === 'promises'
    && isFilesystemNamespaceExpression(object, bindings)
}

function filesystemMethodExpression(expression, bindings) {
  if (ts.isIdentifier(expression)) {
    return bindings.filesystemFunctions.get(expression.text) ?? null
  }
  const object = propertyObject(expression)
  const methodName = propertyName(expression)
  return object !== null
    && FILESYSTEM_METHODS.has(methodName)
    && isFilesystemNamespaceExpression(object, bindings)
    ? methodName
    : null
}

function filesystemPathArgumentIndexes(methodName) {
  if (FILESYSTEM_DUAL_PATH_METHODS.has(methodName)) return [0, 1]
  return FILESYSTEM_SINGLE_PATH_METHODS.has(methodName) ? [0] : []
}

function isSourceLocationLiteral(node) {
  const directPath = literalText(node)
  return directPath !== null
    && (directPath.startsWith('.')
      || directPath === 'apps'
      || directPath.startsWith('apps/')
      || directPath === 'packages'
      || directPath.startsWith('packages/')
      || isAbsolute(directPath))
}

function directModuleCallKind(expression) {
  if (expression.kind === ts.SyntaxKind.ImportKeyword) return 'import'
  if (ts.isIdentifier(expression) && expression.text === 'require') return 'require'

  const object = propertyObject(expression)
  const member = propertyName(expression)
  if (object !== null && ts.isIdentifier(object)) {
    if (object.text === 'require' && member === 'resolve') return 'require.resolve'
    if (object.text === 'module' && member === 'require') return 'module.require'
  }
  if (isImportMetaProperty(expression, 'resolve')) return 'import.meta.resolve'
  return null
}

function isSafeRequireProperty(node) {
  const object = propertyObject(node)
  return object !== null
    && ts.isIdentifier(object)
    && object.text === 'require'
    && SAFE_REQUIRE_PROPERTIES.has(propertyName(node))
}

function isImportMetaGlob(expression) {
  return isImportMetaProperty(expression, 'glob')
    || isImportMetaProperty(expression, 'globEager')
}

function isProcessCwdCall(node) {
  if (!ts.isCallExpression(node) || node.arguments.length !== 0) return false
  const object = propertyObject(node.expression)
  return object !== null
    && ts.isIdentifier(object)
    && object.text === 'process'
    && propertyName(node.expression) === 'cwd'
}

function isProcessCwdProperty(node) {
  const object = propertyObject(node)
  return object !== null
    && ts.isIdentifier(object)
    && object.text === 'process'
    && propertyName(node) === 'cwd'
}

function bindsProcessCwd(node) {
  return ts.isVariableDeclaration(node)
    && node.initializer !== undefined
    && ts.isIdentifier(node.initializer)
    && node.initializer.text === 'process'
    && ts.isObjectBindingPattern(node.name)
    && node.name.elements.some((element) => {
      const sourceName = element.propertyName !== undefined
        ? objectPropertyName(element.propertyName)
        : (ts.isIdentifier(element.name) ? element.name.text : null)
      return sourceName === 'cwd'
    })
}

function analyzeSourceReferences(sourcePath, source) {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    sourceScriptKind(sourcePath),
  )
  const analysis = {
    dynamicFilesystem: sourceFile.parseDiagnostics.length > 0,
    dynamicModule: sourceFile.parseDiagnostics.length > 0,
    filesystemSpecifiers: [],
    moduleSpecifiers: [],
  }
  const bindings = collectSourceBindings(sourceFile)
  const consumedFilesystemPrimitives = new Set()
  const consumedModulePrimitives = new Set()

  function recordModuleExpression(expression) {
    const specifier = literalText(expression)
    if (specifier === null) analysis.dynamicModule = true
    else analysis.moduleSpecifiers.push(specifier)
  }

  function recordModuleCall(node) {
    if (node.arguments.length !== 1) analysis.dynamicModule = true
    else recordModuleExpression(node.arguments[0])

    consumedModulePrimitives.add(node.expression)
    const object = propertyObject(node.expression)
    if (object !== null) consumedModulePrimitives.add(object)
  }

  function recordGlobExpression(expression) {
    if (ts.isArrayLiteralExpression(expression)) {
      if (expression.elements.length === 0) analysis.dynamicModule = true
      for (const element of expression.elements) recordModuleExpression(element)
      return
    }
    recordModuleExpression(expression)
  }

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier !== undefined
    ) {
      recordModuleExpression(node.moduleSpecifier)
    } else if (
      ts.isImportEqualsDeclaration(node)
      && ts.isExternalModuleReference(node.moduleReference)
      && node.moduleReference.expression !== undefined
    ) {
      recordModuleExpression(node.moduleReference.expression)
    } else if (ts.isImportTypeNode(node)) {
      if (ts.isLiteralTypeNode(node.argument)) recordModuleExpression(node.argument.literal)
      else analysis.dynamicModule = true
    } else if (ts.isModuleDeclaration(node) && ts.isStringLiteralLike(node.name)) {
      recordModuleExpression(node.name)
    } else if (
      ts.isCallExpression(node)
      && directModuleCallKind(node.expression) !== null
    ) {
      recordModuleCall(node)
    } else if (ts.isCallExpression(node) && isImportMetaGlob(node.expression)) {
      if (node.arguments.length < 1) analysis.dynamicModule = true
      else recordGlobExpression(node.arguments[0])
    } else if (ts.isCallExpression(node) && isCreateRequireCall(node.expression, bindings)) {
      analysis.dynamicModule = true
    } else if (
      ts.isCallExpression(node)
      && (filesystemMethodExpression(node.expression, bindings) !== null
        || isPathCall(node.expression, bindings))
    ) {
      const filesystemMethod = filesystemMethodExpression(node.expression, bindings)
      if (
        filesystemMethod !== null
        && filesystemPathArgumentIndexes(filesystemMethod).some((argumentIndex) => (
          argumentIndex < node.arguments.length
          && isSourceLocationLiteral(node.arguments[argumentIndex])
        ))
      ) {
        analysis.dynamicFilesystem = true
      } else if (isPathCall(node.expression, bindings)) {
        const hasFilesystemPrimitive = node.arguments.some((argument) => (
        (ts.isIdentifier(argument)
          && (argument.text === '__dirname' || argument.text === '__filename'))
        || isProcessCwdCall(argument)
        ))
        if (hasFilesystemPrimitive) {
          const hasDirectDirectoryBase = node.arguments.length > 0
            && ts.isIdentifier(node.arguments[0])
            && node.arguments[0].text === '__dirname'
          const specifier = hasDirectDirectoryBase && node.arguments.length === 2
            ? literalText(node.arguments[1])
            : null
          if (specifier === null) analysis.dynamicFilesystem = true
          else {
            consumedFilesystemPrimitives.add(node.arguments[0])
            analysis.filesystemSpecifiers.push(specifier)
          }
        } else if (node.arguments.some(isSourceLocationLiteral)) {
          analysis.dynamicFilesystem = true
        }
      }
    } else if (
      ts.isNewExpression(node)
      && isUrlConstructor(node.expression, bindings)
      && node.arguments !== undefined
      && node.arguments.length > 0
      && isImportMetaProperty(node.arguments.at(-1), 'url')
    ) {
      const specifier = node.arguments.length === 2
        ? literalText(node.arguments[0])
        : null
      if (specifier === null) analysis.dynamicFilesystem = true
      else {
        consumedFilesystemPrimitives.add(node.arguments[1])
        analysis.filesystemSpecifiers.push(specifier)
      }
    } else if (
      ts.isIdentifier(node)
      && (node.text === '__dirname' || node.text === '__filename')
      && !consumedFilesystemPrimitives.has(node)
    ) {
      analysis.dynamicFilesystem = true
    } else if (
      (isImportMetaProperty(node, 'url')
        || isImportMetaProperty(node, 'dirname')
        || isImportMetaProperty(node, 'filename'))
      && !consumedFilesystemPrimitives.has(node)
    ) {
      analysis.dynamicFilesystem = true
    } else if (isProcessCwdCall(node)) {
      analysis.dynamicFilesystem = true
    } else if (isProcessCwdProperty(node) || bindsProcessCwd(node)) {
      analysis.dynamicFilesystem = true
    } else if (isSafeRequireProperty(node)) {
      consumedModulePrimitives.add(propertyObject(node))
    } else if (
      ts.isIdentifier(node)
      && node.text === 'require'
      && !consumedModulePrimitives.has(node)
    ) {
      analysis.dynamicModule = true
    } else if (
      (directModuleCallKind(node) === 'require.resolve'
        || directModuleCallKind(node) === 'module.require'
        || directModuleCallKind(node) === 'import.meta.resolve')
      && !consumedModulePrimitives.has(node)
    ) {
      analysis.dynamicModule = true
    }

    if (Array.isArray(node.jsDoc)) {
      for (const jsDoc of node.jsDoc) visit(jsDoc)
    }
    ts.forEachChild(node, visit)
  }

  for (const reference of [
    ...sourceFile.referencedFiles,
    ...sourceFile.typeReferenceDirectives,
  ]) {
    if (reference.fileName.length > 0) analysis.moduleSpecifiers.push(reference.fileName)
  }

  visit(sourceFile)
  return analysis
}

function objectPropertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text
  return null
}

function staticConfigPath(expression, configPath) {
  const literal = literalText(expression)
  if (literal !== null) {
    if (!literal.startsWith('.') && !isAbsolute(literal)) return undefined
    return resolve(dirname(configPath), literal)
  }

  if (
    ts.isCallExpression(expression)
    && expression.arguments.length === 1
    && ts.isIdentifier(expression.expression)
    && expression.expression.text === 'fileURLToPath'
  ) {
    return staticConfigPath(expression.arguments[0], configPath)
  }

  if (
    ts.isNewExpression(expression)
    && isUrlConstructor(expression.expression, {
      urlConstructors: new Set(['URL']),
      urlNamespaces: new Set(),
    })
    && expression.arguments?.length === 2
    && isImportMetaProperty(expression.arguments[1], 'url')
  ) {
    const relativePath = literalText(expression.arguments[0])
    return relativePath === null ? null : resolve(dirname(configPath), relativePath)
  }

  if (
    ts.isCallExpression(expression)
    && isPathCall(expression.expression, {
      pathFunctions: new Set(['join', 'resolve']),
      pathNamespaces: new Set(['path']),
    })
    && expression.arguments.length === 2
    && ts.isIdentifier(expression.arguments[0])
    && expression.arguments[0].text === '__dirname'
  ) {
    const relativePath = literalText(expression.arguments[1])
    return relativePath === null ? null : resolve(dirname(configPath), relativePath)
  }

  return null
}

function viteAliasExpressions(sourceFile) {
  const expressions = []

  function collectAliasInitializer(initializer) {
    if (ts.isArrayLiteralExpression(initializer)) {
      for (const element of initializer.elements) collectAliasInitializer(element)
      return
    }
    if (!ts.isObjectLiteralExpression(initializer)) {
      expressions.push(initializer)
      return
    }

    const hasReplacementProperty = initializer.properties.some((property) => (
      ts.isPropertyAssignment(property)
      && objectPropertyName(property.name) === 'replacement'
    ))
    for (const property of initializer.properties) {
      if (!ts.isPropertyAssignment(property)) {
        expressions.push(property)
        continue
      }
      const name = objectPropertyName(property.name)
      if (hasReplacementProperty) {
        if (name === 'replacement') expressions.push(property.initializer)
      } else {
        expressions.push(property.initializer)
      }
    }
  }

  function visit(node) {
    if (ts.isPropertyAssignment(node) && objectPropertyName(node.name) === 'alias') {
      collectAliasInitializer(node.initializer)
      return
    }
    if (ts.isShorthandPropertyAssignment(node) && node.name.text === 'alias') {
      expressions.push(node.name)
      return
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return expressions
}

function viteVariableInitializers(sourceFile) {
  const initializers = new Map()
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined) {
        initializers.set(declaration.name.text, declaration.initializer)
      }
    }
  }
  return initializers
}

function unwrapConfigExpression(expression, initializers, seen = new Set()) {
  let current = expression
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isSatisfiesExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isPartiallyEmittedExpression(current)
  ) {
    current = current.expression
  }

  if (ts.isIdentifier(current) && initializers.has(current.text) && !seen.has(current.text)) {
    const nextSeen = new Set(seen)
    nextSeen.add(current.text)
    return unwrapConfigExpression(initializers.get(current.text), initializers, nextSeen)
  }
  return current
}

function returnedConfigExpression(expression, initializers) {
  const unwrapped = unwrapConfigExpression(expression, initializers)
  if (!ts.isArrowFunction(unwrapped) && !ts.isFunctionExpression(unwrapped)) {
    return unwrapped
  }
  if (!ts.isBlock(unwrapped.body)) return unwrapConfigExpression(unwrapped.body, initializers)
  const returns = unwrapped.body.statements.filter(ts.isReturnStatement)
  return returns.length === 1 && returns[0].expression !== undefined
    ? unwrapConfigExpression(returns[0].expression, initializers)
    : null
}

function viteConfigObject(sourceFile, initializers) {
  const defineConfigNames = new Set(['defineConfig'])
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause === undefined) continue
    if (literalText(statement.moduleSpecifier) !== 'vite') continue
    const namedBindings = statement.importClause.namedBindings
    if (namedBindings === undefined || !ts.isNamedImports(namedBindings)) continue
    for (const element of namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text
      if (importedName === 'defineConfig') defineConfigNames.add(element.name.text)
    }
  }

  let exportedExpression = null
  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      exportedExpression = statement.expression
      continue
    }
    if (!ts.isExpressionStatement(statement)) continue
    const assignment = statement.expression
    if (
      ts.isBinaryExpression(assignment)
      && assignment.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && propertyName(assignment.left) === 'exports'
      && ts.isIdentifier(propertyObject(assignment.left))
      && propertyObject(assignment.left).text === 'module'
    ) {
      exportedExpression = assignment.right
    }
  }
  if (exportedExpression === null) return { dynamic: false, object: null }

  let resolved = returnedConfigExpression(exportedExpression, initializers)
  if (
    resolved !== null
    && ts.isCallExpression(resolved)
    && ts.isIdentifier(resolved.expression)
    && defineConfigNames.has(resolved.expression.text)
    && resolved.arguments.length === 1
  ) {
    resolved = returnedConfigExpression(resolved.arguments[0], initializers)
  }
  resolved = resolved === null ? null : unwrapConfigExpression(resolved, initializers)
  return ts.isObjectLiteralExpression(resolved)
    ? { dynamic: false, object: resolved }
    : { dynamic: true, object: null }
}

function configObjectProperty(object, name, initializers) {
  let result = { kind: 'absent', expression: null }
  for (const property of object.properties) {
    if (ts.isSpreadAssignment(property)) {
      const spread = unwrapConfigExpression(property.expression, initializers)
      if (!ts.isObjectLiteralExpression(spread)) {
        result = { kind: 'dynamic', expression: null }
        continue
      }
      const spreadResult = configObjectProperty(spread, name, initializers)
      if (spreadResult.kind !== 'absent') result = spreadResult
      continue
    }

    const propertyKey = objectPropertyName(property.name)
    if (propertyKey === null) {
      if (property.name !== undefined && ts.isComputedPropertyName(property.name)) {
        result = { kind: 'dynamic', expression: null }
      }
      continue
    }
    if (propertyKey !== name) continue
    if (ts.isPropertyAssignment(property)) {
      result = { kind: 'known', expression: property.initializer }
    } else if (ts.isShorthandPropertyAssignment(property)) {
      result = { kind: 'known', expression: property.name }
    } else {
      result = { kind: 'dynamic', expression: null }
    }
  }
  return result
}

function configPropertyPath(object, names, initializers) {
  let currentObject = object
  for (let index = 0; index < names.length; index += 1) {
    const property = configObjectProperty(currentObject, names[index], initializers)
    if (property.kind !== 'known' || index === names.length - 1) return property
    const nested = unwrapConfigExpression(property.expression, initializers)
    if (!ts.isObjectLiteralExpression(nested)) {
      return { kind: 'dynamic', expression: null }
    }
    currentObject = nested
  }
  return { kind: 'absent', expression: null }
}

function configStringPath(expression, baseDirectory, configPath, initializers) {
  const unwrapped = unwrapConfigExpression(expression, initializers)
  if (ts.isStringLiteralLike(unwrapped)) {
    return resolve(baseDirectory, unwrapped.text)
  }
  return staticConfigPath(unwrapped, configPath)
}

function vitePathValueExpressions(expression, initializers, allowObject) {
  const unwrapped = unwrapConfigExpression(expression, initializers)
  if (ts.isArrayLiteralExpression(unwrapped)) {
    const expressions = []
    for (const element of unwrapped.elements) {
      if (ts.isSpreadElement(element)) return { dynamic: true, expressions: [] }
      const nested = vitePathValueExpressions(element, initializers, allowObject)
      if (nested.dynamic) return nested
      expressions.push(...nested.expressions)
    }
    return { dynamic: false, expressions }
  }
  if (allowObject && ts.isObjectLiteralExpression(unwrapped)) {
    const expressions = []
    for (const property of unwrapped.properties) {
      if (ts.isPropertyAssignment(property)) {
        const nested = vitePathValueExpressions(property.initializer, initializers, false)
        if (nested.dynamic) return nested
        expressions.push(...nested.expressions)
      } else if (ts.isShorthandPropertyAssignment(property)) {
        const nested = vitePathValueExpressions(property.name, initializers, false)
        if (nested.dynamic) return nested
        expressions.push(...nested.expressions)
      } else {
        return { dynamic: true, expressions: [] }
      }
    }
    return { dynamic: false, expressions }
  }
  return { dynamic: false, expressions: [unwrapped] }
}

function viteFilesystemSettings(sourceFile, configPath) {
  const initializers = viteVariableInitializers(sourceFile)
  const config = viteConfigObject(sourceFile, initializers)
  if (config.dynamic) {
    return { dynamic: ['Vite exported configuration'], settings: [] }
  }
  if (config.object === null) return { dynamic: [], settings: [] }

  const dynamic = []
  const settings = []
  const rootProperty = configPropertyPath(config.object, ['root'], initializers)
  let rootDirectory = dirname(configPath)
  if (rootProperty.kind === 'dynamic') {
    dynamic.push('root')
  } else if (rootProperty.kind === 'known') {
    const candidatePath = configStringPath(
      rootProperty.expression,
      dirname(configPath),
      configPath,
      initializers,
    )
    if (candidatePath === null || candidatePath === undefined) dynamic.push('root')
    else {
      rootDirectory = candidatePath
      settings.push({ candidatePath, label: 'root', mayExpand: true })
    }
  }

  for (const { path, label, allowFalse, allowObject, requireArray, mayExpand } of [
    { path: ['publicDir'], label: 'publicDir', allowFalse: true, mayExpand: true },
    { path: ['envDir'], label: 'envDir', mayExpand: true },
    {
      path: ['server', 'fs', 'allow'],
      label: 'server.fs.allow',
      requireArray: true,
      mayExpand: true,
    },
    { path: ['build', 'outDir'], label: 'build.outDir', mayExpand: true },
    {
      path: ['build', 'rollupOptions', 'input'],
      label: 'build.rollupOptions.input',
      allowObject: true,
      mayExpand: false,
    },
  ]) {
    const property = configPropertyPath(config.object, path, initializers)
    if (property.kind === 'absent') continue
    if (property.kind === 'dynamic') {
      dynamic.push(label)
      continue
    }
    const unwrapped = unwrapConfigExpression(property.expression, initializers)
    if (allowFalse && unwrapped.kind === ts.SyntaxKind.FalseKeyword) continue
    if (requireArray && !ts.isArrayLiteralExpression(unwrapped)) {
      dynamic.push(label)
      continue
    }
    const values = vitePathValueExpressions(unwrapped, initializers, allowObject === true)
    if (values.dynamic) {
      dynamic.push(label)
      continue
    }
    for (const expression of values.expressions) {
      const candidatePath = configStringPath(
        expression,
        rootDirectory,
        configPath,
        initializers,
      )
      if (candidatePath === null || candidatePath === undefined) dynamic.push(label)
      else settings.push({ candidatePath, label, mayExpand })
    }
  }
  return { dynamic, settings }
}

function isWithin(parentPath, candidatePath) {
  const relativePath = relative(parentPath, candidatePath)
  return relativePath === ''
    || (!relativePath.startsWith(`..${sep}`) && relativePath !== '..' && !isAbsolute(relativePath))
}

function yamlScalar(source, key) {
  const match = source.match(new RegExp(`^\\s*${key}\\s*:\\s*(.*?)\\s*$`, 'm'))
  if (!match) return null
  const rawValue = match[1].trim()
  if (rawValue.length === 0) return null
  const quoted = rawValue.match(/^(["'])(.*)\1$/)
  const value = quoted ? quoted[2].trim() : rawValue
  return value.length > 0 ? value : null
}

function globStaticPrefix(sourcePath, specifier) {
  if (!specifier.startsWith('.') && !isAbsolute(specifier)) return null
  const magicIndex = specifier.search(/[*?\[\]{}()!@]/)
  if (magicIndex < 0) return null
  return resolve(dirname(sourcePath), specifier.slice(0, magicIndex))
}

function pathsOverlap(leftPath, rightPath) {
  return isWithin(leftPath, rightPath) || isWithin(rightPath, leftPath)
}

function specifierTargetsApplication(
  rootDir,
  sourcePath,
  specifier,
  appPackageNames,
) {
  for (const packageName of appPackageNames) {
    if (specifier === packageName || specifier.startsWith(`${packageName}/`)) return true
  }
  if (specifier === 'apps' || specifier.startsWith('apps/')) return true

  if (specifier.startsWith('.') || isAbsolute(specifier)) {
    const globPrefix = globStaticPrefix(sourcePath, specifier)
    if (
      globPrefix !== null
      && pathsOverlap(join(rootDir, 'apps'), globPrefix)
    ) {
      return true
    }
    const resolvedSpecifier = resolve(dirname(sourcePath), specifier)
    return isWithin(join(rootDir, 'apps'), resolvedSpecifier)
  }
  return false
}

function specifierTargetsOtherApplication(sourcePath, specifier, applications) {
  for (const application of applications) {
    if (
      specifier === application.name
      || specifier.startsWith(`${application.name}/`)
    ) {
      return true
    }
    if (specifier.startsWith('.') || isAbsolute(specifier)) {
      const globPrefix = globStaticPrefix(sourcePath, specifier)
      if (
        globPrefix !== null
        && pathsOverlap(application.directory, globPrefix)
      ) {
        return true
      }
      const resolvedSpecifier = resolve(dirname(sourcePath), specifier)
      if (isWithin(application.directory, resolvedSpecifier)) return true
    }
  }
  return false
}

function filesystemSpecifierTargetsApplication(rootDir, sourcePath, specifier) {
  return isWithin(
    join(rootDir, 'apps'),
    resolve(dirname(sourcePath), specifier),
  )
}

function filesystemSpecifierTargetsOtherApplication(sourcePath, specifier, applications) {
  const resolvedSpecifier = resolve(dirname(sourcePath), specifier)
  return applications.some((application) => (
    isWithin(application.directory, resolvedSpecifier)
  ))
}

function dependencySpecAliasesPackage(specification, packageNames) {
  if (typeof specification !== 'string') return false
  const trimmed = specification.trim()
  for (const protocol of ['npm:', 'workspace:']) {
    if (!trimmed.startsWith(protocol)) continue
    const target = trimmed.slice(protocol.length)
    for (const packageName of packageNames) {
      if (target === packageName || target.startsWith(`${packageName}@`)) return true
    }
  }
  return false
}

function dependencySpecLocalPath(manifestPath, specification) {
  if (typeof specification !== 'string') return null
  const trimmed = specification.trim()
  const protocol = ['file:', 'link:', 'portal:', 'workspace:']
    .find((candidate) => trimmed.startsWith(candidate))
  const candidate = protocol === undefined
    ? trimmed
    : trimmed.slice(protocol.length)

  if (!candidate.startsWith('.') && !isAbsolute(candidate)) return null
  return resolve(dirname(manifestPath), candidate)
}

function dependencySpecTargetsDirectory(manifestPath, specification, targetDirectory) {
  const localPath = dependencySpecLocalPath(manifestPath, specification)
  if (localPath === null) return false
  if (isWithin(targetDirectory, localPath)) return true
  if (!existsSync(localPath)) return false
  return isWithin(realpathSync(targetDirectory), realpathSync(localPath))
}

function dependencyTargetsApplication(
  manifestPath,
  dependencyName,
  dependencySpec,
  applications,
) {
  const applicationNames = new Set(applications.map((application) => application.name))
  if (
    applicationNames.has(dependencyName)
    || dependencySpecAliasesPackage(dependencySpec, applicationNames)
  ) {
    return true
  }
  return applications.some((application) => (
    dependencySpecTargetsDirectory(
      manifestPath,
      dependencySpec,
      application.directory,
    )
  ))
}

function hasDynamicPathSyntax(target) {
  return target.includes('${')
    || target.includes('{{')
    || target.includes('<%')
    || target.includes('#{')
    || target.includes('@{')
}

function manifestLocalTargetStatus(ownerDirectory, target) {
  if (typeof target !== 'string' || target.length === 0 || hasDynamicPathSyntax(target)) {
    return 'invalid'
  }
  const candidatePath = resolve(ownerDirectory, target)
  if (!isWithin(ownerDirectory, candidatePath)) return 'crosses'
  if (
    existsSync(candidatePath)
    && !isWithin(realpathSync(ownerDirectory), realpathSync(candidatePath))
  ) {
    return 'crosses'
  }
  return 'safe'
}

function localManifestSpecifier(target) {
  return target.startsWith('.') || isAbsolute(target) || target.startsWith('file:')
}

function recursiveManifestTargets(value, visitLeaf) {
  if (Array.isArray(value)) {
    for (const element of value) recursiveManifestTargets(element, visitLeaf)
    return
  }
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value)) recursiveManifestTargets(nested, visitLeaf)
    return
  }
  visitLeaf(value)
}

function readQuotedValue(source, startIndex) {
  const quote = source[startIndex]
  let value = ''
  for (let index = startIndex + 1; index < source.length; index += 1) {
    const character = source[index]
    if (character === '\\' && index + 1 < source.length) {
      value += character + source[index + 1]
      index += 1
    } else if (character === quote) {
      return { complete: true, end: index + 1, value }
    } else {
      value += character
    }
  }
  return { complete: false, end: source.length, value }
}

function skipStyleTrivia(source, startIndex) {
  let index = startIndex
  while (index < source.length) {
    if (/\s/.test(source[index])) {
      index += 1
    } else if (source.startsWith('/*', index)) {
      const commentEnd = source.indexOf('*/', index + 2)
      return commentEnd < 0 ? source.length : skipStyleTrivia(source, commentEnd + 2)
    } else {
      break
    }
  }
  return index
}

function readStyleFunctionArgument(source, openParenthesisIndex) {
  let quote = null
  let depth = 1
  for (let index = openParenthesisIndex + 1; index < source.length; index += 1) {
    const character = source[index]
    if (quote !== null) {
      if (character === '\\') index += 1
      else if (character === quote) quote = null
      continue
    }
    if (character === '"' || character === "'") quote = character
    else if (source.startsWith('/*', index)) {
      const commentEnd = source.indexOf('*/', index + 2)
      if (commentEnd < 0) return { complete: false, end: source.length, value: '' }
      index = commentEnd + 1
    } else if (character === '(') depth += 1
    else if (character === ')') {
      depth -= 1
      if (depth === 0) {
        return {
          complete: true,
          end: index + 1,
          value: source.slice(openParenthesisIndex + 1, index).trim(),
        }
      }
    }
  }
  return { complete: false, end: source.length, value: '' }
}

function normalizeStyleReference(rawValue) {
  const value = rawValue.trim()
  if (value.length === 0) return { dynamic: true, target: null }
  if (value[0] === '"' || value[0] === "'") {
    const quoted = readQuotedValue(value, 0)
    if (!quoted.complete || value.slice(quoted.end).trim().length > 0) {
      return { dynamic: true, target: null }
    }
    return { dynamic: false, target: quoted.value }
  }
  return { dynamic: false, target: value }
}

function stylesheetReferences(source) {
  const references = []
  let index = 0
  while (index < source.length) {
    if (source.startsWith('/*', index)) {
      const commentEnd = source.indexOf('*/', index + 2)
      index = commentEnd < 0 ? source.length : commentEnd + 2
      continue
    }
    if (source[index] === '"' || source[index] === "'") {
      index = readQuotedValue(source, index).end
      continue
    }

    const atRule = source.slice(index).match(/^@(import|use|forward)\b/i)
    if (atRule !== null) {
      let valueStart = skipStyleTrivia(source, index + atRule[0].length)
      const urlFunction = source.slice(valueStart).match(/^url\s*\(/i)
      if (urlFunction !== null) {
        const argument = readStyleFunctionArgument(
          source,
          valueStart + urlFunction[0].lastIndexOf('('),
        )
        const normalized = normalizeStyleReference(argument.value)
        references.push({
          dynamic: !argument.complete || normalized.dynamic,
          kind: 'import',
          target: normalized.target,
        })
        index = argument.end
        continue
      }
      if (source[valueStart] === '"' || source[valueStart] === "'") {
        const quoted = readQuotedValue(source, valueStart)
        references.push({
          dynamic: !quoted.complete,
          kind: 'import',
          target: quoted.complete ? quoted.value : null,
        })
        index = quoted.end
        continue
      }
      let valueEnd = valueStart
      while (valueEnd < source.length && !/[\s;]/.test(source[valueEnd])) valueEnd += 1
      const target = source.slice(valueStart, valueEnd)
      references.push({
        dynamic: target.length === 0,
        kind: 'import',
        target: target.length === 0 ? null : target,
      })
      index = Math.max(valueEnd, valueStart + 1)
      continue
    }

    const previous = index === 0 ? '' : source[index - 1]
    const urlFunction = /[\w-]/.test(previous)
      ? null
      : source.slice(index).match(/^url\s*\(/i)
    if (urlFunction !== null) {
      const argument = readStyleFunctionArgument(
        source,
        index + urlFunction[0].lastIndexOf('('),
      )
      const normalized = normalizeStyleReference(argument.value)
      references.push({
        dynamic: !argument.complete || normalized.dynamic,
        kind: 'url',
        target: normalized.target,
      })
      index = argument.end
      continue
    }
    index += 1
  }
  return references
}

function htmlAttributes(source) {
  const attributes = new Map()
  let index = 0
  while (index < source.length) {
    while (index < source.length && /\s/.test(source[index])) index += 1
    if (index >= source.length || source[index] === '/' || source[index] === '>') break
    const nameStart = index
    while (index < source.length && /[^\s=/>]/.test(source[index])) index += 1
    const name = source.slice(nameStart, index).toLowerCase()
    while (index < source.length && /\s/.test(source[index])) index += 1
    if (source[index] !== '=') {
      if (name.length > 0) attributes.set(name, '')
      continue
    }
    index += 1
    while (index < source.length && /\s/.test(source[index])) index += 1
    if (source[index] === '"' || source[index] === "'") {
      const quoted = readQuotedValue(source, index)
      attributes.set(name, quoted.complete ? quoted.value : null)
      index = quoted.end
    } else {
      const valueStart = index
      while (index < source.length && /[^\s>]/.test(source[index])) index += 1
      attributes.set(name, source.slice(valueStart, index))
    }
  }
  return attributes
}

function htmlAssetReferences(source) {
  const references = []
  const withoutComments = source.replace(/<!--[\s\S]*?(?:-->|$)/g, '')
  const tagPattern = /<(script|link)\b([^>]*)>/gi
  for (const match of withoutComments.matchAll(tagPattern)) {
    const tagName = match[1].toLowerCase()
    const attributes = htmlAttributes(match[2])
    if (tagName === 'script') {
      if (attributes.get('type')?.toLowerCase() !== 'module' || !attributes.has('src')) continue
      references.push(attributes.get('src'))
    } else {
      const rel = attributes.get('rel')
      if (
        typeof rel !== 'string'
        || !rel.toLowerCase().split(/\s+/).includes('stylesheet')
        || !attributes.has('href')
      ) {
        continue
      }
      references.push(attributes.get('href'))
    }
  }
  return references
}

function isRemoteAssetTarget(target) {
  return target.startsWith('//')
    || target.startsWith('#')
    || /^[a-z][a-z\d+.-]*:/i.test(target)
}

function hasDynamicAssetPathSyntax(target) {
  return hasDynamicPathSyntax(target)
    || target.includes('var(')
    || target.includes('\\')
    || target.startsWith('$')
    || target.startsWith('@{')
}

function staticAssetTarget(sourcePath, ownerDirectory, target, rootRelative) {
  if (
    typeof target !== 'string'
    || target.length === 0
    || hasDynamicAssetPathSyntax(target)
  ) {
    return { candidatePath: null, dynamic: true }
  }
  if (isRemoteAssetTarget(target)) return { candidatePath: null, dynamic: false }
  const pathWithoutSuffix = target.split(/[?#]/, 1)[0]
  if (pathWithoutSuffix.length === 0) return { candidatePath: null, dynamic: false }
  if (pathWithoutSuffix.startsWith('/')) {
    return rootRelative
      ? { candidatePath: resolve(ownerDirectory, pathWithoutSuffix.slice(1)), dynamic: false }
      : { candidatePath: null, dynamic: false }
  }
  return {
    candidatePath: resolve(dirname(sourcePath), pathWithoutSuffix),
    dynamic: false,
  }
}

export function checkRequiredGovernanceFiles(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const canonicalRoot = realpathSync(repositoryRoot)
  const findings = []
  for (const relativePath of REQUIRED_GOVERNANCE_FILES) {
    const absolutePath = join(repositoryRoot, relativePath)
    if (
      !existsSync(absolutePath)
      || !lstatSync(absolutePath).isFile()
      || !isWithin(canonicalRoot, realpathSync(absolutePath))
    ) {
      findings.push(finding(
        'required-governance-file',
        relativePath,
        `[required-governance-file] ${relativePath}: required governance file is missing`,
      ))
    }
  }
  return findings
}

export function checkSourcePathSafety(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const findings = []

  for (const symlinkPath of walkEntries(
    repositoryRoot,
    (_filePath, entry) => entry.isSymbolicLink(),
  )) {
    const relativePath = toRepositoryPath(repositoryRoot, symlinkPath)
    findings.push(finding(
      'repository-symlink',
      relativePath,
      `[repository-symlink] ${relativePath}: repository symlinks are forbidden outside ignored generated directories`,
    ))
  }

  for (const sourceRoot of sourceRootDirectories(repositoryRoot)) {
    const rootStats = lstatSync(sourceRoot)
    if (rootStats.isSymbolicLink()) {
      const relativePath = toRepositoryPath(repositoryRoot, sourceRoot)
      findings.push(finding(
        'source-symlink',
        relativePath,
        `[source-symlink] ${relativePath}: application and package source must not be a symbolic link`,
      ))
      continue
    }
    if (!rootStats.isDirectory()) continue

    for (const sourcePath of walkEntries(
      sourceRoot,
      (_filePath, entry) => entry.isSymbolicLink(),
    )) {
      const relativePath = toRepositoryPath(repositoryRoot, sourcePath)
      findings.push(finding(
        'source-symlink',
        relativePath,
        `[source-symlink] ${relativePath}: symbolic links are forbidden inside application and package source`,
      ))
    }

    for (const sourcePath of walkFiles(
      sourceRoot,
      isSourceFile,
    )) {
      const source = readFileSync(sourcePath, 'utf8')
      const analysis = analyzeSourceReferences(sourcePath, source)
      const relativePath = toRepositoryPath(repositoryRoot, sourcePath)
      if (analysis.dynamicFilesystem) {
        findings.push(finding(
          'dynamic-source-path',
          relativePath,
          `[dynamic-source-path] ${relativePath}: source-location filesystem paths require literal, statically checkable targets`,
        ))
      }
      if (analysis.dynamicModule) {
        findings.push(finding(
          'dynamic-source-module',
          relativePath,
          `[dynamic-source-module] ${relativePath}: import and require calls require one statically checkable module literal`,
        ))
      }
    }
  }

  return findings
}

export function checkDocumentMetadata(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const findings = []
  for (const absolutePath of governedMarkdownFiles(repositoryRoot)) {
    if (!lstatSync(absolutePath).isFile()) continue
    const relativePath = toRepositoryPath(repositoryRoot, absolutePath)
    const markdown = readFileSync(absolutePath, 'utf8')
    for (const label of REQUIRED_DOCUMENT_METADATA) {
      const metadataLine = new RegExp(`^\\s*>?\\s*${label}\\s*[:：]\\s*\\S`, 'm')
      if (metadataLine.test(markdown)) continue
      findings.push(finding(
        'missing-document-metadata',
        relativePath,
        `[missing-document-metadata] ${relativePath}: missing non-empty ${label} metadata`,
      ))
    }
  }
  return findings
}

export function checkAgentsFileSizes(rootDir, maxBytes = MAX_AGENTS_BYTES) {
  const repositoryRoot = resolve(rootDir)
  return walkFiles(repositoryRoot, (filePath) => filePath.endsWith(`${sep}AGENTS.md`))
    .flatMap((filePath) => {
      const size = statSync(filePath).size
      if (size <= maxBytes) return []
      const relativePath = toRepositoryPath(repositoryRoot, filePath)
      return [finding(
        'agents-size-limit',
        relativePath,
        `[agents-size-limit] ${relativePath}: ${size} bytes exceeds the ${maxBytes}-byte limit`,
      )]
    })
}

export function checkMarkdownLocalLinks(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const canonicalRoot = realpathSync(repositoryRoot)
  const findings = []
  const markdownPaths = new Set(governedMarkdownFiles(repositoryRoot))
  for (const relativePath of KEY_MARKDOWN_FILES) {
    const markdownPath = join(repositoryRoot, relativePath)
    if (existsSync(markdownPath) && statSync(markdownPath).isFile()) {
      markdownPaths.add(markdownPath)
    }
  }

  for (const markdownPath of [...markdownPaths].sort()) {
    const relativePath = toRepositoryPath(repositoryRoot, markdownPath)

    const markdown = readFileSync(markdownPath, 'utf8')
    for (const destination of markdownDestinations(markdown)) {
      const targetPath = localMarkdownTarget(repositoryRoot, markdownPath, destination)
      if (targetPath === null) continue
      if (!isWithin(repositoryRoot, targetPath)) {
        findings.push(finding(
          'markdown-link-outside-repository',
          relativePath,
          `[markdown-link-outside-repository] ${relativePath}: local target ${destination} leaves the repository`,
        ))
      } else if (!existsSync(targetPath)) {
        findings.push(finding(
          'broken-markdown-link',
          relativePath,
          `[broken-markdown-link] ${relativePath}: local target ${destination} does not exist`,
        ))
      } else if (!isWithin(canonicalRoot, realpathSync(targetPath))) {
        findings.push(finding(
          'markdown-link-outside-repository',
          relativePath,
          `[markdown-link-outside-repository] ${relativePath}: local target ${destination} resolves outside the repository`,
        ))
      }
    }
  }
  return findings
}

export function checkManifestEntryBoundaries(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const appNames = applicationPackageNames(repositoryRoot)
  const findings = []
  const reported = new Set()

  function report(repositoryModule, code, detail) {
    const relativePath = toRepositoryPath(repositoryRoot, repositoryModule.manifestPath)
    const key = `${code}\0${relativePath}\0${detail}`
    if (reported.has(key)) return
    reported.add(key)
    findings.push(finding(
      code,
      relativePath,
      `[${code}] ${relativePath}: ${detail}`,
    ))
  }

  function checkLocalTarget(repositoryModule, field, target) {
    const status = manifestLocalTargetStatus(repositoryModule.directory, target)
    if (status === 'invalid') {
      report(
        repositoryModule,
        'invalid-manifest-entry',
        `${field} requires a non-empty static path target`,
      )
    } else if (status === 'crosses') {
      report(
        repositoryModule,
        'manifest-entry-crosses-boundary',
        `${field} target ${String(target)} leaves its ${repositoryModule.kind} boundary`,
      )
    }
  }

  for (const repositoryModule of repositoryModules(repositoryRoot)) {
    let manifest
    try {
      manifest = readJson(repositoryModule.manifestPath)
    } catch {
      continue
    }

    for (const field of MANIFEST_ENTRY_FIELDS) {
      if (!(field in manifest)) continue
      checkLocalTarget(repositoryModule, field, manifest[field])
    }

    if ('browser' in manifest) {
      const browser = manifest.browser
      if (typeof browser === 'string') {
        checkLocalTarget(repositoryModule, 'browser', browser)
      } else if (browser === false) {
        // A disabled browser entry is a static, non-loading target.
      } else if (browser !== null && typeof browser === 'object' && !Array.isArray(browser)) {
        for (const [source, target] of Object.entries(browser)) {
          if (localManifestSpecifier(source)) {
            checkLocalTarget(repositoryModule, `browser key ${source}`, source)
          }
          if (target === false) continue
          if (typeof target === 'string') {
            if (localManifestSpecifier(target)) {
              checkLocalTarget(repositoryModule, `browser.${source}`, target)
            } else if (hasDynamicPathSyntax(target)) {
              report(
                repositoryModule,
                'invalid-manifest-entry',
                `browser.${source} requires a static replacement`,
              )
            }
          } else {
            report(
              repositoryModule,
              'invalid-manifest-entry',
              `browser.${source} must be a string or false`,
            )
          }
        }
      } else {
        report(
          repositoryModule,
          'invalid-manifest-entry',
          'browser must be a string, object, or false',
        )
      }
    }

    if ('exports' in manifest) {
      recursiveManifestTargets(manifest.exports, (target) => {
        if (target === null) return
        if (
          typeof target !== 'string'
          || (!target.startsWith('.') && !isAbsolute(target))
        ) {
          report(
            repositoryModule,
            'invalid-manifest-entry',
            'exports leaves must be null or static ./ targets',
          )
          return
        }
        checkLocalTarget(repositoryModule, 'exports', target)
      })
    }

    if ('imports' in manifest) {
      recursiveManifestTargets(manifest.imports, (target) => {
        if (target === null) return
        if (typeof target !== 'string' || target.length === 0 || hasDynamicPathSyntax(target)) {
          report(
            repositoryModule,
            'invalid-manifest-entry',
            'imports leaves must be null or static string targets',
          )
          return
        }
        if (localManifestSpecifier(target)) {
          if (target.startsWith('file:')) {
            report(
              repositoryModule,
              'invalid-manifest-entry',
              'imports local targets must use relative paths',
            )
          } else {
            checkLocalTarget(repositoryModule, 'imports', target)
          }
        } else if (
          appNames.has(target)
          || [...appNames].some((appName) => target.startsWith(`${appName}/`))
          || target === 'apps'
          || target.startsWith('apps/')
          || target === 'packages'
          || target.startsWith('packages/')
        ) {
          report(
            repositoryModule,
            'manifest-entry-crosses-boundary',
            `imports target ${target} bypasses its ${repositoryModule.kind} boundary`,
          )
        }
      })
    }
  }
  return findings
}

export function checkStaticAssetBoundaries(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const findings = []
  const reported = new Set()

  function report(sourcePath, code, detail) {
    const relativePath = toRepositoryPath(repositoryRoot, sourcePath)
    const key = `${code}\0${relativePath}\0${detail}`
    if (reported.has(key)) return
    reported.add(key)
    findings.push(finding(
      code,
      relativePath,
      `[${code}] ${relativePath}: ${detail}`,
    ))
  }

  function checkTarget(repositoryModule, sourcePath, target, rootRelative) {
    const resolved = staticAssetTarget(
      sourcePath,
      repositoryModule.directory,
      target,
      rootRelative,
    )
    if (resolved.dynamic) {
      report(
        sourcePath,
        'dynamic-static-asset-path',
        'local asset references require a static, literal path',
      )
      return
    }
    if (resolved.candidatePath === null) return
    const lexicalCrossing = !isWithin(repositoryModule.directory, resolved.candidatePath)
    const canonicalCrossing = existsSync(resolved.candidatePath)
      && !isWithin(
        realpathSync(repositoryModule.directory),
        realpathSync(resolved.candidatePath),
      )
    if (!lexicalCrossing && !canonicalCrossing) return
    report(
      sourcePath,
      'static-asset-crosses-boundary',
      `local asset target ${String(target)} leaves its ${repositoryModule.kind} boundary`,
    )
  }

  for (const repositoryModule of repositoryModules(repositoryRoot)) {
    for (const sourcePath of walkFiles(
      repositoryModule.directory,
      (filePath) => (
        STYLE_EXTENSIONS.has(sourceExtension(filePath).toLowerCase())
        || basename(filePath).toLowerCase().endsWith('.html')
      ),
    )) {
      const source = readFileSync(sourcePath, 'utf8')
      if (STYLE_EXTENSIONS.has(sourceExtension(sourcePath).toLowerCase())) {
        for (const reference of stylesheetReferences(source)) {
          if (reference.dynamic || reference.target === null) {
            report(
              sourcePath,
              'dynamic-static-asset-path',
              'stylesheet references require a static, literal path',
            )
            continue
          }
          if (
            reference.kind === 'import'
            && !reference.target.startsWith('.')
            && !reference.target.startsWith('/')
            && !isAbsolute(reference.target)
          ) {
            if (hasDynamicAssetPathSyntax(reference.target)) {
              report(
                sourcePath,
                'dynamic-static-asset-path',
                'stylesheet imports require a static package or local path',
              )
            }
            continue
          }
          checkTarget(repositoryModule, sourcePath, reference.target, false)
        }
      } else {
        for (const target of htmlAssetReferences(source)) {
          checkTarget(repositoryModule, sourcePath, target, true)
        }
      }
    }
  }
  return findings
}

export function checkPackageSourceBoundaries(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const packagesRoot = join(repositoryRoot, 'packages')
  const appNames = applicationPackageNames(repositoryRoot)
  const findings = []

  for (const sourcePath of walkFiles(
    packagesRoot,
    (filePath) => filePath.includes(`${sep}src${sep}`) && isSourceFile(filePath),
  )) {
    const source = readFileSync(sourcePath, 'utf8')
    const references = analyzeSourceReferences(sourcePath, source)
    const invalidModuleSpecifier = references.moduleSpecifiers.find((specifier) => (
      specifierTargetsApplication(repositoryRoot, sourcePath, specifier, appNames)
    ))
    const invalidFilesystemSpecifier = references.filesystemSpecifiers.find((specifier) => (
      filesystemSpecifierTargetsApplication(repositoryRoot, sourcePath, specifier)
    ))
    const invalidSpecifier = invalidModuleSpecifier ?? invalidFilesystemSpecifier
    if (invalidSpecifier !== undefined) {
      const relativePath = toRepositoryPath(repositoryRoot, sourcePath)
      findings.push(finding(
        'package-imports-app',
        relativePath,
        `[package-imports-app] ${relativePath}: package source references application module or path ${invalidSpecifier}`,
      ))
    }
  }
  return findings
}

export function checkPackageManifestBoundaries(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const applications = applicationPackages(repositoryRoot)
  const findings = []

  for (const manifestPath of childPackageManifests(repositoryRoot, 'packages')) {
    const relativePath = toRepositoryPath(repositoryRoot, manifestPath)
    let manifest
    try {
      manifest = readJson(manifestPath)
    } catch (error) {
      findings.push(finding(
        'invalid-package-manifest',
        relativePath,
        `[invalid-package-manifest] ${relativePath}: ${error.message}`,
      ))
      continue
    }

    for (const field of DEPENDENCY_FIELDS) {
      const dependencies = manifest[field]
      if (dependencies === null || typeof dependencies !== 'object') continue
      for (const [dependencyName, dependencySpec] of Object.entries(dependencies)) {
        if (dependencyTargetsApplication(
          manifestPath,
          dependencyName,
          dependencySpec,
          applications,
        )) {
          findings.push(finding(
            'package-depends-on-app',
            relativePath,
            `[package-depends-on-app] ${relativePath}: ${field} includes application dependency ${dependencyName}@${String(dependencySpec)}`,
          ))
        }
        if (
          FORBIDDEN_PACKAGE_RUNTIME_DEPENDENCIES.has(dependencyName)
          || dependencySpecAliasesPackage(
            dependencySpec,
            FORBIDDEN_PACKAGE_RUNTIME_DEPENDENCIES,
          )
        ) {
          findings.push(finding(
            'package-depends-on-runtime',
            relativePath,
            `[package-depends-on-runtime] ${relativePath}: ${field} includes forbidden runtime dependency ${dependencyName}@${String(dependencySpec)}`,
          ))
        }
      }
    }
  }
  return findings
}

export function checkApplicationBoundaries(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const applications = applicationPackages(repositoryRoot)
  const findings = []

  for (const application of applications) {
    const otherApplications = applications.filter(
      (candidate) => candidate.directory !== application.directory,
    )
    const relativeManifestPath = toRepositoryPath(repositoryRoot, application.manifestPath)

    for (const field of DEPENDENCY_FIELDS) {
      const dependencies = application.manifest[field]
      if (dependencies === null || typeof dependencies !== 'object') continue
      for (const [dependencyName, dependencySpec] of Object.entries(dependencies)) {
        if (!dependencyTargetsApplication(
          application.manifestPath,
          dependencyName,
          dependencySpec,
          otherApplications,
        )) continue
        findings.push(finding(
          'app-depends-on-app',
          relativeManifestPath,
          `[app-depends-on-app] ${relativeManifestPath}: ${field} includes peer application dependency ${dependencyName}@${String(dependencySpec)}`,
        ))
      }
    }

    for (const sourcePath of walkFiles(
      join(application.directory, 'src'),
      isSourceFile,
    )) {
      const source = readFileSync(sourcePath, 'utf8')
      const references = analyzeSourceReferences(sourcePath, source)
      const invalidModuleSpecifier = references.moduleSpecifiers.find((specifier) => (
        specifierTargetsOtherApplication(sourcePath, specifier, otherApplications)
      ))
      const invalidFilesystemSpecifier = references.filesystemSpecifiers.find((specifier) => (
        filesystemSpecifierTargetsOtherApplication(
          sourcePath,
          specifier,
          otherApplications,
        )
      ))
      const invalidSpecifier = invalidModuleSpecifier ?? invalidFilesystemSpecifier
      if (invalidSpecifier === undefined) continue
      const relativeSourcePath = toRepositoryPath(repositoryRoot, sourcePath)
      findings.push(finding(
        'app-imports-app',
        relativeSourcePath,
        `[app-imports-app] ${relativeSourcePath}: application source references peer application module or path ${invalidSpecifier}`,
      ))
    }
  }

  return findings
}

export function checkConfigurationBoundaries(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const applications = applicationPackages(repositoryRoot)
  const modules = repositoryModules(repositoryRoot)
  const packageDirectories = childPackageManifests(repositoryRoot, 'packages')
    .map((manifestPath) => dirname(manifestPath))
  const findings = []
  const reported = new Set()

  function boundaryTargets(configPath) {
    const ownerApplication = applications.find((application) => (
      isWithin(application.directory, configPath)
    ))
    if (ownerApplication !== undefined) {
      return applications.filter((application) => (
        application.directory !== ownerApplication.directory
      ))
    }

    const isOwnedByPackage = packageDirectories.some((packageDirectory) => (
      isWithin(packageDirectory, configPath)
    ))
    return isOwnedByPackage ? applications : []
  }

  function crossesApplicationBoundary(configPath, candidatePath, mayExpand = false) {
    return boundaryTargets(configPath).some((application) => (
      isWithin(application.directory, candidatePath)
      || (mayExpand && isWithin(candidatePath, application.directory))
    ))
  }

  function report(configPath, code, detail) {
    const relativePath = toRepositoryPath(repositoryRoot, configPath)
    const reportKey = `${code}\0${relativePath}\0${detail}`
    if (reported.has(reportKey)) return
    reported.add(reportKey)
    findings.push(finding(
      code,
      relativePath,
      `[${code}] ${relativePath}: ${detail}`,
    ))
  }

  function checkCandidate(configPath, candidatePath, detail, mayExpand = false) {
    if (crossesApplicationBoundary(configPath, candidatePath, mayExpand)) {
      report(configPath, 'config-crosses-application', detail)
    }
  }

  function checkPattern(configPath, baseDirectory, pattern, detail) {
    const candidatePath = resolve(baseDirectory, pattern)
    checkCandidate(configPath, candidatePath, detail)
    const magicIndex = pattern.search(/[*?\[\]{}()!@]/)
    if (magicIndex >= 0) {
      checkCandidate(
        configPath,
        resolve(baseDirectory, pattern.slice(0, magicIndex)),
        detail,
        true,
      )
    }
  }

  for (const configPath of walkFiles(repositoryRoot, (filePath) => (
    /^(?:tsconfig(?:\.[^.]+)*|jsconfig)\.json$/.test(basename(filePath))
    || /^vite\.config\.(?:[cm]?[jt]s)$/.test(basename(filePath))
  ))) {
    const ownerModule = owningRepositoryModule(modules, configPath)
    if (ownerModule === undefined) continue
    const configName = basename(configPath)
    const source = readFileSync(configPath, 'utf8')

    if (/^(?:tsconfig(?:\.[^.]+)*|jsconfig)\.json$/.test(configName)) {
      const loaded = ts.readConfigFile(configPath, ts.sys.readFile)
      if (loaded.error !== undefined) {
        report(configPath, 'invalid-boundary-config', 'TypeScript configuration cannot be parsed')
        continue
      }
      const parsed = ts.parseJsonConfigFileContent(
        loaded.config,
        ts.sys,
        dirname(configPath),
        {},
        configPath,
      )
      for (const error of parsed.errors) {
        if (error.code === 18002 || error.code === 18003) continue
        report(
          configPath,
          'invalid-boundary-config',
          `TypeScript configuration error TS${error.code}`,
        )
      }

      if (typeof parsed.options.baseUrl === 'string') {
        checkCandidate(
          configPath,
          parsed.options.baseUrl,
          'TypeScript baseUrl references a peer application',
        )
      }

      const paths = parsed.options.paths
      const pathsBase = parsed.options.baseUrl
        ?? parsed.options.pathsBasePath
        ?? dirname(configPath)
      for (const targets of Object.values(paths ?? {})) {
        if (!Array.isArray(targets)) {
          report(configPath, 'dynamic-config-alias', 'compilerOptions.paths targets must be literal arrays')
          continue
        }
        for (const target of targets) {
          if (typeof target !== 'string') {
            report(configPath, 'dynamic-config-alias', 'compilerOptions.paths targets must be strings')
            continue
          }
          checkPattern(
            configPath,
            pathsBase,
            target,
            `TypeScript path alias references application path ${target}`,
          )
        }
      }

      for (const rootDirectory of parsed.options.rootDirs ?? []) {
        checkCandidate(
          configPath,
          rootDirectory,
          'TypeScript rootDirs includes a peer application',
          true,
        )
      }
      for (const filePath of parsed.fileNames) {
        checkCandidate(configPath, filePath, 'TypeScript files/include reaches a peer application')
      }
      for (const wildcardDirectory of Object.keys(parsed.wildcardDirectories ?? {})) {
        checkCandidate(
          configPath,
          wildcardDirectory,
          'TypeScript include reaches a peer application',
          true,
        )
      }
      for (const reference of parsed.projectReferences ?? []) {
        checkCandidate(
          configPath,
          reference.path,
          'TypeScript project reference reaches a peer application',
        )
      }
      continue
    }

    const sourceFile = ts.createSourceFile(
      configPath,
      source,
      ts.ScriptTarget.Latest,
      true,
      sourceScriptKind(configPath),
    )
    if (sourceFile.parseDiagnostics.length > 0) {
      report(configPath, 'invalid-boundary-config', 'Vite configuration cannot be parsed')
      continue
    }
    for (const expression of viteAliasExpressions(sourceFile)) {
      const candidatePath = staticConfigPath(expression, configPath)
      if (candidatePath === null) {
        report(configPath, 'dynamic-config-alias', 'Vite aliases require statically checkable replacements')
      } else if (
        candidatePath !== undefined
        && crossesApplicationBoundary(configPath, candidatePath)
      ) {
        report(
          configPath,
          'config-crosses-application',
          `Vite alias references application path ${toRepositoryPath(repositoryRoot, candidatePath)}`,
        )
      }
    }
    const viteFilesystem = viteFilesystemSettings(sourceFile, configPath)
    for (const label of viteFilesystem.dynamic) {
      report(
        configPath,
        'dynamic-config-path',
        `${label} requires statically checkable filesystem paths`,
      )
    }
    for (const { candidatePath, label, mayExpand } of viteFilesystem.settings) {
      if (
        isWithin(ownerModule.directory, candidatePath)
        && !(mayExpand && crossesPeerModuleBoundary(
          modules,
          ownerModule,
          candidatePath,
          true,
        ))
      ) {
        continue
      }
      report(
        configPath,
        'config-crosses-boundary',
        `${label} leaves its ${ownerModule.kind} boundary for ${toRepositoryPath(repositoryRoot, candidatePath)}`,
      )
    }
  }

  return findings
}

export function checkApiUsesJavaScriptOnly(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const apiSourceRoot = join(repositoryRoot, 'apps/api/src')
  return walkFiles(apiSourceRoot, (filePath) => {
    const extension = sourceExtension(filePath)
    return SOURCE_EXTENSIONS.has(extension.toLowerCase()) && extension !== '.js'
  })
    .map((filePath) => {
      const relativePath = toRepositoryPath(repositoryRoot, filePath)
      return finding(
        'api-source-language',
        relativePath,
        `[api-source-language] ${relativePath}: apps/api/src permits only CommonJS .js source files`,
      )
    })
}

export function checkRepositorySkills(
  rootDir,
  allowedSkills = ALLOWED_REPOSITORY_SKILLS,
) {
  const repositoryRoot = resolve(rootDir)
  const skillsRoot = join(repositoryRoot, '.agents/skills')
  if (!existsSync(skillsRoot)) return []

  const allowlist = new Set(allowedSkills)
  return readdirSync(skillsRoot, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const relativePath = `.agents/skills/${entry.name}`
      if (entry.isSymbolicLink()) {
        return [finding(
          'repository-skill-symlink',
          relativePath,
          `[repository-skill-symlink] ${relativePath}: repository skills must be real directories`,
        )]
      }
      if (!entry.isDirectory()) {
        return [finding(
          'invalid-repository-skill-entry',
          relativePath,
          `[invalid-repository-skill-entry] ${relativePath}: .agents/skills may contain only allowlisted skill directories`,
        )]
      }
      if (!allowlist.has(entry.name)) {
        return [finding(
          'unapproved-repository-skill',
          relativePath,
          `[unapproved-repository-skill] ${relativePath}: repository skill is not in the FlightWoodX allowlist`,
        )]
      }
      return []
    })
}

export function checkRepositorySkillShape(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const skillPath = join(
    repositoryRoot,
    '.agents/skills/flightwoodx-development/SKILL.md',
  )
  const metadataPath = join(
    repositoryRoot,
    '.agents/skills/flightwoodx-development/agents/openai.yaml',
  )
  const findings = []

  if (existsSync(skillPath) && lstatSync(skillPath).isFile()) {
    const skill = readFileSync(skillPath, 'utf8')
    const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]
    const name = frontmatter ? yamlScalar(frontmatter, 'name') : null
    const description = frontmatter ? yamlScalar(frontmatter, 'description') : null
    if (name !== 'flightwoodx-development' || description === null) {
      const relativePath = '.agents/skills/flightwoodx-development/SKILL.md'
      findings.push(finding(
        'invalid-repository-skill',
        relativePath,
        `[invalid-repository-skill] ${relativePath}: frontmatter requires the allowlisted name and a non-empty description`,
      ))
    }
  }

  if (existsSync(metadataPath) && lstatSync(metadataPath).isFile()) {
    const metadata = readFileSync(metadataPath, 'utf8')
    const displayName = yamlScalar(metadata, 'display_name')
    const shortDescription = yamlScalar(metadata, 'short_description')
    const defaultPrompt = yamlScalar(metadata, 'default_prompt')
    if (
      displayName === null
      || shortDescription === null
      || defaultPrompt === null
      || !defaultPrompt.includes('$flightwoodx-development')
    ) {
      const relativePath = '.agents/skills/flightwoodx-development/agents/openai.yaml'
      findings.push(finding(
        'invalid-repository-skill',
        relativePath,
        `[invalid-repository-skill] ${relativePath}: interface requires display_name, short_description, and a default_prompt that invokes $flightwoodx-development`,
      ))
    }
  }

  return findings
}

export function checkDuplicateCurrentStatusFiles(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const rootStatusPath = join(repositoryRoot, 'CURRENT_STATUS.md')
  return walkFiles(
    repositoryRoot,
    (filePath) => filePath.endsWith(`${sep}CURRENT_STATUS.md`) && filePath !== rootStatusPath,
  ).map((filePath) => {
    const relativePath = toRepositoryPath(repositoryRoot, filePath)
    return finding(
      'nested-current-status',
      relativePath,
      `[nested-current-status] ${relativePath}: root CURRENT_STATUS.md is the only current-status source`,
    )
  })
}

export function checkForbiddenSkillDiscoveryResidue(rootDir) {
  const repositoryRoot = resolve(rootDir)
  const forbiddenPaths = ['.claude/skills', 'skills', 'skills-lock.json']
  return forbiddenPaths.flatMap((relativePath) => {
    if (!pathEntryExists(join(repositoryRoot, relativePath))) return []
    return [finding(
      'legacy-skill-discovery',
      relativePath,
      `[legacy-skill-discovery] ${relativePath}: remove this legacy discovery path and migrate repository skills to .agents/skills/flightwoodx-development`,
    )]
  })
}

export function checkLocalAgentSettings(rootDir) {
  const repositoryRoot = resolve(rootDir)
  return walkEntries(
    repositoryRoot,
    (filePath) => toRepositoryPath(repositoryRoot, filePath)
      .endsWith('.claude/settings.local.json'),
  ).map((filePath) => {
    const relativePath = toRepositoryPath(repositoryRoot, filePath)
    return finding(
      'local-agent-settings',
      relativePath,
      `[local-agent-settings] ${relativePath}: local agent permission settings must not be stored in the repository`,
    )
  })
}

export function checkHarness(rootDir = process.cwd()) {
  const repositoryRoot = resolve(rootDir)
  return [
    ...checkRequiredGovernanceFiles(repositoryRoot),
    ...checkDuplicateCurrentStatusFiles(repositoryRoot),
    ...checkForbiddenSkillDiscoveryResidue(repositoryRoot),
    ...checkLocalAgentSettings(repositoryRoot),
    ...checkDocumentMetadata(repositoryRoot),
    ...checkAgentsFileSizes(repositoryRoot),
    ...checkMarkdownLocalLinks(repositoryRoot),
    ...checkSourcePathSafety(repositoryRoot),
    ...checkStaticAssetBoundaries(repositoryRoot),
    ...checkPackageSourceBoundaries(repositoryRoot),
    ...checkManifestEntryBoundaries(repositoryRoot),
    ...checkPackageManifestBoundaries(repositoryRoot),
    ...checkApplicationBoundaries(repositoryRoot),
    ...checkConfigurationBoundaries(repositoryRoot),
    ...checkApiUsesJavaScriptOnly(repositoryRoot),
    ...checkRepositorySkills(repositoryRoot),
    ...checkRepositorySkillShape(repositoryRoot),
  ]
}

export function runCli(rootDir = process.cwd()) {
  const findings = checkHarness(rootDir)

  if (findings.length > 0) {
    console.error(`Harness check failed with ${findings.length} finding(s):`)
    for (const item of findings) console.error(`- ${item.message}`)
    return 1
  }

  console.log('Harness check passed')
  return 0
}

const isDirectRun = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isDirectRun) process.exitCode = runCli(process.argv[2])
