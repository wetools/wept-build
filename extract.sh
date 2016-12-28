#!/usr/local/bin/bash

# extract style from WAWebview.js for testing

cp ~/Library/Application\ Support/微信web开发者工具/WeappVendor/WAWebview.js .
js-beautify -r -s 2 -p -f WAWebview.js
cat WAWebview.js | grep 'webkit-user-select' | sed 's:^\s\+}(\x27::' | sed 's:\x27),\?\s*$::' | sed 's:\\n:\n:g' | sed 's:\\\x27:\x27:g' > style.css
cssfmt style.css
rm WAWebview.js
