# wept-build

[![Build Status](https://img.shields.io/travis/wetools/wept-build/master.svg?style=flat-square)](http://travis-ci.org/wetools/wept-build)
[![NPM version](https://img.shields.io/npm/v/wept-build.svg?style=flat-square)](https://www.npmjs.com/package/wept-build)

提够构建 WEPT 使用小程序代码的 API，支持 cache 以及根据变化文件自动进行重编译。

## API

### new Builder(option)

* `option` 为 builder 设置:
* `option.cache` 为 cache 对象，需提供 get, del, set 方法，默认为 null
* `option.root` 为程序根路径，默认为 `process.cwd()`

    ```
    new builder({
      root: './demo',
      cache: {
        get: function(key) {
          return myCache.get(key)
        },
        del, function(key) {
          return myCache.del(key)
        }
        set: function(key, value) {
          myCache.set(key, value)
        }
      }
    })
    ```

### .buildConfig()

返回所有配置信息合并后对象

* 返回为 Promise，回调携带 `app.json` `wept.json` 合并的 config 对象或者错误
* 返回 config 对象同时携带了所有 page.json 文件内的信息

### .buildWxml(path)
### .buildWxss(path)

编译对应页面的 wxml 和 wxss 文件

* `path` 为文件相对 root 的路径或绝对路径，可以携带或者不带文件后缀名
* 返回为 Promise，编译错误或者文件不存在返回错误
  * 对于 wxml 返回的是用于插入 html 的 JavaScript 代码字符串
  * 对于 wxss 返回的是用于通过 `deviceWidth` 和 `devicePixelRatio` 生成 css 的函数

### .buildJavascript([option])

* `option.ignore` 可指定为忽略文件路径的正则，默认为 `/node_modules/`

### .rebuild(file, option)

更新编译指定 `root` 下指定文件， 仅在使用缓存时有效

* `file` 为文件对 root 的相对路径或绝对路径
* `option` 为 buildJavascript 使用的 option
* 返回 Promise

### .buildAll()

编译 root 目录下所有小程序文件，返回 promise 或者错误，用于提前编译 & 发现错误

### Builder.getViewScript([option])
### Builder.getServiceScript([option])

获取 view 层和 service 层小程序底层代码，返回 content 和 verion，例如：

``` js
{
  content: '...' // script content
  version: '2016122200'
}
```

* `option.sourceMap` 启用后开启 source map 支持。

## LICENSE

Copyright 2016 chemzqm@gmail.com

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
