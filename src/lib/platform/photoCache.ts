// Element photos in IndexedDB, one Blob per symbol. Best effort on purpose: every
// path resolves to a value instead of throwing, so a blocked, private or evicted
// store costs a photo and nothing else. `.plan/decisions.md` D16 is the reason the
// cache exists at all — the app never depends on a hit, and only the settings
// dialog fills it.

import { isBrowser, type ILiveQuery } from 'svelte-idb';
import { createReactiveDB } from 'svelte-idb/svelte';
import type { ElementImage } from '#lib/data/types.ts';

const DB = 'lolia.photos';
const STORE = 'photos';
/** 2, not 1: the hand-rolled wrapper keyed bare blobs out-of-line at version 1. */
const VERSION = 2;
/** How long a read waits before a blocked upgrade counts as no cache at all. */
const OPEN_BUDGET = 4000;

/** One cached photo. `put` takes the whole record, so the store's keyPath is the key. */
type PhotoRecord = { symbol: string; blob: Blob; bytes: number };

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

const EMPTY: PhotoStats = { count: 0, bytes: 0 };

/**
 * Version 1 held bare blobs under out-of-line keys, so the store has to be
 * rebuilt around `symbol` — carrying the bytes over rather than asking the user
 * to download 118 photos a second time.
 */
function upgrade(db: IDBDatabase, oldVersion: number, _next: number, transaction: IDBTransaction) {
	if (oldVersion === 0 || !db.objectStoreNames.contains(STORE)) return;
	const carried: { symbol: string; blob: Blob }[] = [];
	const cursor = transaction.objectStore(STORE).openCursor();
	cursor.onsuccess = () => {
		const row = cursor.result;
		if (row) {
			if (typeof row.key === 'string' && row.value instanceof Blob) {
				carried.push({ symbol: row.key, blob: row.value });
			}
			row.continue();
			return;
		}
		db.deleteObjectStore(STORE);
		db.createObjectStore(STORE, { keyPath: 'symbol' });
		const next = transaction.objectStore(STORE);
		for (const { symbol, blob } of carried) {
			next.put({ symbol, blob, bytes: blob.size } satisfies PhotoRecord);
		}
	};
}

// One instance for reads, writes and the live query: svelte-idb notifies per
// database, so a second `createDB` would never hear about these writes.
const db = createReactiveDB({
	name: DB,
	version: VERSION,
	stores: { photos: { keyPath: 'symbol' } },
	onUpgrade: upgrade
});

let opening: Promise<boolean> | null = null;

/** The library's open promise never settles while another tab blocks the upgrade. */
function ready(): Promise<boolean> {
	if (!isBrowser()) return Promise.resolve(false);
	opening ??= new Promise((resolve) => {
		const stop = setTimeout(() => resolve(false), OPEN_BUDGET);
		const settle = (ok: boolean) => {
			clearTimeout(stop);
			resolve(ok);
		};
		db.getRawDB().then(
			() => settle(true),
			() => settle(false)
		);
	});
	return opening;
}

/** Every record, or `null` when the store cannot be read at all. Never rejects. */
async function read(): Promise<PhotoRecord[] | null> {
	try {
		return (await db.photos.getAll()) as PhotoRecord[];
	} catch {
		return null;
	}
}

function summarize(records: PhotoRecord[]): PhotoStats {
	const blobs = records.map((record) => record.blob).filter((blob) => blob instanceof Blob);
	return { count: blobs.length, bytes: blobs.reduce((sum, blob) => sum + blob.size, 0) };
}

/** The cached photo for one symbol, or `null`. Absence and failure look the same. */
export async function get(symbol: string): Promise<Blob | null> {
	if (!(await ready())) return null;
	try {
		const record = (await db.photos.get(symbol)) as PhotoRecord | undefined;
		return record?.blob instanceof Blob ? record.blob : null;
	} catch {
		return null;
	}
}

/** Cache one photo. `false` means it did not land, which is not an error anywhere. */
export async function put(symbol: string, blob: Blob): Promise<boolean> {
	if (!(await ready())) return false;
	try {
		await db.photos.put({ symbol, blob, bytes: blob.size } satisfies PhotoRecord);
		return true;
	} catch {
		return false;
	}
}

/** Empty the store. `false` means there was nothing to empty it with. */
export async function clear(): Promise<boolean> {
	if (!(await ready())) return false;
	try {
		await db.photos.clear();
		return true;
	} catch {
		return false;
	}
}

/**
 * What is in the cache: the entries and their exact bytes, because those are the
 * only bytes this app writes. Where the store cannot be read at all, the browser's
 * own usage estimate is the honest substitute — it is never smaller than the truth.
 */
export async function stats(): Promise<PhotoStats> {
	if (await ready()) {
		const records = await read();
		if (records) return summarize(records);
	}
	const estimate = await usage();
	return { count: 0, bytes: estimate ?? 0 };
}

/**
 * Built once, at module load, rather than on the first read. A query created
 * inside a component's `$derived` is created *during* that computation, and the
 * value the derived then reads is the one the constructor left behind
 * (`undefined`), so the first result invalidates nothing and the panel keeps a
 * zero forever. Out here the signal exists before anything derives from it.
 */
const liveStats: ILiveQuery<PhotoStats> | null = isBrowser()
	? db.liveQuery(async () => summarize((await read()) ?? []), [STORE])
	: null;

/** The live count and size: they update themselves. */
export function cachedStats(): PhotoStats {
	return liveStats?.current ?? EMPTY;
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
