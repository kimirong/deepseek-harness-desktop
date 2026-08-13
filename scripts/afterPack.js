'use strict'
// electron-builder afterPack hook: strip Electron's bundled locale files to
// the languages this shell actually needs (English + Chinese). Electron ships
// ~47MB of locale data per platform (220 .lproj on macOS, 55 .pak on Windows);
// the shell only shows a fixed Chinese/English UI, so the rest is dead weight.
const fs = require('node:fs')
const path = require('node:path')

// Keep any locale whose name starts with these prefixes.
const KEEP_PREFIXES = ['en', 'zh']

function isKeep(name) {
  return KEEP_PREFIXES.some((prefix) => name.startsWith(prefix))
}

async function stripDirectory(dir, predicate) {
  if (!fs.existsSync(dir)) return 0
  let removed = 0
  for (const entry of fs.readdirSync(dir)) {
    if (!predicate(entry)) {
      fs.rmSync(path.join(dir, entry), { recursive: true, force: true })
      removed += 1
    }
  }
  return removed
}

/**
 * @param {import('app-builder-lib').AfterPackContext} context
 */
exports.default = async function afterPack(context) {
  const { appOutDir, packager, electronPlatformName } = context
  let removed = 0

  if (electronPlatformName === 'darwin') {
    const resources = path.join(
      appOutDir,
      `${packager.appInfo.productName}.app`,
      'Contents', 'Frameworks', 'Electron Framework.framework',
      'Versions', 'A', 'Resources',
    )
    removed = await stripDirectory(resources, (entry) => !entry.endsWith('.lproj') || isKeep(entry))
  } else if (electronPlatformName === 'win32') {
    removed = await stripDirectory(path.join(appOutDir, 'locales'), (entry) => isKeep(entry.replace(/\.pak$/, '')))
    // The default app template is only a placeholder; never needed at runtime.
    const defaultAsar = path.join(appOutDir, 'resources', 'default_app.asar')
    if (fs.existsSync(defaultAsar)) {
      fs.rmSync(defaultAsar, { force: true })
      removed += 1
    }
  }

  console.log(`[afterPack] removed ${removed} locale/placeholder files (${electronPlatformName})`)
}
