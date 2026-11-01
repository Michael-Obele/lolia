<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Spring } from 'svelte/motion';
	import Inspector from '#lib/components/inspector/Inspector.svelte';
	import type { Element } from '#lib/data/types.ts';
	import { motionOk } from '#lib/motion/reduced.ts';
	import { springs } from '#lib/motion/tokens.ts';
	import {
		armBackGuard,
		disarmBackGuard,
		registerSheetClose
	} from '#lib/platform/android.ts';

	let { element }: { element: Element } = $props();

	/** 30, 55, 88 percent of the viewport. The sheet opens on the middle one. */
	const SNAPS = [0.3, 0.55, 0.88];
	const OPEN = 1;

	/** Pixels per millisecond. Above it a release travels one point, not the nearest. */
	const FLICK = 0.5;

	/** The one breakpoint the whole app switches on. Above it, the side panel. */
	const wide = window.matchMedia('(min-width: 720px)');

	let desktop = $state(wide.matches);
	let viewport = $state(window.innerHeight);
	let snap = $state(OPEN);

	const min = $derived(viewport * SNAPS[0]);
	const max = $derived(viewport * SNAPS[SNAPS.length - 1]);

	// motion.md moment 7, with one deliberate choice: the follow uses the tightest
	// token preset (`pop`) rather than `drag`. The spring has to own the drag for
	// `preserveMomentum` to have a real velocity to carry, and at the `drag`
	// stiffness the sheet trails the finger by 115 px, which reads as fighting it.
	// The arrival is retuned per snap, so `pop` never shows up as bounce.
	const height = new Spring(window.innerHeight * SNAPS[OPEN], springs.pop);

	// Dim only once the sheet is past half: below that the user is comparing the
	// two surfaces, and dimming the one they are comparing against is a lie.
	const dim = $derived(height.current > viewport * SNAPS[1]);

	type Drag = { y: number; from: number; samples: { y: number; t: number }[] };
	let drag: Drag | null = null;

	function clamp(value: number, low: number, high: number) {
		return Math.min(Math.max(value, low), high);
	}

	function nearest(at: number): number {
		let best = 0;
		let gap = Infinity;
		for (let i = 0; i < SNAPS.length; i++) {
			const distance = Math.abs(SNAPS[i] * viewport - at);
			if (distance < gap) {
				gap = distance;
				best = i;
			}
		}
		return best;
	}

	/** The next point in the direction of travel, never two points away. */
	function travel(down: boolean, at: number): number {
		if (down) {
			for (let i = SNAPS.length - 1; i >= 0; i--) if (SNAPS[i] * viewport < at) return i;
			return 0;
		}
		for (let i = 0; i < SNAPS.length; i++) if (SNAPS[i] * viewport > at) return i;
		return SNAPS.length - 1;
	}

	/** Finger travel over the last 100 ms, in pixels per millisecond. */
	function velocity(samples: { y: number; t: number }[]): number {
		const last = samples[samples.length - 1];
		let first = samples[0];
		for (const sample of samples) {
			if (last.t - sample.t <= 100) {
				first = sample;
				break;
			}
		}
		const elapsed = last.t - first.t;
		return elapsed > 0 ? (last.y - first.y) / elapsed : 0;
	}

	function snapTo(next: number, flick = false) {
		snap = next;
		const target = SNAPS[next] * viewport;
		const preset = flick ? springs.drag : springs.settle;
		height.stiffness = preset.stiffness;
		height.damping = preset.damping;
		if (!motionOk()) {
			height.set(target, { instant: true });
		} else if (flick) {
			height.set(target, { preserveMomentum: 200 });
		} else {
			height.set(target);
		}
		if (next > 0 && !desktop) armBackGuard();
		else disarmBackGuard();
	}

	function onPointerDown(event: PointerEvent) {
		if (desktop) return;
		try {
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		} catch {
			// No capture available (a synthetic or already-released pointer). The
			// gesture still works, it just stops following outside the handle.
		}
		// The spring keeps running, and the first move retargets it, so a grab
		// mid-flight bends the path instead of jumping to the finger.
		drag = {
			y: event.clientY,
			from: height.current,
			samples: [{ y: event.clientY, t: event.timeStamp }]
		};
	}

	function onPointerMove(event: PointerEvent) {
		if (!drag) return;
		drag.samples.push({ y: event.clientY, t: event.timeStamp });
		if (drag.samples.length > 6) drag.samples.shift();
		const next = clamp(drag.from + (drag.y - event.clientY), min, max);
		// Reduced motion follows the finger directly: no spring, no trail.
		if (motionOk()) height.set(next);
		else height.set(next, { instant: true });
	}

	function onPointerUp(event: PointerEvent) {
		if (!drag) return;
		const samples = drag.samples;
		// Where the finger ended, not where the trailing spring ended: the gesture
		// asked for a point, and the spring is only catching up to it.
		const at = drag.from + (drag.y - event.clientY);
		drag = null;

		if (!motionOk()) {
			snapTo(nearest(at));
			return;
		}
		const speed = velocity(samples);
		if (Math.abs(speed) < FLICK) {
			snapTo(nearest(at));
			return;
		}
		// The finger moving down shrinks the sheet, so travel goes one point down.
		snapTo(travel(speed > 0, at));
	}

	/** Touching the content kills the snap, so text never slides under a reading finger. */
	function stopFlight() {
		if (drag) return;
		height.set(height.current, { instant: true });
	}

	/** An attachment, not an attribute: this is a passive listener, not an interaction. */
	function haltOnTouch(node: HTMLElement) {
		const stop = () => stopFlight();
		node.addEventListener('pointerdown', stop);
		node.addEventListener('touchstart', stop, { passive: true });
		return () => {
			node.removeEventListener('pointerdown', stop);
			node.removeEventListener('touchstart', stop);
		};
	}

	function onGripKey(event: KeyboardEvent) {
		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
		event.preventDefault();
		const next = event.key === 'ArrowUp' ? snap + 1 : snap - 1;
		snapTo(clamp(next, 0, SNAPS.length - 1));
	}

	function onResize() {
		const next = window.innerHeight;
		if (next === viewport) return;
		viewport = next;
		if (desktop) return;
		// Keep the ratio across a rotation or a URL bar collapse.
		height.set(SNAPS[snap] * viewport, { instant: true });
	}

	function closeSheet() {
		void goto('/');
	}

	onMount(() => {
		// matchMedia, not window.innerWidth: the CSS breakpoint and this flag have to
		// be the same question asked twice, or the side panel renders with a sheet's
		// inline height on it.
		const onWide = () => {
			desktop = wide.matches;
			if (desktop) {
				disarmBackGuard();
				return;
			}
			height.set(SNAPS[snap] * viewport, { instant: true });
			if (snap > 0) armBackGuard();
		};
		wide.addEventListener('change', onWide);

		const unregister = registerSheetClose(() => {
			if (snap === 0) return false;
			snapTo(0);
			return true;
		});
		if (!desktop && snap > 0) armBackGuard();

		return () => {
			wide.removeEventListener('change', onWide);
			unregister();
			disarmBackGuard();
		};
	});
</script>

<svelte:window onresize={onResize} />

<!-- Covers the table so it recedes, and never takes a pointer: the table stays
     pannable under the sheet at every snap point. -->
<div class="dim" aria-hidden="true" style:opacity={dim ? 0.18 : 0}></div>

<div
	class="sheet"
	style:block-size={desktop ? undefined : `${height.current}px`}
	data-sheet={desktop ? 'panel' : 'sheet'}
	data-snap={snap}
	aria-label="Element detail"
>
	<div class="handle">
		<button
			class="grip"
			type="button"
			aria-label="Height of the element panel"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
			onkeydown={onGripKey}
		>
			<span class="bar" aria-hidden="true"></span>
		</button>
		<button class="close" type="button" onclick={closeSheet}>Close</button>
	</div>

	<div class="content" {@attach haltOnTouch}>
		<Inspector {element} />
	</div>
</div>

<style>
	.dim {
		position: fixed;
		inset: 0;
		z-index: 20;
		background: var(--bg);
		opacity: 0;
		pointer-events: none;
		transition: opacity var(--dur-base) var(--ease-out);
	}

	.sheet {
		position: fixed;
		inset-inline: 0;
		inset-block-end: 0;
		z-index: 21;
		display: flex;
		flex-direction: column;
		background: var(--surface-raised);
		border-block-start: 1px solid var(--line);
		border-start-start-radius: var(--radius);
		border-start-end-radius: var(--radius);
		/* The home bar sits in the inset, so the lowest snap keeps its content clear
		   of it. --safe-bottom is the override a desktop test uses to simulate one. */
		padding-block-end: max(env(safe-area-inset-bottom), var(--safe-bottom, 0px));
	}

	.handle {
		position: relative;
		flex: none;
		display: flex;
		align-items: center;
		padding-inline: 0.25rem;
	}

	.grip {
		flex: 1 1 auto;
		display: grid;
		place-items: center;
		min-block-size: 2.75rem;
		background: none;
		border: 0;
		cursor: grab;
		touch-action: none;
	}

	.grip:active {
		cursor: grabbing;
	}

	.grip:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: -2px;
	}

	.bar {
		inline-size: 2.5rem;
		block-size: 0.25rem;
		border-radius: 999px;
		background: var(--ink-faint);
	}

	.close {
		position: absolute;
		inset-inline-end: 0.25rem;
		inset-block-start: 50%;
		translate: 0 -50%;
		min-block-size: 2.75rem;
		min-inline-size: 2.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface-raised);
		color: var(--ink);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.close:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	/* Keeps the scroll container bounded, so the drag surface and the scrolling
	   surface never compete for the same finger. */
	.content {
		flex: 1 1 auto;
		min-block-size: 0;
		display: flex;
		flex-direction: column;
		overscroll-behavior: contain;
	}

	/* Above the breakpoint the sheet is the side panel from Task 4: no handle, no
	   dim, no fixed position. The chrome simply does not render. */
	@media (min-width: 720px) {
		.dim,
		.handle {
			display: none;
		}

		.sheet {
			position: sticky;
			inset-block: 1rem auto;
			inset-inline: auto;
			inline-size: 20rem;
			max-inline-size: 100%;
			border: 1px solid var(--line);
			border-radius: var(--radius);
			padding-block-end: 0;
		}

		.content {
			display: block;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dim {
			transition: none;
		}
	}
</style>
