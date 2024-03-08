#!/usr/bin/env node

import fs from 'node:fs/promises'
import p from 'node:path'

const junk = {
  dirs: [
    // 'assets',
    // 'doc',
    // 'img',
    // 'imgs',
    '__mocks__',
    '__tests__',
    '.circleci',
    '.github',
    '.idea',
    '.nyc_output',
    '.vscode',
    'coverage',
    'docs',
    'example',
    'examples',
    'images',
    'logos',
    'node-gyp',
    'powered-test',
    'test',
    'tests',
    'website',
  ],
  files: [
    '_config.yml',
    '.appveyor.yml',
    '.babelrc',
    '.coveralls.yml',
    '.documentup.json',
    '.DS_Store',
    '.editorconfig',
    '.eslintignore',
    '.eslintrc.js',
    '.eslintrc.json',
    '.eslintrc.yml',
    '.eslintrc',
    '.flowconfig',
    '.gitattributes',
    '.gitlab-ci.yml',
    '.gitmodules',
    '.htmllintrc',
    '.jshintrc',
    '.lint',
    '.npmignore',
    '.npmrc',
    '.prettierrc.js',
    '.prettierrc.json',
    '.prettierrc.toml',
    '.prettierrc.yml',
    '.prettierrc',
    '.stylelintrc.js',
    '.stylelintrc.json',
    '.stylelintrc.yaml',
    '.stylelintrc.yml',
    '.stylelintrc',
    '.tern-project',
    '.travis.yml',
    '.yarn-integrity',
    '.yarn-metadata.json',
    '.yarnclean',
    '.yo-rc.json',
    'appveyor.yml',
    'AUTHORS',
    'biome.json',
    'changelog',
    'CHANGELOG',
    'CHANGES',
    'circle.yml',
    'CONTRIBUTORS',
    'eslint',
    'Gruntfile.js',
    'gulpfile.js',
    'Gulpfile.js',
    'htmllint.js',
    'Jenkinsfile',
    'jest.config.js',
    'karma.conf.js',
    'LICENCE-MIT',
    'LICENCE.BSD',
    'LICENCE.txt',
    'licence',
    'LICENCE',
    'LICENSE-jsbn',
    'LICENSE-MIT',
    'LICENSE-MIT',
    'LICENSE.BSD',
    'LICENSE.txt',
    'license',
    'LICENSE',
    'LICENSE',
    'Makefile',
    'prettier.config.js',
    'README',
    'stylelint.config.js',
    'thumbs.db',
    'tsconfig.json',
    'tslint.json',
    'wallaby.conf.js',
    'wallaby.js',
  ],
  exts: [
    '.coffee',
    '.jst',
    '.markdown',
    '.md',
    '.mkd',
    '.swp',
    '.tgz',
    '.ts',
    '.log',
  ],
}

/**
 * Prints out instructions
 * @returns {void}
 */
function usage() {
  const usageText = `
  Removes unused files from node_modules.

  Example:
    $ pruner --path=node_modules/.pnpm

  Usage:
    pruner [flags]

    Flags:

    --path:        Relative or absolute path to your
                   node_modules directory
    --concurrency: Optional, default 100. How many files to
                   remove at the same time. Tweak according
                   to your system’s abilities`

  console.log(usageText)
}

/**
 * Logs error and usages and exits
 * @param {string} str
 * @returns {void}
 */
function errWithUsage(str) {
  log.error('Err:', str)
  usage()
  process.exit(1)
}

/**
 * Logs error and exits
 * @param {string} str
 * @returns {void}
 */
function errWithMsg(str) {
  log.error('Err:', str)
  process.exit(1)
}

const log = {
  /** @param {any[]} args */
  info: (...args) => console.log('\x1b[90m', ...args, '\x1b[0m'),
  /** @param {any[]} args */
  error: (...args) => console.error('\x1b[31m', ...args, '\x1b[0m'),
}

/** @typedef {{ [k: string]: string | boolean | string[] | number, _: string[] }} Args */

/**
 * Parses the cli args and returns an object with the flags and their values
 * @returns {Args}
 */
function parseArgs() {
  /** @type {Args} */
  const args = { _: [] }
  for (const arg of process.argv.slice(2)) {
    switch (true) {
      case arg.slice(0, 2) === '--': {
        const [key, val] = arg.split('=')
        args[key.slice(2)] = val || true
        break
      }
      case arg[0] === '-' && arg.includes('='): {
        const [key, val] = arg.split('=')
        args[key.slice(1)] = val || true
        break
      }
      case arg[0] === '-': {
        const flags = arg.slice(1).split('')
        for (const flag of flags) args[flag] = true
        break
      }
      default:
        if (Array.isArray(args._)) args._.push(arg)
    }
  }

  return args
}

/**
 * Check if the given path exists on the disc
 * @param {string} path
 * @returns {Promise<string>}
 */
async function validatePath(path) {
  if (!path) errWithUsage('--path is required')

  const absolutePath = p.isAbsolute(path)
    ? path
    : p.resolve(process.cwd(), path)

  try {
    await fs.access(absolutePath)
    return absolutePath
  } catch (err) {
    errWithMsg(err instanceof Error ? err.message : 'Unknown error')
    return ''
  }
}

const rmOpts = { recursive: true, force: true }

/** @typedef {{ name: string, path: string }} DirEnt */

/**
 * Removes unneeded files from node_modules
 * @param {object} options
 * @param {number} [options.concurrency=100]
 * @param {string} options.path
 */
async function prune(options) {
  console.time('⏳ Prune time:')
  const defaults = { concurrency: 100, path: undefined }
  const opts = { ...defaults, ...options }
  const nodeModulePath = await validatePath(opts.path)

  console.log('🧹 Pruning:', nodeModulePath)

  /** @type {DirEnt[]} */
  const allFiles = await fs.readdir(nodeModulePath, {
    recursive: true,
    withFileTypes: true,
  })

  // Make an iterator from the array
  const iterator = allFiles.entries()
  const results /** @type {string[]} */ = []

  /**
   * @param {Iterable<[number, DirEnt]>} iterator
   */
  async function delWorker(iterator) {
    for (const [_, { name, path }] of iterator) {
      try {
        // First remove dirs
        if (junk.dirs.includes(name)) {
          const file = p.join(path, name)
          results.push(file)
          await fs.rm(file, rmOpts)
        }
        // Then remove files
        if (junk.files.includes(name) && !results.includes(path)) {
          const file = p.join(path, name)
          results.push(file)
          await fs.rm(file, rmOpts)
        }
        // And lastly remove files based on their file extension
        if (
          junk.exts.includes(p.extname(name)) &&
          !results.includes(name) &&
          !results.includes(path)
        ) {
          const file = p.join(path, name)
          results.push(file)
          await fs.rm(file, rmOpts)
        }
      } catch (err) {
        errWithMsg(err instanceof Error ? err.message : 'Unknown error')
      }
    }
  }

  // Set a sane concurrency or stack might overflow
  const workers = Array(opts.concurrency).fill(iterator).map(delWorker)
  await Promise.allSettled(workers)

  console.log('🟢 Removed:', results.length, 'files and dirs')
  console.timeEnd('⏳ Prune time:')

  return results
}

const args = parseArgs()

// Cast
const path = /** @type {string} */ (args.path)
const concurrency = /** @type {number} */ (args.concurrency)
;(async () => {
  await prune({ path, concurrency })
})()
