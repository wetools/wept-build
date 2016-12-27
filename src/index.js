/**
 * @author Qiming Zhao <chemzqm@gmail.com>
 */
import path from 'path'
import * as builder from './builder'
import fs from 'fs'
import EventEmitter from 'events'

export default class Builder extends EventEmitter {

  /**
  * Config for builder
  *
  * @constructor
  * @param {Object} [cache] - optional cache providor
  * @param {String} [root] - optional root
  */
  constructor({cache, root}) {
    super()
    this.cache = cache
    this.root =path.resolve(process.cwd(), root) || process.cwd()
  }

  getCached(p) {
    if (!this.cache) return null
    return this.cache.get(p)
  }

  /**
  * Build json files inside root
  *
  * @public
  * @returns {Promise}
  */
  buildConfig() {
    const {root, cache} = this
    const p = path.resolve(root, 'app.json')
    let cached = this.getCached(p)
    if (cached) return Promise.resolve(cached)
    return builder.buildConfig(root).then(res => {
      if (cache) cache.set(p, res)
      this.emit('build', {type: 'json', path: p})
      return res
    })
  }

  /**
  * Build a wxml file
  *
  * @public
  * @param {String} p - relative wxml file path
  * @returns {Promise}
  */
  buildWxml(p) {
    const {root, cache} = this
    p = path.resolve(root, p)
    p = /\.wxml$/.test(p) ? p : `${p}.wxml`
    let cached = this.getCached(p)
    if (cached) return Promise.resolve(cached)
    return builder.buildWxml(p, root).then(res => {
      if (cache) cache.set(p, res)
      this.emit('build', {type: 'wxml', path: p})
      return res
    })
  }

  /**
   * Build a wxss file
   *
   * @public
   * @param {String} p - relative wxss file path
   * @returns {Promise}
   */
  buildWxss(p) {
    const {root, cache} = this
    p = path.resolve(root, p)
    p = /\.wxss$/.test(p) ? p : `${p}.wxss`
    let cached = this.getCached(p)
    if (cached) return Promise.resolve(cached)
    return new Promise((resolve, reject) => {
      fs.stat(p, (err, stat) => {
        if (err || !stat || !stat.isFile()) return resolve(() => '')
        builder.buildWxss(p, root).then(res => {
          if (cache) cache.set(p, res)
          this.emit('build', {type: 'wxss', path: p})
          resolve(res)
        }, reject)
      })
    })
  }
  /**
  * Build all javascript files
  *
  * @public
  * @param {Object} [option] - optional option, could have `ignore`
  * @returns {Promise}
  */
  buildJavascript(option) {
    const {root, cache} = this
    const p = path.resolve(root, 'service.js')
    let cached = this.getCached(p)
    if (cached) return Promise.resolve(cached)
    return this.buildConfig().then(config => {
      return builder.buildJavascript(config, root, option).then(res => {
        if (cache) cache.set(p, res)
        this.emit('build', {type: 'js', path: p})
        return res
      })
    })
  }

  /**
  * Rebuild a specified file to refresh cache
  *
  * @public
  * @param {String} file - relative path of file
  * @param {Object} [option] - optional option for javascript build
  * @returns {Promise}
  */
  rebuild(file, option) {
    const {root, cache} = this
    if (!cache) return Promise.resolve()
    let isJson = /\.json$/.test(file)
    let isJs  = /\.js/.test(file)
    let f = isJson ? path.resolve(root, 'app.json') :
      isJs ? path.resolve(root, 'service.js') :
      path.resolve(root, file)

    // full path in cache
    cache.del(f)
    // only one cache for all json config
    if (isJson) return this.buildConfig()
    if (isJs) return this.buildJavascript(option)
    if (!/\.(wxml|wxss$)/.test(file)) {
      return Promise.reject(`Unknown file type for ${file}`)
    }
    let part = path.relative(root, f)
    if (part == 'app.wxss') return this.buildWxss(part)
    return this.buildConfig().then(config => {
      let pages = config.pages
      let p = file.replace(/\.\w+$/, '')
      let isWxml = /\.wxml/.test(file)
      if (pages.indexOf(p) === -1) {
        // clean cache of wxml/wxss
        for (let page of pages) {
          cache.del(`${path.resolve(root, page)}.${isWxml ? 'wxml' : 'wxss'}`)
        }
        return this.buildAll(option)
      }
      if (isWxml) return this.buildWxml(f)
      return this.buildWxss(f)
    })
  }

  /**
  * Build all files of project inside root, no cache clear
  *
  * @public
  * @param {Object} [option] - optional option
  * @returns {Promise}
  */
  buildAll(option) {
    // json config
    return this.buildConfig().then(config => {
      let pages = config.pages || []
      let arr = []
      arr.push(this.buildWxss('app.wxss'))
      pages.forEach(page => {
        // add wxml & wxss
        arr.push(this.buildWxml(page))
        arr.push(this.buildWxss(page))
      })
      // javascript
      arr.push(this.buildJavascript(option))
      return Promise.all(arr)
    })
  }
}
