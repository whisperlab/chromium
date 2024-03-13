.PHONY: clean

clean:
	rm -rf chromium.zip _/amazon/code/nodejs _/amazon/handlers/node_modules

pretest:
	unzip chromium.zip -d _/amazon/code
	npm install --prefix _/amazon/handlers puppeteer-core@latest --bin-links=false --fund=false --omit=optional --omit=dev --package-lock=false --save=false

test:
	sam local invoke --template _/amazon/template.yml --event _/amazon/events/example.com.json node20

%.zip:
	npm install --fund=false
	npm run build
	mkdir -p nodejs
	cp package-lock.json nodejs/package-lock.json
	npm install --prefix nodejs/ tar-fs@3.0.5 follow-redirects@1.15.5 --bin-links=false --fund=false --omit=optional --omit=dev --save=false
	rm nodejs/package-lock.json
	npm pack
	mkdir -p nodejs/node_modules/@sparticuz/chromium/
	tar --directory nodejs/node_modules/@sparticuz/chromium/ --extract --file sparticuz-chromium-*.tgz --strip-components=1
	npx clean-modules --directory nodejs "**/*.d.ts" "**/@types/**" "**/*.@(yaml|yml)" --yes
	rm sparticuz-chromium-*.tgz
	mkdir -p $(dir $@)
	zip -9 --filesync --move --recurse-paths $@ nodejs

.DEFAULT_GOAL := chromium.zip
