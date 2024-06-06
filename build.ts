import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { ensureDir } from 'fs-extra'
import { md5 } from './lib/hash'
import { publicFiles } from './lib/public'

ensureDir('dist')

const styleFile = readFileSync('frontend/assets/ui.css').toString()
    .replace(/\/site-prefix/g, '/generals')
const scriptFile = readFileSync('frontend/dist/ui.js').toString()
const indexFile = readFileSync('frontend/assets/index.html').toString()
    .replace('{{ var.scriptVersion }}', md5(scriptFile))
    .replace('{{ var.styleVersion }}', md5(styleFile))
    .replace(/{{ var.sitePrefix }}/g, '/generals')

writeFileSync('dist/game_replay.html', indexFile)
writeFileSync('dist/ui.css', styleFile)
writeFileSync('dist/ui.js', scriptFile)

ensureDir('dist/public')
for (const file of publicFiles) copyFileSync(`frontend/assets/${file}`, `dist/public/${file}`)
