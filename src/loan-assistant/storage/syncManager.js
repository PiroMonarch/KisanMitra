/**
 * Sync Manager
 * Handles offline-first data synchronization for schemes.
 */

const SYNC_CONFIG = {
    METADATA_URL: '/api/schemes/metadata',
    DATA_URL: '/api/schemes',
    CACHE_KEY: 'kisanmitr_schemes_db',
    VERSION_KEY: 'kisanmitr_schemes_version'
};

/**
 * Synchronizes the local scheme database with the server.
 * Falls back to local cache if offline.
 */
export async function syncSchemes() {
    try {
        // 1. Check metadata for version
        const metaResponse = await fetch(SYNC_CONFIG.METADATA_URL);
        if (!metaResponse.ok) throw new Error('Network response was not ok');

        const metadata = await metaResponse.json();
        const localVersion = localStorage.getItem(SYNC_CONFIG.VERSION_KEY);

        // 2. Fetch data only if version mismatch or no local data
        if (metadata.version !== localVersion || !localStorage.getItem(SYNC_CONFIG.CACHE_KEY)) {
            console.log(`Syncing schemes... ${localVersion} -> ${metadata.version}`);

            const dataResponse = await fetch(SYNC_CONFIG.DATA_URL);
            if (!dataResponse.ok) throw new Error('Data fetch failed');

            const schemes = await dataResponse.json();

            // 3. Update local cache
            localStorage.setItem(SYNC_CONFIG.CACHE_KEY, JSON.stringify(schemes));
            localStorage.setItem(SYNC_CONFIG.VERSION_KEY, metadata.version);

            return { success: true, version: metadata.version, updated: true };
        }

        return { success: true, version: localVersion, updated: false };
    } catch (error) {
        console.warn('Sync failed, using offline cache:', error.message);
        return {
            success: false,
            error: error.message,
            usingCache: !!localStorage.getItem(SYNC_CONFIG.CACHE_KEY)
        };
    }
}

/**
 * Retrieves schemes from local storage.
 */
export function getLocalSchemes() {
    const data = localStorage.getItem(SYNC_CONFIG.CACHE_KEY);
    return data ? JSON.parse(data) : [];
}
