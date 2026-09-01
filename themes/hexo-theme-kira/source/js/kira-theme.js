(function () {
	const STORE_KEY = 'kira-theme';
	const DARK = 'dark';
	const LIGHT = 'light';

	// localStorage 在隐私模式下可能直接抛异常，读写都要兜底
	const read = function () {
		try {
			const raw = localStorage.getItem(STORE_KEY);
			return raw === DARK || raw === LIGHT ? raw : null;
		} catch (e) {
			return null;
		}
	};

	const save = function (mode) {
		try {
			localStorage.setItem(STORE_KEY, mode);
		} catch (e) {
			/* 存不了就只在本次会话生效 */
		}
	};

	const query = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

	const systemMode = function () {
		return query && query.matches ? DARK : LIGHT;
	};

	const backgroundConfig = function () {
		if (window.__kiraBackground) return window.__kiraBackground;
		const root = document.querySelector('.kira-background');
		return root
			? {
					day: root.getAttribute('data-bg-day') || '',
					night: root.getAttribute('data-bg-night') || '',
					dayMobile: root.getAttribute('data-bg-day-mobile') || root.getAttribute('data-bg-day') || '',
					nightMobile: root.getAttribute('data-bg-night-mobile') || root.getAttribute('data-bg-night') || '',
			  }
			: {};
	};

	const mobileViewport = function () {
		return window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
	};

	let backgroundLoadToken = 0;
	let lastMobileViewport = mobileViewport();

	// 背景图由独立的 img 承载，先显示主题色占位，图片加载完成后再淡入。
	// preload 与这里使用同一 URL，浏览器可复用已开始的请求。
	const loadBackground = function (mode) {
		const root = document.querySelector('.kira-background');
		const image = root && root.querySelector('.kira-background-image');
		if (!root || !image) return;

		const config = backgroundConfig();
		const isMobile = mobileViewport();
		const desktop = mode === DARK ? config.night : config.day;
		const mobile = mode === DARK ? (config.nightMobile || desktop) : (config.dayMobile || desktop);
		const selected = isMobile ? mobile : desktop;
		if (!selected) return;

		if (image.dataset.kiraLoadedUrl === selected) {
			image.classList.add('is-loaded');
			return;
		}

		const token = ++backgroundLoadToken;
		image.classList.remove('is-loaded');
		image.removeAttribute('srcset');
		image.removeAttribute('sizes');
		if (isMobile && mobile && mobile !== desktop) {
			image.setAttribute('srcset', `${mobile} 768w, ${desktop} 1672w`);
			image.setAttribute('sizes', '100vw');
		}

		image.onload = function () {
			if (token !== backgroundLoadToken) return;
			image.dataset.kiraLoadedUrl = selected;
			image.classList.add('is-loaded');
		};
		image.onerror = function () {
			if (token === backgroundLoadToken) image.classList.remove('is-loaded');
		};
		image.src = selected;
		if (image.complete && image.naturalWidth > 0) image.onload();
	};

	// 文章头图走 lazysizes：未揭示时它只读一次 data-src，揭示后改 data-src 不再有效，
	// 必须直接改 src。两种状态都要处理，所以先把日间地址存进 data-src-day，
	// 否则第二次切换会把已被覆盖的 data-src 误当成日间地址
	const applyCovers = function (mode) {
		const covers = document.querySelectorAll('img[data-src-dark]');
		for (let i = 0; i < covers.length; i++) {
			const img = covers[i];
			let day = img.getAttribute('data-src-day');
			if (!day) {
				day = img.getAttribute('data-src') || img.getAttribute('src') || '';
				img.setAttribute('data-src-day', day);
			}
			const next = mode === DARK ? img.getAttribute('data-src-dark') : day;
			if (!next) continue;
			img.setAttribute('data-src', next); // 未揭示：交给 lazysizes 去取
			if (img.getAttribute('src')) img.src = next; // 已揭示：data-src 不再被读，直接改 src
		}
	};

	const apply = function (mode) {
		document.documentElement.dataset.theme = mode;
		const toggles = document.querySelectorAll('.kira-theme-toggle');
		toggles.forEach((toggle) => {
			toggle.setAttribute('aria-pressed', String(mode === DARK));
		});
		applyCovers(mode);
		loadBackground(mode);
	};

	// layout.ejs 里的内联脚本已经定下首屏模式，这里只需与之对齐
	let mode = read() || systemMode();

	// 用户手动点过之后就不再跟随系统。read() 每次重查而不缓存，
	// 这样其它标签页里的选择也能被尊重
	if (query && query.addEventListener) {
		query.addEventListener('change', () => {
			if (read()) return;
			mode = systemMode();
			apply(mode);
		});
	}

	window.addEventListener('resize', () => {
		const nextMobileViewport = mobileViewport();
		if (nextMobileViewport === lastMobileViewport) return;
		lastMobileViewport = nextMobileViewport;
		loadBackground(mode);
	});

	window.addEventListener('DOMContentLoaded', () => {
		apply(mode);

		const handleToggle = () => {
			mode = mode === DARK ? LIGHT : DARK;
			save(mode);
			apply(mode);
		};

		const toggles = document.querySelectorAll('.kira-theme-toggle');
		toggles.forEach((toggle) => {
			toggle.addEventListener('click', handleToggle);
		});
	});
})();
