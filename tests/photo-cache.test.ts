/// <reference lib="dom" />
// The cache module talks to IndexedDB, which Bun does not implement — so the
// point of most of these tests is what happens when the store is not there at
// all. That is the state of a private window or a shell that blocks storage, and
// it has to cost a photo and nothing else.
//
// The reference above is for the DOM types only; the runtime is still Bun, and
// `indexedDB` is still absent, which is the failing case this file exercises.

import { afterEach, describe, expect, test } from 'bun:test';
import {
	clear,
	downloadAll,
	get,
	put,
	resolvePhoto,
	stats,
	type PhotoJob,
	type PhotoProgress
} from '../src/lib/platform/photoCache.ts';

const photo = {
	url: 'https://example.test/iron.jpg',
	title: 'Fragments of an iron meteorite',
	attribution: 'Chemical Elements, CC BY 3.0, via Wikimedia Commons'
};

const bytes = new Blob(['jpeg bytes']);

const jobs: PhotoJob[] = [
	{ symbol: 'H', url: 'https://example.test/h.jpg' },
	{ symbol: 'He', url: 'https://example.test/he.jpg' },
	{ symbol: 'Li', url: 'https://example.test/li.jpg' }
];

const realFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = realFetch;
});

describe('resolve order', () => {
	test('a cached blob wins and the network is never reached', async () => {
		const asked: string[] = [];
		const resolved = await resolvePhoto(photo, 'Fe', async (symbol) => {
			asked.push(symbol);
			return bytes;
		});

		if (resolved.source !== 'cache') throw new Error(`expected cache, got ${resolved.source}`);
		expect(resolved.blob).toBe(bytes);
		expect(asked).toEqual(['Fe']);
	});

	test('a miss falls through to the network url', async () => {
		const resolved = await resolvePhoto(photo, 'Fe', async () => null);
		expect(resolved.source).toBe('network');
		if (resolved.source !== 'network') throw new Error('expected network');
		expect(resolved.url).toBe(photo.url);
	});

	test('a cache that throws is a miss, not a broken panel', async () => {
		const resolved = await resolvePhoto(photo, 'Fe', async () => {
			throw new Error('IDBObjectStore is not available');
		});
		expect(resolved.source).toBe('network');
	});

	test('no photo at all is the drawn placeholder, without touching the cache', async () => {
		const asked: string[] = [];
		const resolved = await resolvePhoto(null, 'Fe', async (symbol) => {
			asked.push(symbol);
			return bytes;
		});

		expect(resolved.source).toBe('placeholder');
		expect(asked).toEqual([]);
	});

	test('a photo with no url is the drawn placeholder too', async () => {
		const resolved = await resolvePhoto({ ...photo, url: '' }, 'Fe', async () => null);
		expect(resolved.source).toBe('placeholder');
	});
});

describe('cache failure tolerance', () => {
	test('every operation answers instead of throwing without IndexedDB', async () => {
		expect(await get('Fe')).toBeNull();
		expect(await put('Fe', bytes)).toBe(false);
		expect(await clear()).toBe(false);
		expect(await stats()).toEqual({ count: 0, bytes: 0 });
	});
});

describe('download all', () => {
	test('walks the list, reports each step, and counts nothing as failed', async () => {
		const asked: string[] = [];
		globalThis.fetch = (async (input: string | URL | Request) => {
			asked.push(String(input));
			return new Response(bytes, { status: 200 });
		}) as typeof fetch;

		const seen: PhotoProgress[] = [];
		const done = await downloadAll(jobs, (next) => seen.push(next));

		expect(asked).toEqual(jobs.map((job) => job.url));
		expect(done).toEqual({ done: 3, total: 3, failed: 0 });
		expect(seen.map((step) => step.done)).toEqual([0, 1, 2, 3]);
	});

	test('one unreachable photo is counted and the rest still run', async () => {
		globalThis.fetch = (async (input: string | URL | Request) => {
			if (String(input) === jobs[1].url) throw new TypeError('Failed to fetch');
			return new Response(bytes, { status: 200 });
		}) as typeof fetch;

		const done = await downloadAll(jobs, () => {});

		expect(done).toEqual({ done: 3, total: 3, failed: 1 });
	});

	test('an abort stops at the next boundary and starts no request', async () => {
		const asked: string[] = [];
		globalThis.fetch = (async (input: string | URL | Request) => {
			asked.push(String(input));
			return new Response(bytes, { status: 200 });
		}) as typeof fetch;

		const controller = new AbortController();
		controller.abort();

		const done = await downloadAll(jobs, () => {}, controller.signal);

		expect(done).toEqual({ done: 0, total: 3, failed: 0 });
		expect(asked).toEqual([]);
	});
});
