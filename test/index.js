import path from 'path'
import test from 'ava'
import config from '../dest/config'
import javascript from '../dest/javascript'
import wxml from '../dest/wxml'
import wxss from '../dest/wxss'
import Builder from '..'

const root = path.resolve(__dirname, './demo')

function getCache() {
  let obj = {}
  return {
    get: function (key) {
      return obj[key]
    },
    set: function (key, val) {
      obj[key] = val
    },
    del: function (key) {
      delete obj[key]
    }
  }
}

test('Parse config should works', async t => {
  const obj = await config(root)
  t.is(obj.directory, root)
  t.is(obj.babel, false)
  t.true(Object.keys(obj['window'].pages).length > 1)
})

test('Parse wxml should works', async t => {
  const res = await wxml('page/component/index.wxml', root)
  t.true(/这里就当前已支持的组件进行演示/.test(res))
})

test('Parse wxml should works with import', async t => {
  const res = await wxml('page/API/web-socket/web-socket.wxml', root)
  t.true(res.indexOf("../common/footer.wxml") !== -1)
})

test('Parse wxml should works with nested import', async t => {
  const res = await wxml('page/API/file/file.wxml', root)
  t.true(res.indexOf("../common/footer.wxml") !== -1)
  t.true(res.indexOf("included file") !== -1)
})

test('Parse wxml should throw if file not found', async t => {
  t.plan(1)
  try {
    await wxml('page/API/file/file', root)
  } catch(e) {
    t.true(/not\sfound/.test(e.message))
  }
})

test('Parse wxss should works with rpx', async t => {
  const fn = await wxss('styles/color.wxss', root)
  t.true(typeof fn == 'function')
  const str = fn(320, 2)
  t.true(str.indexOf('width: 320px;') !== -1)
  t.true(str.indexOf('sourceMappingURL') !== -1)
})

test('Parse wxss should works with nested import', async t => {
  const fn = await wxss('app.wxss', root)
  t.true(typeof fn == 'function')
  const str = fn(320, 2)
  t.true(str.indexOf('width: 320px;') !== -1)
})

test('Parse javascript files should works', async t => {
  const obj = await config(root)
  const content = await javascript(obj, root)
  t.true(typeof content == 'string')
})

test('Builder config should works with cache', async t => {
  const cache = getCache()
  let called = 0
  const builder = new Builder({cache, root})
  builder.on('build', () => {
    called = called + 1
  })
  await builder.buildConfig()
  await builder.buildConfig()
  let res = await builder.buildConfig()
  t.is(called, 1)
  t.is(res.directory, root)
})

test('Builder wxml should works with cache', async t => {
  const cache = getCache()
  let called = 0
  const builder = new Builder({cache, root})
  builder.on('build', () => {
    called = called + 1
  })
  await builder.buildWxml('page/component/index.wxml')
  await builder.buildWxml('page/API/file/file.wxml')
  await builder.buildWxml('page/component/index.wxml')
  await builder.buildWxml('page/component/index.wxml')
  t.is(called, 2)
})

test('Builder wxml should throw if not found', async t => {
  const cache = getCache()
  let called = 0
  const builder = new Builder({cache, root})
  try {
    await builder.buildWxml(root)
  } catch(e) {
    called = 1
  }
  t.is(called, 1)
})

test('Builder wxss should works with cache', async t => {
  const cache = getCache()
  let called = 0
  const builder = new Builder({cache, root})
  builder.on('build', () => {
    called = called + 1
  })
  await builder.buildWxss('app.wxss')
  await builder.buildWxss('styles/color.wxss')
  await builder.buildWxss('styles/base.wxss')
  await builder.buildWxss('app.wxss')
  await builder.buildWxss('app.wxss')
  await builder.buildWxss('styles/color.wxss')
  await builder.buildWxss('styles/base.wxss')
  t.is(called, 3)
})

test('Builder wxss should not throw if file not found', async t => {
  const cache = getCache()
  let called = 0
  const builder = new Builder({cache, root})
  builder.on('build', () => {
    called = called + 1
  })
  let res = await builder.buildWxss('notexist.wxss')
  t.is(called, 0)
  t.is(res(), '')
})

test('Builder javascript should works with cache', async t => {
  const cache = getCache()
  let called = 0
  const builder = new Builder({cache, root})
  builder.on('build', o => {
    if (o.type == 'js') called = called + 1
  })
  let res = await builder.buildJavascript()
  await builder.buildJavascript()
  await builder.buildJavascript()
  t.is(called, 1)
  t.truthy(cache.get(path.resolve(root, 'service.js')))
  t.truthy(res)
})

test('Builder rebuild should works with json', async t => {
  const cache = getCache()
  let called = 0
  const builder = new Builder({cache, root})
  builder.on('build', o => {
    if (o.type == 'json') called = called + 1
  })
  await builder.buildConfig()
  await builder.rebuild('app.json')
  t.is(called, 2)
})

test('Builder rebuild should works with javascript', async t => {
  const cache = getCache()
  let called = 0
  const builder = new Builder({cache, root})
  builder.on('build', o => {
    if (o.type == 'js') called = called + 1
  })
  await builder.buildJavascript()
  await builder.rebuild('util.js')
  t.is(called, 2)
})

test('Builder rebuild should works with wxml', async t => {
  const cache = getCache()
  let called = 0
  const builder = new Builder({cache, root})
  builder.on('build', o => {
    if (o.type == 'wxml') called = called + 1
  })
  await builder.buildWxml('page/component/index.wxml')
  await builder.rebuild('page/component/index.wxml')
  t.is(called, 2)
})

test('Builder rebuild should works with wxss', async t => {
  const cache = getCache()
  let called = 0
  const builder = new Builder({cache, root})
  builder.on('build', o => {
    if (o.type == 'wxss') called = called + 1
  })
  await builder.buildWxss('app.wxss')
  await builder.buildWxss('page/API/file/file.wxss')
  await builder.rebuild('app.wxss')
  await builder.rebuild('page/API/file/file.wxss')
  t.is(called, 4)
})

test('Builder rebuild should rebuild all wxml for none page', async t => {
  const cache = getCache()
  let called = 0
  const builder = new Builder({cache, root})
  builder.on('build', o => {
    if (o.type == 'wxml') called = called + 1
  })
  await builder.buildWxml('page/API/common/footer.wxml')
  await builder.rebuild('page/API/common/footer.wxml')
  t.true(called > 50)
})

test('Builder rebuild should rebuild all wxss for none page', async t => {
  const cache = getCache()
  let called = 0
  const builder = new Builder({cache, root})
  builder.on('build', o => {
    if (o.type == 'wxss') called = called + 1
  })
  await builder.buildWxss('styles.wxss')
  await builder.rebuild('styles.wxss')
  t.true(called > 40)
})

test('Builder buildAll should build all files', async t => {
  const cache = getCache()
  const builder = new Builder({cache, root})
  await builder.buildAll()
  t.truthy(cache.get(path.resolve(root, 'app.wxss')))
  t.truthy(cache.get(path.resolve(root, 'app.json')))
  t.truthy(cache.get(path.resolve(root, 'service.js')))
  t.truthy(cache.get(path.resolve(root, 'page/API/index/index.wxml')))
})
