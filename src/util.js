import Concat from 'concat-with-sourcemaps'
import babel from 'babel-core'
import Parallel from 'node-parallel'
import chalk from 'chalk'
import path from 'path'
import fs from 'fs'

const wccBin = path.resolve(__dirname, '../bin/wcc')
const wcscBin = path.resolve(__dirname, '../bin/wcsc')

export const isLinux = /^linux/.test(process.platform)
export const isWin = /^win/.test(process.platform)
export const isMac = /^darwin/.test(process.platform)

export const wcc = isMac ? wccBin :(isWin ? `${wccBin}.exe` : `wine ${wccBin}.exe` )
export const wcsc = isMac ? wcscBin :(isWin ? `${wcscBin}.exe` : `wine ${wcscBin}.exe` )


export function readFile(p, root) {
  p = path.resolve(root, p)
  return new Promise((resolve, reject) => {
    fs.stat(p, function(err, stat) {
      if (stat && stat.isFile()) {
        fs.readFile(p, 'utf8', (err, content) => {
          if (err) return reject(err)
          resolve(content)
        })
      } else {
        reject(new Error(`file ${p} not found`))
      }
    })
  })
}

export function logError(message) {
  console.log(chalk.red(message))
}

export function normalizePath(p) {
  if (isWin) return p.replace(/\\/g, '/')
  return p
}

export function parseWxmlImports(res, file, root, cb) {
  if (res.length == 0) res.push(file)
  readFile(file, '').then(xml => {
    let re = /<(import|include)\s+[^>]+?>/g
    let arr = []
    let p = new Parallel()
    while ((arr = re.exec(xml)) !== null) {
      let ms = arr[0].match(/src="([^"]+)"/)
      if (ms && ms[1]) {
        let f = /^\//.test(ms[1]) ? 
          path.join(root, ms[1].replace(/^\//, ''))
          : path.resolve(path.dirname(file), ms[1])
        if (res.indexOf(f) === -1) {
          res.push(f)
          p.add(done => {
            parseWxmlImports(res, f, root, done)
          })
        }
      }
    }
    p.done(cb)
  }, cb)
}

export function parseWxssImports(res, file, root, cb) {
  if (res.length === 0) res.push(file)
  let re = /\s*@import\s+[^;]+?;/g
  fs.readFile(file, 'utf8', (err, content) => {
    if (err) return cb(err)
    let arr = []
    let p = new Parallel()
    while ((arr = re.exec(content)) !== null) {
      let ms = arr[0].match(/(['"])([^\1]+)\1/)
      if (ms && ms[2]) {
        let f = /^\//.test(ms[2]) ? 
                  path.join(root, ms[2].replace(/^\//, ''))
                : path.resolve(path.dirname(file), ms[2])
        if (res.indexOf(f) == -1) {
          res.push(f)
          p.add(done => {
            parseWxssImports(res, f, root, done)
          })
        }
      }
    }
    p.done(cb)
  })
}

export function normalizeFiles(srcs, root) {
  return srcs.map(src => {
    return normalizePath(`./${path.relative(root, src)}`)
  })
}

export function parseJavascript(config, p, root) {
  p = path.resolve(root, p)
  return new Promise(function(resolve, reject) {
    let part = normalizePath(path.relative(root, p))
    let isModule = p != 'app.js' && config.pages.indexOf(part.replace(/\.js$/, '')) == -1
    loadJavascript(p, root, config.babel, function (err, result) {
      if (err) return reject(err)
      let concat = new Concat(true, part, '\n')
      concat.add(null, `define("${part}", function(require,module,exports,window,document,frames,self,location,navigator,localStorage,history,Caches,screen,alert,confirm,prompt,XMLHttpRequest,WebSocket){`)
      concat.add(part, result.code, result.map)
      concat.add(null, '});' + (isModule ? '' : `require("${part}")`))
      return resolve({
        code: concat.content,
        map: concat.sourceMap
      })
    })
  })
}

function loadJavascript(p, root, useBabel, cb) {
  if (useBabel) {
    babel.transformFile(p, {
      presets: ['babel-preset-es2015'].map(require.resolve),
      sourceMaps: true,
      sourceRoot: root,
      sourceFileName: normalizePath(path.relative(root, p)),
      babelrc: false,
      ast: false,
      resolveModuleSource: false
    }, function(err, result) {
      if (err) return cb(err)
      cb(null, result)
    })
  } else {
    fs.readFile(p, 'utf8', function (err, content) {
      if (err) return cb(err)
      cb(null, {
        code: content,
        map: null
      })
    })
  }
}

