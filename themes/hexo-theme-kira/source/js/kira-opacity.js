(function () {
	const STORE_KEY = 'kira-appearance';
	const DEFAULTS = { surface: 78, bg: 45 };
	const VARS = {
		surface: '--kira-surface-alpha',
		bg: '--kira-bg-opacity',
	};

	// localStorage 在隐私模式下可能直接抛异常，读写都要兜底
	const read = function () {
		try {
			const raw = localStorage.getItem(STORE_KEY);
			if (!raw) return Object.assign({}, DEFAULTS);
			const saved = JSON.parse(raw);
			return {
				surface: clamp(saved.surface, 40, 100, DEFAULTS.surface),
				bg: clamp(saved.bg, 0, 100, DEFAULTS.bg),
			};
		} catch (e) {
			return Object.assign({}, DEFAULTS);
		}
	};

	const save = function (state) {
		try {
			localStorage.setItem(STORE_KEY, JSON.stringify(state));
		} catch (e) {
			/* 存不了就只在本次会话生效 */
		}
	};

	function clamp(value, min, max, fallback) {
		const num = Number(value);
		if (!isFinite(num)) return fallback;
		return Math.min(max, Math.max(min, num));
	}

	const apply = function (state) {
		const root = document.documentElement;
		root.style.setProperty(VARS.surface, state.surface / 100);
		root.style.setProperty(VARS.bg, state.bg / 100);
	};

	const state = read();

	// 本脚本在 <head> 中同步执行，这里先落地变量以避免首屏闪烁
	apply(state);

	window.addEventListener('DOMContentLoaded', () => {
		const wrap = document.querySelector('#kira-opacity');
		if (!wrap) return;

		const panel = wrap.querySelector('#kira-opacity-panel');
		const toggle = wrap.querySelector('#kira-opacity-toggle');
		const reset = wrap.querySelector('#kira-opacity-reset');
		const sliders = {
			surface: wrap.querySelector('#kira-opacity-surface'),
			bg: wrap.querySelector('#kira-opacity-bg'),
		};

		const syncSliders = function () {
			Object.keys(sliders).forEach((key) => {
				sliders[key].value = state[key];
			});
		};

		const setOpen = function (open) {
			panel.hidden = !open;
			toggle.setAttribute('aria-expanded', String(open));
		};

		syncSliders();

		Object.keys(sliders).forEach((key) => {
			sliders[key].addEventListener('input', (ev) => {
				state[key] = Number(ev.target.value);
				apply(state);
				save(state);
			});
		});

		toggle.addEventListener('click', () => {
			setOpen(panel.hidden);
		});

		reset.addEventListener('click', () => {
			Object.assign(state, DEFAULTS);
			syncSliders();
			apply(state);
			save(state);
		});

		document.addEventListener('click', (ev) => {
			if (!panel.hidden && !wrap.contains(ev.target)) setOpen(false);
		});

		document.addEventListener('keydown', (ev) => {
			if (ev.key === 'Escape' && !panel.hidden) {
				setOpen(false);
				toggle.focus();
			}
		});
	});
})();
