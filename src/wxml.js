import path from 'path'
import {
  wcc,
  isLinux,
  logError,
  parseWxmlImports,
  normalizeFiles} from './util'
import {execFile, exec} from 'child_process'

const wxml_args = ['-d']

export default function (p, root, opts = {}) {
  root = root || process.cwd()
  p = path.resolve(root, p)
  let args = opts.args || wxml_args
  return new Promise((resolve, reject) => {
    let srcs = []
    parseWxmlImports(srcs, p, root, err => {
      if (err) return reject(err)
      srcs = normalizeFiles(srcs, root)

      let execWcc = execFile.bind(null, wcc, args.concat(srcs))
      if (isLinux) {
        execWcc = exec.bind(null, [wcc].concat(args).concat(srcs).join(' '))
      }
      execWcc( {maxBuffer: 1024 * 600, cwd: root}, (err, stdout, stderr) => {
        if (stderr) logError(stderr)
        if (err) {
          console.error(err.stack)
          return reject(new Error(`${p} 编译失败，请检查`))
        }
        resolve(stdout)
      })
    })
  })
}
