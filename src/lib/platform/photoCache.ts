// Element photos in IndexedDB, one Blob per symbol. Best effort on purpose: every
// path resolves to a value instead of throwing, so a blocked, private or evicted
// store costs a photo and nothing else. `.plan/decisions.md` D16 is the reason the
// cache exists at all — the app never depends on a hit, and only the settings
// dialog fills it.

import type { ElementImage } from '#lib/data/types.ts';

const DB = 'lolia.photos';
const STORE = 'photos';
const VERSION = 1;

/** One element to fetch. Built from the generated data, so the list cannot go stale. */
export type PhotoJob = { symbol: string; url: string };

export type PhotoProgress = { done: number; total: number; failed: number };

export type PhotoStats = { count: number; bytes: number };

/**
 * Where a photo came from. `cache` and `network` both mean "show this"; the
 * order they are tried in is the contract: cache, then network, then drawn.
 */
export type PhotoResolution =
	| { source: 'cache'; blob: Blob }
	| { source: 'network'; url: string }
	| { source: 'placeholder' };

let opening: Promise<IDBDatabase | null> | null = null;

/** The store, opened once. `null` means there is no usable IndexedDB, ever. */
function open(): Promise<IDBDatabase | null> {
	opening ??= new Promise((resolve) => {
		try {
			const request = indexedDB.open(DB, VERSION);
			request.onupgradeneeded = () => request.result.createObjectStore(STORE);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => resolve(null);
			request.onblocked = () => resolve(null);
		} catch {
			// No IndexedDB at all: a private window, or a shell that blocks it.
			resolve(null);
		}
	});
	return opening;
}

async function store(mode: IDBTransactionMode): Promise<IDBObjectStore | null> {
	const db = await open();
	if (!db) return null;
	try {
		return db.transaction(STORE, mode).objectStore(STORE);
	} catch {
		return null;
	}
}

/** One request, resolved to its value or `null`. Never rejects. */
function read<T>(
	box: IDBObjectStore,
	run: (box: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
	return new Promise((resolve) => {
		try {
			const request = run(box);
			request.onsuccess = () => resolve(request.result ?? null);
			request.onerror = () => resolve(null);
		} catch {
			resolve(null);
		}
	});
}

/** One request, resolved to whether it landed. Never rejects. */
function write<T>(
	box: IDBObjectStore,
	run: (box: IDBObjectStore) => IDBRequest<T>
): Promise<boolean> {
	return new Promise((resolve) => {
		try {
			const request = run(box);
			request.onsuccess = () => resolve(true);
			request.onerror = () => resolve(false);
		} catch {
			resolve(false);
		}
	});
}

/** The cached photo for one symbol, or `null`. Absence and failure look the same. */
export async function get(symbol: string): Promise<Blob | null> {
	const box = await store('readonly');
	if (!box) return null;
	const value = await read(box, (target) => target.get(symbol));
	return value instanceof Blob ? value : null;
}

/** Cache one photo. `false` means it did not land, which is not an error anywhere. */
export async function put(symbol: string, blob: Blob): Promise<boolean> {
	const box = await store('readwrite');
	if (!box) return false;
	return write(box, (target) => target.put(blob, symbol));
}

/** Empty the store. `false` means there was nothing to empty it with. */
export async function clear(): Promise<boolean> {
	const box = await store('readwrite');
	if (!box) return false;
	return write(box, (target) => target.clear());
}

/**
 * What is in the cache: the entries and their exact bytes, because those are the
 * only bytes this app writes. Where the store cannot be read at all, the browser's
 * own usage estimate is the honest substitute — it is never smaller than the truth.
 */
export async function stats(): Promise<PhotoStats> {
	const box = await store('readonly');
	const values = box ? await read(box, (target) => target.getAll()) : null;
	if (values) {
		const blobs = values.filter((value) => value instanceof Blob);
		return { count: blobs.length, bytes: blobs.reduce((sum, blob) => sum + blob.size, 0) };
	}
	const estimate = await usage();
	return { count: 0, bytes: estimate ?? 0 };
}

async function usage(): Promise<number | null> {
	try {
		const { usage: bytes } = (await navigator.storage?.estimate?.()) ?? {};
		return typeof bytes === 'number' ? bytes : null;
	} catch {
		return null;
	}
}

/**
 * Ask the browser to keep this origin's storage. Nothing depends on the answer:
 * without it the cache is evictable, which is already the assumption.
 */
export async function persist(): Promise<boolean> {
	try {
		return (await navigator.storage?.persist?.()) ?? false;
	} catch {
		return false;
	}
}

/**
 * cache → network → placeholder, in that order and never another. `readCache` is
 * a seam for the test; in the app it is this module's own store.
 */
export async function resolvePhoto(
	photo: ElementImage | null,
	symbol: string,
	readCache: (symbol: string) => Promise<Blob | null> = get
): Promise<PhotoResolution> {
	if (!photo) return { source: 'placeholder' };

	let cached: Blob | null = null;
	try {
		cached = await readCache(symbol);
	} catch {
		// A reader that throws is a cache miss, not a broken panel.
		cached = null;
	}
	if (cached) return { source: 'cache', blob: cached };

	// The network step is the browser's own image request, not a fetch here: an
	// <img> needs no CORS grant, and several upstream hosts do not send one.
	if (photo.url) return { source: 'network', url: photo.url };

	return { source: 'placeholder' };
}

/**
 * The opt-in "download all". Sequential and cancellable, because 118 parallel
 * requests to one image host is rude and an abort has to stop at a boundary.
 *
 * ponytail: one request at a time; add a small pool if this ever feels slow.
 */
export async function downloadAll(
	jobs: PhotoJob[],
	onProgress: (progress: PhotoProgress) => void,
	signal?: AbortSignal
): Promise<PhotoProgress> {
	const progress: PhotoProgress = { done: 0, total: jobs.length, failed: 0 };
	onProgress({ ...progress });
	await persist();

	for (const job of jobs) {
		if (signal?.aborted) return progress;
		try {
			// Already cached: a second run costs the requests that are missing only.
			if (!(await get(job.symbol))) {
				// `credentials: omit` because these are third-party images, and a
				// cache must not carry this origin's cookies off-origin.
				const response = await fetch(job.url, { signal, credentials: 'omit' });
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				await put(job.symbol, await response.blob());
			}
		} catch {
			if (signal?.aborted) return progress;
			// Offline, or a host that sends no CORS header: the element keeps its
			// drawn placeholder, which is the same state as never asking.
			progress.failed += 1;
		}
		progress.done += 1;
		onProgress({ ...progress });
	}

	return progress;
}
