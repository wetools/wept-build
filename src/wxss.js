import fs from 'fs'
import Parallel from 'node-parallel'
import sourceMap from 'source-map'
import convert from 'convert-source-map'
import path from 'path'
import {
  wcsc,
  isLinux,
  logError,
  parseWxssImports,
  normalizeFiles} from './util'
import {execFile, exec} from 'child_process'

const wxss_args = ['-lc', '-db']
const BASE_DEVICE_WIDTH = 750
const EPS = 0.0001
const RPXRE = /%%\?[+-]?\d+(\.\d+)?rpx\?%%/g

export default function (p, root, opts = {}) {
  root = root || process.cwd()
  p = path.resolve(root, p)
  let args = opts.args || wxss_args
  return new Promise((resolve, reject) => {
    let srcs = []
    parseWxssImports(srcs, p, root, err => {
      if (err) return reject(err)
      srcs = normalizeFiles(srcs, root)

      let execWcsc = execFile.bind(null, wcsc, args.concat(srcs))
      if (isLinux) {
        execWcsc = exec.bind(null, [wcsc].concat(args).concat(srcs).join(' '))
      }
      execWcsc( {maxBuffer: 1024 * 600, cwd: root}, (err, stdout, stderr) => {
        if (stderr) logError(stderr)
        if (err) {
          console.error(err.stack)
          return reject(new Error(`${p} 编译失败，请检查`))
        }
        addSourceMap(path.relative(root, p), root, stdout).then(content => {
          resolve(function (width, ratio) {
            var b
            b = content.match(RPXRE)
            if (b) {
              b.forEach(function(c) {
                var d = getNumber(c, width, ratio)
                var e = d + "px"
                content = content.replace(c, e)
              })
            }
            return content

          })
        }, reject)
      })
    })
  })
}

function addSourceMap(file, root, content) {
  let generator = new sourceMap.SourceMapGenerator({
    file: file
  })
  let results = []
  let files = []
  content.split('\n').forEach((line, i) => {
    let lnum = i + 1
    line = line.replace(/;wxcs_style[^;]+;/g, '')
    line = line.replace(/;wxcs_fileinfo:\s([^\s]+)\s(\d+)\s(\d+);/, function (match, file, lineNum, colNum) {
      file = file.replace(/^\.?\//, '')
      if (files.indexOf(file) == -1) files.push(file)
      generator.addMapping({
        source: file,
        original: {line: lineNum, column: colNum},
        generated: {line: lnum, column: 0}
      })
      return ''
    })
    results.push(line)
  })

  return new Promise((resolve, reject) => {
    let p = new Parallel()
    files.forEach(f => {
      p.add(done => {
        fs.readFile(path.resolve(root, f), 'utf8', (err, content) => {
          if (err) return done(err)
          generator.setSourceContent(f, content)
          done()
        })
      })
    })
    p.done(err => {
      if (err) return reject(err)
      let res = results.join('\n')
      res = res + convert.fromJSON(generator.toString()).toComment({
        multiline: true
      })
      resolve(res)
    })
  })
}

function transformByDPR(a, width, dpr) {
  a = a / BASE_DEVICE_WIDTH * width
  a = Math.floor(a + EPS)
  if (a === 0) {
    if (dpr === 1) {
      return 1
    } else {
      return 0.5
    }
  }
  return a
}

function getNumber(e, width, ratio) {
  var g = 0
  var d = 1
  var a = false
  var f = false
  for (var b = 0; b < e.length; ++b) {
    var h = e[b]
    if (h >= "0" && h <= "9") {
      if (a) {
        d *= 0.1
        g += (h - "0") * d
      } else {
        g = g * 10 + (h - "0")
      }
    } else {
      if (h === ".") {
        a = true
      } else {
        if (h === "-") {
          f = true
        }
      }
    }
  }
  if (f) {
    g = -g
  }
  return transformByDPR(g, width, ratio)
}
