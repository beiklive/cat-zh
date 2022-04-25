const CACHE_NAME = 'likexiaCat';
const locationUrl = location.origin + location.pathname.replace('serviceWorker.js', '');

const cdnCache = [
	"https://lf3-cdn-tos.bytecdntp.com/cdn/expire-1-y/lz-string/1.4.1/lz-string.js",
	"https://lf3-cdn-tos.bytecdntp.com/cdn/expire-1-y/jquery/3.6.0/jquery.min.js",
	"https://lf3-cdn-tos.bytecdntp.com/cdn/expire-1-y/react/0.14.10/react.min.js",
	"https://lf3-cdn-tos.bytecdntp.com/cdn/expire-1-y/dojo/1.6.0/dojo.xd.js",
	"https://lf3-cdn-tos.bytecdntp.com/cdn/expire-1-y/systemjs/0.21.6/system.js",
];

const urlsToCache = [
	locationUrl,
	locationUrl + 'index.html',
];

//const NO_CACHE_LIST = [
//	'fonts.googleapis.com',
//	'fonts.gstatic.com',
//	'hm.baidu.com',
//	'kittensgame.com',
//	'q2.qlogo.cn',
//];

// 白名单
const CACHE_LIST = [
	'lf3-cdn-tos.bytecdntp.com',
	location.host,
	//'petercheney.gitee.io',
];

const NO_CACHE_LIST = [
	'server.json',
	'build.version.json',
];

const month = new Date().getMonth();

self.addEventListener('install', event => {
	self.skipWaiting();
	// 缓存cdn
	event.waitUntil(
		caches.open('cdn').then(cache => {
			return cache.addAll(cdnCache);
		}).then(() => {
			// 缓存index的重定向
			return caches.open(CACHE_NAME).then(cache => {
				return cache.addAll(urlsToCache);
			}).then(() => {
				// 安装新的
				return self.skipWaiting();
			});
		})
	);
});

self.addEventListener("activate", event => {
	event.waitUntil(
		caches.keys().then(keys => {
			// 删除旧缓存
			//Promise.all(
			//	keys.map(key => {
			//		//if (CACHE_NAME === key) {
			//		//	return caches.delete(key);
			//		//}
			//	})
			//);
			return caches.open(CACHE_NAME).then(function(cache) {
				return cache.delete(locationUrl);
			});
		}).then(() => {
			// 缓存index的重定向
			return caches.open(CACHE_NAME).then(cache => {
				return cache.addAll(urlsToCache);
			}).then(() => {
				// 装新的sw
				return self.clients.claim();
			});
		})
	);
});

self.addEventListener('fetch', function(event) {
	let eventRequest = event.request;
	let newRequest = new URL(eventRequest.url);
	// 过滤版本号文件
	let serverJson = eventRequest.url.indexOf('server.json');
	let buildJson = eventRequest.url.indexOf('build.version.json');
	// 过滤 已知其他跨域的
	let skipWorker = CACHE_LIST.indexOf(new URL(eventRequest.url).host);
	if (skipWorker > -1 && serverJson == -1) {
		// 无视url参数
		event.respondWith(
			caches.match(eventRequest, {
				ignoreSearch: true,
			}).then(function(response, reject) {
				let skipDelete = true;
				if (response) {
					if (newRequest.search) {
						// 版本号不同 就不返回结果并去网络请求删除旧缓存
						let cacheUrl = new URL(response.url).search;
						let data = newRequest.search;
						if (cacheUrl != data && cacheUrl.indexOf('=0') == -1 && buildJson == -1) {
							skipDelete = false;
						}
					}
					if (skipDelete) {
						return response;
					}
				}
				return fetch(eventRequest).then(
					function(response) {
						//let indexDate = eventRequest.url.indexOf('fonts.googleapis.com/css?family');
						if (!response || response.status !== 200 || response.type !== 'basic') {
							return response;
						}
						// 网络获得成功，再缓存
						var responseToCache = response.clone();
						caches.open(CACHE_NAME).then(function(cache) {
							if (!skipDelete) {
								cache.delete(eventRequest, {
									ignoreSearch: true,
								}).then(() => {
									return cache.put(eventRequest, responseToCache);
								});
							} else {
								cache.put(eventRequest, responseToCache);
							}
						});
						return response;
					}
				);
			})
		);
	}
});

self.addEventListener('error', event => {
	console.log(event);
});
