(function () {
	'use strict';

	const musicScripts = [
		'/deps/js/APlayer.min.js',
		'/deps/js/Meting.min.js',
	];
	let musicPromise = null;

	const addStylesheet = function () {
		if (document.querySelector('link[data-kira-deferred-aplayer]')) return;
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = '/deps/css/APlayer.min.css';
		link.setAttribute('data-kira-deferred-aplayer', '');
		document.head.appendChild(link);
	};

	const addScript = function (src) {
		return new Promise((resolve, reject) => {
			const existing = document.querySelector(`script[data-kira-deferred-src="${src}"]`);
			if (existing) {
				existing.addEventListener('load', resolve, { once: true });
				existing.addEventListener('error', reject, { once: true });
				return;
			}

			const script = document.createElement('script');
			script.src = src;
			script.async = false;
			script.setAttribute('data-kira-deferred-src', src);
			script.onload = resolve;
			script.onerror = reject;
			document.head.appendChild(script);
		});
	};

	const loadMusic = function () {
		if (!document.querySelector('meting-js')) return Promise.resolve();
		if (musicPromise) return musicPromise;

		addStylesheet();
		musicPromise = addScript(musicScripts[0]).then(() => addScript(musicScripts[1]));
		musicPromise.catch(() => {
			// 外部音乐接口失败不应影响首页其它内容。
			musicPromise = null;
		});
		return musicPromise;
	};

	const schedule = function () {
		if (!document.querySelector('meting-js')) return;
		if (window.requestIdleCallback) {
			window.requestIdleCallback(loadMusic, { timeout: 2500 });
		} else {
			window.setTimeout(loadMusic, 1500);
		}
	};

	['pointerdown', 'touchstart', 'keydown'].forEach((eventName) => {
		window.addEventListener(eventName, loadMusic, { once: true, capture: true, passive: true });
	});

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', schedule, { once: true });
	} else {
		schedule();
	}
})();
