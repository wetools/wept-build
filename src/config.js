import merge from 'merge'
import Parallel from 'node-parallel'
import path from 'path'
import {readFile, logError} from './util'

let default_config = {
  "debug": false,
  "appname": "debug",
  "window":{
    "backgroundTextStyle":"light",
    "navigationBarBackgroundColor": "#fff",
    "navigationBarTitleText": "WeChat",
    "navigationBarTextStyle":"black"
  },
  "projectConfig": {
    "Network": {
      "RequestDomain": [],
      "WsRequestDomain": [],
      "UploadDomain": [],
      "DownloadDomain": []
    },
    "Setting": {
      "MaxLocalstorageSize": 10,
      "MaxCodeSize": 5,
      "MaxWebviewDepth": 5,
      "MaxBackgroundLifespan": 300,
      "MaxRequestConcurrent": 5,
      "MaxUploadConcurrent": 1,
      "MaxDownloadConcurrent": 5
    }
  },
  "appserviceConfig": {
    "AppserviceMaxDataSize": 1048576,
    "HTTPSetting": {
      "HTTPHeaderMode": "BlackList",
      "HeaderBlackList": [
        "User-Agent"
      ],
      "HeaderWhiteList": [],
      "UploadMaxTimeoutMS": 60000,
      "DownloadMaxTimeoutMS": 60000,
      "WebsocketMaxTimeoutMS": 60000,
      "RequestMaxTimeoutMS": 60000,
      "HTTPHeaderReferer": "servicewechat.com"
    },
    "CDNBaseURL": "https://res.wx.qq.com/weapp",
    "AppMaxRunningCount": 5
  },
  "apphash": 70475629,
  "userInfo": {
    "headUrl": "https://s-media-cache-ak0.pinimg.com/136x136/7f/f7/b9/7ff7b921190bc4c05a1f3c11ff2ce086.jpg",
    "city": "Chaoyang",
    "gender": 1,
    "nickName": "测试帐号",
    "province" : "Beijing"
  }
}

export default function (root) {
  root = root || process.cwd()

  return new Promise(function (resolve, reject) {
    let p = new Parallel()
    p.add(done => {
      readFile('./app.json', root).then(content => {
        try {
          let config = JSON.parse(content)
          if (!config.pages || !config.pages.length) return done(new Error('No pages found'))
          config.root = config.root || config.pages[0]
          done(null, config)
        } catch(e) {
          return done(new Error(`Parse error of ${path.resolve(root, './app.json')}`))
        }
      }, done)
    })
    p.add(done => {
      readFile('./wept.json', root).then(content => {
        try {
          let config = JSON.parse(content)
          done(null, config)
        } catch(e) {
          return done(new Error(`Parse error of ${path.resolve(root, './wept.json')}`))
        }
      }, err => {
        if (/not\sfound/.test(err.message)) return done()
        done(err)
      })
    })
    p.done((err,results) => {
      if (err) return reject(err)
      let appConfig = results[0]
      let weptConfig = results[1]
      let config = merge.recursive(true, default_config, appConfig)
      config.directory = root
      config.babel = true
      config['window'] = config['window'] || {}
      config = merge.recursive(true, config, weptConfig)
      config.appid = config.appid || 'touristappid'
      config.projectConfig.appid = config.appid
      config.isTourist = config.appid == 'touristappid'
      loadJsonFiles(config.pages, root).then(obj => {
        config['window'].pages = obj
        resolve(config)
      }, reject)
    })
  })
}

function loadJsonFiles(pages, root) {
  let p = new Parallel()
  let res = {}
  return new Promise((resolve, reject) => {
    for (let page of pages) {
      p.add(cb => {
        let p = `${page}.json`
        readFile(p, root).then(content => {
          try {
            res[page] = JSON.parse(content)
          } catch (e) {
            logError(`${path.resolve(root, p)} JSON 解析失败，请检查`)
          }
          return cb()
        }, () => {
          // ignore not exist or couldn't open error
          cb()
        })
      })
    }
    p.done(err => {
      if (err) return reject(err)
      resolve(res)
    })
  })
}
