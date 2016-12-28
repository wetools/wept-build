diff:
	@colordiff -r static .offcial

update:
	@cp ~/Library/Application\ Support/微信web开发者工具/WeappVendor/* ./.offcial
	@cp /Applications/wechatwebdevtools.app/Contents/Resources/app.nw/app/dist/inject/jweixindebug.js ./.offcial
	@cp /Applications/wechatwebdevtools.app/Contents/Resources/app.nw/app/dist/weapp/appservice/asdebug.js ./.offcial
	@find ./.offcial/ -type f -name '*.js' -exec js-beautify -r -s 2 -p -f '{}' \;

.PHONY: update diff
