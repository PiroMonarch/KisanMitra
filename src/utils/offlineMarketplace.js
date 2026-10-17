import { API_BASE, getAuthHeaders } from './api.js';

const STORAGE_KEYS = {
  listings: 'kisanmitr_market_listings',
  farmerListings: 'kisanmitr_market_farmer_listings',
  buyerOrders: 'kisanmitr_market_buyer_orders',
  farmerOrders: 'kisanmitr_market_farmer_orders',
  queue: 'kisanmitr_market_queue'
};

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const readJson = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  return safeParse(localStorage.getItem(key), fallback);
};

const compactListings = (listings) => (listings || []).map((item) => {
  if (!item || typeof item !== 'object') return item;
  const image = item.image;
  if (typeof image === 'string' && (image.startsWith('data:') || image.length > 2048)) {
    return { ...item, image: null };
  }
  return item;
});

const writeJson = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (error?.name === 'QuotaExceededError') {
      try {
        if (key === STORAGE_KEYS.listings || key === STORAGE_KEYS.farmerListings) {
          const compacted = compactListings(value);
          const trimmed = Array.isArray(compacted) ? compacted.slice(0, 30) : compacted;
          localStorage.setItem(key, JSON.stringify(trimmed));
        }
      } catch (_) {
        // Ignore storage errors to prevent UI crash
      }
    }
  }
};

export const isOnline = () => {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
};

export const makeOfflineId = (prefix = 'offline') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const getCachedListings = () => readJson(STORAGE_KEYS.listings, []);
export const setCachedListings = (listings) =>
  writeJson(STORAGE_KEYS.listings, compactListings(listings));

export const getCachedFarmerListings = (farmerId) => {
  if (!farmerId) return [];
  const map = readJson(STORAGE_KEYS.farmerListings, {});
  return map[farmerId] || [];
};

export const setCachedFarmerListings = (farmerId, listings) => {
  if (!farmerId) return;
  const map = readJson(STORAGE_KEYS.farmerListings, {});
  map[farmerId] = compactListings(listings);
  writeJson(STORAGE_KEYS.farmerListings, map);
};

export const getCachedBuyerOrders = (buyerId) => {
  if (!buyerId) return [];
  const map = readJson(STORAGE_KEYS.buyerOrders, {});
  return map[buyerId] || [];
};

export const setCachedBuyerOrders = (buyerId, orders) => {
  if (!buyerId) return;
  const map = readJson(STORAGE_KEYS.buyerOrders, {});
  map[buyerId] = orders;
  writeJson(STORAGE_KEYS.buyerOrders, map);
};

export const getCachedFarmerOrders = (farmerId) => {
  if (!farmerId) return [];
  const map = readJson(STORAGE_KEYS.farmerOrders, {});
  return map[farmerId] || [];
};

export const setCachedFarmerOrders = (farmerId, orders) => {
  if (!farmerId) return;
  const map = readJson(STORAGE_KEYS.farmerOrders, {});
  map[farmerId] = orders;
  writeJson(STORAGE_KEYS.farmerOrders, map);
};

export const mergeListings = (serverListings, cachedListings) => {
  const serverIds = new Set((serverListings || []).map((item) => item._id));
  const pending = (cachedListings || []).filter(
    (item) => item.syncStatus === 'pending' && !serverIds.has(item._id)
  );
  return [...(serverListings || []), ...pending];
};

export const mergeOrders = (serverOrders, cachedOrders) => {
  const serverIds = new Set((serverOrders || []).map((item) => item._id));
  const pending = (cachedOrders || []).filter(
    (item) => item.syncStatus === 'pending' && !serverIds.has(item._id)
  );
  return [...(serverOrders || []), ...pending];
};

export const enqueueAction = (type, payload) => {
  const queue = readJson(STORAGE_KEYS.queue, []);
  const action = {
    id: makeOfflineId('action'),
    type,
    payload,
    createdAt: new Date().toISOString()
  };
  queue.push(action);
  writeJson(STORAGE_KEYS.queue, queue);
  return action;
};

export const removeQueuedAction = (predicate) => {
  const queue = readJson(STORAGE_KEYS.queue, []);
  const next = queue.filter((item) => !predicate(item));
  writeJson(STORAGE_KEYS.queue, next);
  return next.length !== queue.length;
};

export const updateQueuedAction = (predicate, updater) => {
  const queue = readJson(STORAGE_KEYS.queue, []);
  let updated = false;
  const next = queue.map((item) => {
    if (!updated && predicate(item)) {
      updated = true;
      return updater(item);
    }
    return item;
  });
  if (updated) writeJson(STORAGE_KEYS.queue, next);
  return updated;
};

const replaceListing = (listings, offlineId, serverListing) => {
  let replaced = false;
  const next = (listings || []).map((item) => {
    if (item.offlineId === offlineId || item._id === offlineId) {
      replaced = true;
      return serverListing;
    }
    return item;
  });
  return replaced ? next : listings;
};

const replaceOrder = (orders, offlineId, serverOrder) => {
  let replaced = false;
  const next = (orders || []).map((item) => {
    if (item.offlineId === offlineId || item._id === offlineId) {
      replaced = true;
      return serverOrder;
    }
    return item;
  });
  return replaced ? next : orders;
};

export const syncMarketplaceQueue = async () => {
  if (!isOnline()) {
    const pending = readJson(STORAGE_KEYS.queue, []).length;
    return { synced: 0, failed: 0, pending };
  }

  const queue = readJson(STORAGE_KEYS.queue, []);
  if (!queue.length) return { synced: 0, failed: 0, pending: 0 };

  let synced = 0;
  let failed = 0;
  const remaining = [];

  for (const action of queue) {
    try {
      if (action.type === 'CREATE_PRODUCT') {
        const response = await fetch(`${API_BASE}/api/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(action.payload.listing)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Listing sync failed');

        const globalListings = getCachedListings();
        const farmerListings = getCachedFarmerListings(action.payload.farmerId);
        setCachedListings(replaceListing(globalListings, action.payload.offlineId, data.product));
        setCachedFarmerListings(
          action.payload.farmerId,
          replaceListing(farmerListings, action.payload.offlineId, data.product)
        );
      } else if (action.type === 'PLACE_ORDER') {
        const response = await fetch(`${API_BASE}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            items: action.payload.items,
            deliveryOption: action.payload.deliveryOption,
            paymentMethod: action.payload.paymentMethod,
            buyerDetails: action.payload.buyerDetails
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Order sync failed');

        const buyerOrders = getCachedBuyerOrders(action.payload.buyerId);
        setCachedBuyerOrders(
          action.payload.buyerId,
          replaceOrder(buyerOrders, action.payload.offlineId, data.order)
        );
      } else if (action.type === 'UPDATE_ORDER_STATUS') {
        const response = await fetch(
          `${API_BASE}/api/orders/${action.payload.orderId}/${action.payload.action}`,
          {
            method: 'PATCH',
            headers: { ...getAuthHeaders() }
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Order update sync failed');

        const farmerOrders = getCachedFarmerOrders(action.payload.farmerId);
        setCachedFarmerOrders(
          action.payload.farmerId,
          farmerOrders.map((order) => (order._id === data.order._id ? data.order : order))
        );
      } else if (action.type === 'DELETE_PRODUCT') {
        const response = await fetch(`${API_BASE}/api/products/${action.payload.productId}`, {
          method: 'DELETE',
          headers: { ...getAuthHeaders() }
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Delete listing sync failed');
        }

        const globalListings = getCachedListings().filter((item) => item._id !== action.payload.productId);
        setCachedListings(globalListings);

        const farmerListings = getCachedFarmerListings(action.payload.farmerId)
          .filter((item) => item._id !== action.payload.productId);
        setCachedFarmerListings(action.payload.farmerId, farmerListings);
      } else if (action.type === 'UPDATE_PRODUCT') {
        const response = await fetch(`${API_BASE}/api/products/${action.payload.productId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(action.payload.updates)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Update listing sync failed');

        const globalListings = getCachedListings().map((item) =>
          item._id === data.product._id ? data.product : item
        );
        setCachedListings(globalListings);

        const farmerListings = getCachedFarmerListings(action.payload.farmerId).map((item) =>
          item._id === data.product._id ? data.product : item
        );
        setCachedFarmerListings(action.payload.farmerId, farmerListings);
      }
      synced += 1;
    } catch (error) {
      failed += 1;
      remaining.push(action);
    }
  }

  writeJson(STORAGE_KEYS.queue, remaining);
  return { synced, failed, pending: remaining.length };
};
