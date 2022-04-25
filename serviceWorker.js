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
//var month = () => {
//	return new self.Date().getMonth();
//};

const month = new Date().getMonth();

self.addEventListener('install', event => {
	self.skipWaiting();
	// 缓存cdn
	event.waitUntil(
		caches.open('cdn').then(cache => {
			return cache.addAll(cdnCache);
		}).then(() => {
			// 缓存index的重定向
			caches.open(CACHE_NAME).then(cache => {
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
			Promise.all(
				keys.map(key => {
					//if (CACHE_NAME === key) {
					//	return caches.delete(key);
					//}
				})
			);
		}).then(() => {
			// 装新的sw
			return self.clients.claim();
		})
	);
});

self.addEventListener('fetch', function(event) {
	let requestUrl = event.request;
	let newRequest = new URL(requestUrl.url);
	//let indexDate = requestUrl.url.indexOf('?v=');
	let indexDate = requestUrl.url.indexOf('?file=');
	// 过滤自带版本号的
	//if (indexDate != -1) {
	//	newRequest.protocol = self.location.protocol;
	//	newRequest.search = '';
	//	requestUrl = new Request(newRequest.href);
	//}
	let serverJson = requestUrl.url.indexOf('server.json');
	let buildJson = requestUrl.url.indexOf('build.version.json');

	// 过滤 已知其他跨域的
	let skipWorker = CACHE_LIST.indexOf(new URL(requestUrl.url).host);
	if (skipWorker > -1 && serverJson == -1 && buildJson == -1) {
		event.respondWith(
			caches.match(requestUrl, {
				ignoreSearch: true,
			}).then(function(response, reject) {
				// 如果缓存有就返回缓存
				// 每月一次更新
				let a = true;
				if (response) {
					if (newRequest.search) {
						let cacheUrl = new URL(response.url).search;
						let data = newRequest.search;
						if (cacheUrl != data) {
							a = false;
						}
					}
					if (a) {
						return response;
					}
				}
				return fetch(requestUrl).then(
					function(response) {
						//let indexDate = requestUrl.url.indexOf('fonts.googleapis.com/css?family');
						if (!response || response.status !== 200 || response.type !== 'basic') {
							return response;
						}
						// 网络获得成功，再缓存
						var responseToCache = response.clone();
						caches.open(CACHE_NAME).then(function(cache) {
							if (!a) {
								cache.delete(requestUrl, {
									ignoreSearch: true,
								}).then(() => {
									cache.put(requestUrl, responseToCache);
								});
							} else {
								cache.put(requestUrl, responseToCache);
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
