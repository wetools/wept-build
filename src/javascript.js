import convert from 'convert-source-map'
import Concat from 'concat-with-sourcemaps'
import chalk from 'chalk'
import glob from 'glob'
import {
  normalizePath,
  parseJavascript
} from './util'

export default function (config, root, option) {
  option = option || {}
  let ignore = option.ignore || /node_modules/
  return new Promise((resolve, reject) => {
    glob('**/*.js', {
      cwd: root,
      ignore: 'node_modules/**/*.js'
    }, function(err, files) {
      files = files.filter(f => {
        return !ignore.test(f)
      })
      files = files.map(f => normalizePath(f))
      let pages = config.pages
      let [utils, routes] = groupFiles(files, config)
      let paths = utils.concat('app.js', routes)
      Promise.all(paths.map(path => parseJavascript(config, path, root)))
        .then(function (arr) {
          let obj = paths.map((path, i) => {
            return {path, code: arr[i].code, map: arr[i].map}
          })
          resolve(concatFiles(obj, pages))
        }, reject)
    })
  })
}

function groupFiles(files, config) {
  let pages = config.pages.map(page => {
    return page + '.js'
  })
  let utils = []
  let routes = []
  files.forEach(function(file) {
    if (pages.indexOf(file) == -1 && file !== 'app.js') {
      utils.push(file)
    }
  })
  pages.forEach(function(page) {
    if (files.indexOf(page) == -1) {
      console.log(chalk.red(` ✗ ${page} not found`))
    } else {
      routes.push(page)
    }
  })
  return [utils, routes]
}

function concatFiles(obj, pages) {
  let concat = new Concat(true, 'service.js', '\n')
  for (let item of obj) {

    let path = item.path
    let route = path.replace(/\.js$/, '')
    let isPage = pages.indexOf(route) !== -1
    if (!isPage) {
      concat.add(item.path, item.code, item.map)
    } else {
      concat.add(null, `var __wxRoute = "${route}", __wxRouteBegin = true;`)
      concat.add(item.path, item.code, item.map)
    }
  }
  //console.log(chalk.green(' ✓ service.js build success'))
  return concat.content + "\n" + convert.fromJSON(concat.sourceMap).toComment()
}
