(function () {
	const STORE_KEY = 'kira-appearance';
	const DEFAULTS = { surface: 78, bg: 61 };
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
		const syncAllControls = function () {
			['surface', 'bg'].forEach((key) => {
				const val = state[key];
				const inputs = document.querySelectorAll(
					`input[data-target="${key}"], #kira-opacity-${key}, #kira-sidebar-opacity-${key}`
				);
				inputs.forEach((input) => {
					if (input.value !== String(val)) {
						input.value = val;
					}
				});
				const valDisplays = document.querySelectorAll(`.kira-opacity-val[data-val-for="${key}"]`);
				valDisplays.forEach((el) => {
					el.textContent = `${val}%`;
				});
			});
		};

		syncAllControls();

		// 监听所有透明度滑块
		['surface', 'bg'].forEach((key) => {
			const inputs = document.querySelectorAll(
				`input[data-target="${key}"], #kira-opacity-${key}, #kira-sidebar-opacity-${key}`
			);
			inputs.forEach((input) => {
				input.addEventListener('input', (ev) => {
					state[key] = Number(ev.target.value);
					apply(state);
					save(state);
					syncAllControls();
				});
			});
		});

		// 监听所有重置按钮
		const resetButtons = document.querySelectorAll('.kira-opacity-reset');
		resetButtons.forEach((btn) => {
			btn.addEventListener('click', () => {
				Object.assign(state, DEFAULTS);
				apply(state);
				save(state);
				syncAllControls();
			});
		});

		// 桌面端右侧悬浮面板交互
		const wrap = document.querySelector('#kira-opacity');
		if (wrap) {
			const panel = wrap.querySelector('#kira-opacity-panel');
			const toggle = wrap.querySelector('#kira-opacity-toggle');

			if (panel && toggle) {
				const setOpen = function (open) {
					panel.hidden = !open;
					toggle.setAttribute('aria-expanded', String(open));
				};

				toggle.addEventListener('click', () => {
					setOpen(panel.hidden);
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
			}
		}
	});
})();
