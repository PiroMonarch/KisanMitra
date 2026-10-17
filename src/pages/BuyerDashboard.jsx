import React, { useEffect, useMemo, useRef, useState } from 'react';
import BuyerNavbar from '../components/BuyerNavbar.jsx';
import OrderChat from '../components/OrderChat.jsx';
import { API_BASE, getAuthHeaders } from '../utils/api.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { seedDemoMarketplace } from '../utils/demoMarketplace.js';
import {
  enqueueAction,
  getCachedBuyerOrders,
  getCachedFarmerOrders,
  getCachedListings,
  isOnline,
  makeOfflineId,
  mergeListings,
  mergeOrders,
  setCachedBuyerOrders,
  setCachedFarmerOrders,
  setCachedListings,
  syncMarketplaceQueue
} from '../utils/offlineMarketplace.js';

const cartStorageKey = 'kisanmitr_cart';
const addressStorageKey = 'kisanmitr_address';

const loadJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
};

const hasDemoSession = () => {
  try {
    return JSON.parse(localStorage.getItem('kisanmitr_user'))?.demo === true;
  } catch (error) {
    return false;
  }
};

const BuyerDashboard = () => {
  const [activeTab, setActiveTab] = useState('shop');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState(() => loadJson(cartStorageKey, []));
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subStatus, setSubStatus] = useState({ loading: false, error: '' });
  const [subForm, setSubForm] = useState({
    itemName: '',
    qty: '',
    unit: 'kg',
    dayOfWeek: '1',
    deliveryOption: 'platform',
    paymentMethod: 'cod',
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [qtySelections, setQtySelections] = useState({});
  const [isOffline, setIsOffline] = useState(() => !isOnline() || hasDemoSession());
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [checkout, setCheckout] = useState(() => {
    const saved = loadJson(addressStorageKey, null);
    return {
      name: saved?.name || '',
      phone: saved?.phone || '',
      addressLine1: saved?.addressLine1 || '',
      addressLine2: saved?.addressLine2 || '',
      city: saved?.city || '',
      state: saved?.state || '',
      pincode: saved?.pincode || '',
      deliveryOption: 'platform',
      paymentMethod: '',
      upiId: '',
      cardNumber: '',
      cardName: '',
      cardExpiry: '',
      cardCvv: ''
    };
  });
  const [checkoutError, setCheckoutError] = useState('');
  const [reviewForms, setReviewForms] = useState({});
  const [activeReview, setActiveReview] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const [cartToast, setCartToast] = useState({ visible: false, message: '' });
  const toastTimeoutRef = useRef(null);
  const { t } = useLanguage();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('kisanmitr_user')) || {};
    } catch (error) {
      return {};
    }
  }, []);

  useEffect(() => {
    if (user?.address) {
      setCheckout((prev) => ({
        ...prev,
        name: user.address.name || prev.name,
        phone: user.address.phone || prev.phone,
        addressLine1: user.address.addressLine1 || prev.addressLine1,
        addressLine2: user.address.addressLine2 || prev.addressLine2,
        city: user.address.city || prev.city,
        state: user.address.state || prev.state,
        pincode: user.address.pincode || prev.pincode
      }));
    }
  }, [user]);

  useEffect(() => {
    if (user.demo) {
      seedDemoMarketplace();
      setListings(getCachedListings());
      setOrders(getCachedBuyerOrders(user.id));
      return;
    }
    const cachedListings = getCachedListings();
    if (cachedListings.length) setListings(cachedListings);
    const cachedOrders = getCachedBuyerOrders(user.id);
    if (cachedOrders.length) setOrders(cachedOrders);

    const fetchProducts = async () => {
      if (!isOnline()) {
        return;
      }
      const response = await fetch(`${API_BASE}/api/products`);
      const data = await response.json();
      if (response.ok) {
        const merged = mergeListings(data.products || [], getCachedListings());
        setListings(merged);
        setCachedListings(merged);
      }
    };

    const fetchOrders = async () => {
      if (!isOnline()) {
        return;
      }
      const response = await fetch(`${API_BASE}/api/orders/buyer`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await response.json();
      if (response.ok) {
        const merged = mergeOrders(data.orders || [], getCachedBuyerOrders(user.id));
        setOrders(merged);
        setCachedBuyerOrders(user.id, merged);
      }
    };

    const fetchSubscriptions = async () => {
      if (!isOnline()) return;
      const response = await fetch(`${API_BASE}/api/subscriptions`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await response.json();
      if (response.ok) {
        setSubscriptions(data.subscriptions || []);
      }
    };

    Promise.all([fetchProducts(), fetchOrders()]);
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      if (hasDemoSession()) return;
      setIsOffline(false);
      await syncMarketplaceQueue();
      const refreshProducts = await fetch(`${API_BASE}/api/products`);
      const data = await refreshProducts.json();
      if (refreshProducts.ok) {
        const merged = mergeListings(data.products || [], getCachedListings());
        setListings(merged);
        setCachedListings(merged);
      }
      const subsResponse = await fetch(`${API_BASE}/api/subscriptions`, {
        headers: { ...getAuthHeaders() }
      });
      const subsData = await subsResponse.json();
      if (subsResponse.ok) {
        setSubscriptions(subsData.subscriptions || []);
      }
      const refreshOrders = await fetch(`${API_BASE}/api/orders/buyer`, {
        headers: { ...getAuthHeaders() }
      });
      const orderData = await refreshOrders.json();
      if (refreshOrders.ok) {
        const mergedOrders = mergeOrders(orderData.orders || [], getCachedBuyerOrders(user.id));
        setOrders(mergedOrders);
        setCachedBuyerOrders(user.id, mergedOrders);
      }
    };

    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (isOnline() && !hasDemoSession()) {
      syncMarketplaceQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const filteredListings = listings.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const updateCart = (nextCart) => {
    setCart(nextCart);
    localStorage.setItem(cartStorageKey, JSON.stringify(nextCart));
  };

  const updateSubForm = (key) => (event) => {
    setSubForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const formatToast = (template, params) =>
    Object.entries(params).reduce(
      (acc, [key, value]) => acc.replace(`{${key}}`, String(value)),
      template
    );

  const createSubscription = async (event) => {
    event.preventDefault();
    setSubStatus({ loading: true, error: '' });
    try {
      const payload = {
        itemName: subForm.itemName,
        qty: Number(subForm.qty),
        unit: subForm.unit,
        dayOfWeek: Number(subForm.dayOfWeek),
        deliveryOption: subForm.deliveryOption,
        paymentMethod: subForm.paymentMethod,
        buyerDetails: {
          name: subForm.name,
          phone: subForm.phone,
          addressLine1: subForm.addressLine1,
          addressLine2: subForm.addressLine2,
          city: subForm.city,
          state: subForm.state,
          pincode: subForm.pincode
        }
      };

      const response = await fetch(`${API_BASE}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to create subscription');
      setSubscriptions((prev) => [data.subscription, ...prev]);
      setSubForm((prev) => ({
        ...prev,
        itemName: '',
        qty: '',
        unit: prev.unit,
        dayOfWeek: prev.dayOfWeek
      }));
    } catch (error) {
      setSubStatus({ loading: false, error: error.message || 'Unable to create subscription' });
      return;
    }
    setSubStatus({ loading: false, error: '' });
  };

  const cancelSubscription = async (id) => {
    const response = await fetch(`${API_BASE}/api/subscriptions/${id}/cancel`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders() }
    });
    const data = await response.json();
    if (response.ok) {
      setSubscriptions((prev) =>
        prev.map((sub) => (sub._id === data.subscription._id ? data.subscription : sub))
      );
    }
  };

  const addToCart = (listing) => {
    const selectedQty = Number(qtySelections[listing._id] || 1);
    const existing = cart.find((item) => item._id === listing._id);
    if (existing) {
      updateCart(
        cart.map((item) =>
          item._id === listing._id
            ? {
              ...item,
              qty: item.qty + selectedQty
            }
            : item
        )
      );
      const nextQty = existing.qty + selectedQty;
      setCartToast({
        visible: true,
        message: formatToast(t('cart.toast.updated'), {
          name: listing.name,
          qty: nextQty,
          unit: listing.unit
        })
      });
      return;
    }
    updateCart([
      ...cart,
      { ...listing, qty: Math.max(1, selectedQty), availableQuantity: listing.quantity }
    ]);
    const addedQty = Math.max(1, selectedQty);
    setCartToast({
      visible: true,
      message: formatToast(t('cart.toast.added'), {
        name: listing.name,
        qty: addedQty,
        unit: listing.unit
      })
    });
  };

  const updateQty = (id, nextQty) => {
    const normalized = Number(nextQty) || 1;
    const nextCart = cart
      .map((item) =>
        item._id === id
          ? {
              ...item,
              qty: Math.max(1, normalized)
            }
          : item
      )
      .filter((item) => item.qty > 0);
    updateCart(nextCart);
  };

  const removeItem = (id) => {
    updateCart(cart.filter((item) => item._id !== id));
  };

  useEffect(() => {
    if (!cartToast.visible) return;
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setCartToast((prev) => ({ ...prev, visible: false }));
    }, 2500);
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [cartToast.visible]);

  const updateReviewField = (orderId, farmerId, key, value) => {
    const mapKey = `${orderId}:${farmerId}`;
    setReviewForms((prev) => ({
      ...prev,
      [mapKey]: { ...prev[mapKey], [key]: value }
    }));
  };

  const submitReview = async (orderId, farmerId) => {
    const mapKey = `${orderId}:${farmerId}`;
    const form = reviewForms[mapKey] || {};
    const rating = Number(form.rating || 0);
    const qualityScore = Number(form.qualityScore || 0);
    const comment = form.comment || '';
    if (rating < 1 || qualityScore < 1) return;
    setReviewError('');

    const response = await fetch(`${API_BASE}/api/orders/${orderId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ farmerId, rating, qualityScore, comment })
    });
    const data = await response.json();
    if (response.ok) {
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? {
                ...order,
                buyerReviews: [...(order.buyerReviews || []), data.review]
              }
            : order
        )
      );
      setReviewForms((prev) => ({ ...prev, [mapKey]: { rating: '', qualityScore: '', comment: '' } }));
      setActiveReview(null);
      return;
    }
    setReviewError(data.message || t('errors.default'));
  };

  const updateCheckout = (key) => (event) => {
    setCheckout((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setCheckoutError('');

    const items = cart.map((item) => ({
      productId: item._id,
      qty: item.qty
    }));

    if (!checkout.addressLine1 || !checkout.city || !checkout.state || !checkout.pincode) {
      setCheckoutError(t('errors.checkoutDetails'));
      return;
    }
    if (!checkout.name || !checkout.phone) {
      setCheckoutError(t('errors.checkoutDetails'));
      return;
    }
    if (!checkout.paymentMethod) {
      setCheckoutError(t('errors.paymentMethod'));
      return;
    }
    if (checkout.paymentMethod === 'UPI' && !checkout.upiId) {
      setCheckoutError(t('errors.paymentDetails'));
      return;
    }
    if (checkout.paymentMethod === 'Card') {
      if (!checkout.cardNumber || !checkout.cardName || !checkout.cardExpiry || !checkout.cardCvv) {
        setCheckoutError(t('errors.paymentDetails'));
        return;
      }
    }

    localStorage.setItem(addressStorageKey, JSON.stringify({
      name: checkout.name,
      phone: checkout.phone,
      addressLine1: checkout.addressLine1,
      addressLine2: checkout.addressLine2,
      city: checkout.city,
      state: checkout.state,
      pincode: checkout.pincode
    }));

    if (!isOnline() || user.demo) {
      const offlineId = makeOfflineId('order');
      const total = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
      const offlineOrder = {
        _id: offlineId,
        offlineId,
        ...(user.demo ? {} : { syncStatus: 'pending' }),
        createdAt: new Date().toISOString(),
        status: 'Pending',
        total,
        buyerDetails: {
          name: checkout.name,
          phone: checkout.phone,
          addressLine1: checkout.addressLine1,
          addressLine2: checkout.addressLine2,
          city: checkout.city,
          state: checkout.state,
          pincode: checkout.pincode
        },
        deliveryOption: checkout.deliveryOption,
        paymentMethod: checkout.paymentMethod,
        items: cart.map((item) => ({
          product: item._id,
          name: item.name,
          price: item.price,
          unit: item.unit,
          qty: item.qty,
          farmerId: item.owner?._id,
          farmerName: item.owner?.name,
          status: 'Pending'
        }))
      };

      const nextOrders = [offlineOrder, ...orders];
      setOrders(nextOrders);
      setCachedBuyerOrders(user.id, nextOrders);
      if (user.demo) {
        const demoFarmerOrders = getCachedFarmerOrders('demo-farmer');
        setCachedFarmerOrders('demo-farmer', [offlineOrder, ...demoFarmerOrders]);
      } else enqueueAction('PLACE_ORDER', {
        offlineId,
        buyerId: user.id,
        items,
        deliveryOption: checkout.deliveryOption,
        paymentMethod: checkout.paymentMethod,
        buyerDetails: {
          name: checkout.name,
          phone: checkout.phone,
          addressLine1: checkout.addressLine1,
          addressLine2: checkout.addressLine2,
          city: checkout.city,
          state: checkout.state,
          pincode: checkout.pincode
        }
      });
      updateCart([]);
      setActiveTab('orders');
      return;
    }

    const response = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        items,
        deliveryOption: checkout.deliveryOption,
        paymentMethod: checkout.paymentMethod,
        buyerDetails: {
          name: checkout.name,
          phone: checkout.phone,
          addressLine1: checkout.addressLine1,
          addressLine2: checkout.addressLine2,
          city: checkout.city,
          state: checkout.state,
          pincode: checkout.pincode
        }
      })
    });

    const data = await response.json();
    if (response.ok) {
      setOrders((prev) => [data.order, ...prev]);
      setCachedBuyerOrders(user.id, [data.order, ...getCachedBuyerOrders(user.id)]);
      updateCart([]);
      try {
        const profileResponse = await fetch(`${API_BASE}/api/users/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            address: {
              name: checkout.name,
              phone: checkout.phone,
              addressLine1: checkout.addressLine1,
              addressLine2: checkout.addressLine2,
              city: checkout.city,
              state: checkout.state,
              pincode: checkout.pincode
            }
          })
        });
        const profileData = await profileResponse.json();
        if (profileResponse.ok && profileData.user) {
          localStorage.setItem('kisanmitr_user', JSON.stringify(profileData.user));
        }
      } catch (error) {
        // ignore profile save errors
      }
      setActiveTab('orders');
      const refresh = await fetch(`${API_BASE}/api/products`);
      const refreshed = await refresh.json();
      if (refresh.ok) {
        const merged = mergeListings(refreshed.products || [], getCachedListings());
        setListings(merged);
        setCachedListings(merged);
      }
    }
  };

  return (
    <div className="dashboard buyer">
      <BuyerNavbar activeTab={activeTab} onTabChange={setActiveTab} cartCount={cart.length} />

      <div className="dashboard-body">
        {cartToast.visible && (
          <div className="cart-toast">
            {cartToast.message}
          </div>
        )}
        {isOffline && (
          <div className="offline-banner">
            {t('offline.banner')}
          </div>
        )}
        {activeTab === 'shop' && (
          <section className="panel">
            <div className="panel-header">
              <h2>{t('market.title')}</h2>
              <p>{t('market.subtitle')}</p>
            </div>

            <div className="shop-toolbar">
              <input
                type="text"
                placeholder={t('market.search')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button className="btn btn-secondary">{t('market.filters')}</button>
            </div>

            {filteredListings.length === 0 ? (
              <p className="muted">{t('market.empty')}</p>
            ) : (
              <div className="listing-grid buyer-grid">
                {filteredListings.map((listing) => (
                  <div key={listing._id} className="listing-card">
                    <img src={listing.image || 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=800&auto=format&fit=crop'} alt={listing.name} />
                    <div className="listing-info">
                      <h4>{listing.name}</h4>
                      <p>{listing.description || 'Fresh harvest delivered quickly.'}</p>
                      <div className="listing-meta">
                        <span>?{listing.price}/{listing.unit}</span>
                        <span>{listing.quantity} {listing.unit} {t('market.available')}</span>
                      </div>
                      <p className="muted">
                        {t('market.farmer')}: {listing.owner?.name || t('market.farmer.fallback')}
                      </p>
                      {listing.syncStatus === 'pending' && (
                        <span className="badge offline">{t('offline.pending')}</span>
                      )}
                      <div className="qty-row">
                        <label>{t('market.qty')}</label>
                        <input
                          type="number"
                          min="1"
                          value={qtySelections[listing._id] || 1}
                          onChange={(event) =>
                            setQtySelections((prev) => ({
                              ...prev,
                              [listing._id]: Math.min(
                                listing.quantity,
                                Math.max(1, Number(event.target.value) || 1)
                              )
                            }))
                          }
                        />
                      </div>
                      <button className="btn btn-primary" onClick={() => addToCart(listing)}>
                        {t('market.add')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'subscriptions' && (
          <section className="panel">
            <div className="panel-header">
              <h2>{t('subscriptions.title')}</h2>
              <p>{t('subscriptions.subtitle')}</p>
            </div>

            <form className="listing-form" onSubmit={createSubscription}>
              <div className="form-grid">
                <div className="form-row">
                  <label>{t('subscriptions.item')}</label>
                  <input
                    type="text"
                    value={subForm.itemName}
                    onChange={updateSubForm('itemName')}
                    placeholder={t('subscriptions.item.placeholder')}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>{t('subscriptions.qty')}</label>
                  <input type="number" value={subForm.qty} onChange={updateSubForm('qty')} required />
                </div>
                <div className="form-row">
                  <label>{t('subscriptions.unit')}</label>
                  <select value={subForm.unit} onChange={updateSubForm('unit')}>
                    <option value="kg">kg</option>
                    <option value="quintal">quintal</option>
                    <option value="packet">packet</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>{t('subscriptions.day')}</label>
                  <select value={subForm.dayOfWeek} onChange={updateSubForm('dayOfWeek')}>
                    <option value="1">{t('subscriptions.day.monday')}</option>
                    <option value="2">{t('subscriptions.day.tuesday')}</option>
                    <option value="3">{t('subscriptions.day.wednesday')}</option>
                    <option value="4">{t('subscriptions.day.thursday')}</option>
                    <option value="5">{t('subscriptions.day.friday')}</option>
                    <option value="6">{t('subscriptions.day.saturday')}</option>
                    <option value="0">{t('subscriptions.day.sunday')}</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>{t('subscriptions.delivery')}</label>
                  <select value={subForm.deliveryOption} onChange={updateSubForm('deliveryOption')}>
                    <option value="platform">{t('subscriptions.delivery.platform')}</option>
                    <option value="farmer">{t('subscriptions.delivery.farmer')}</option>
                    <option value="pickup">{t('subscriptions.delivery.pickup')}</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>{t('subscriptions.payment')}</label>
                  <select value={subForm.paymentMethod} onChange={updateSubForm('paymentMethod')}>
                    <option value="cod">{t('subscriptions.payment.cod')}</option>
                    <option value="upi">{t('subscriptions.payment.upi')}</option>
                    <option value="card">{t('subscriptions.payment.card')}</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>{t('subscriptions.name')}</label>
                  <input type="text" value={subForm.name} onChange={updateSubForm('name')} required />
                </div>
                <div className="form-row">
                  <label>{t('subscriptions.phone')}</label>
                  <input type="text" value={subForm.phone} onChange={updateSubForm('phone')} required />
                </div>
                <div className="form-row span-2">
                  <label>{t('subscriptions.address1')}</label>
                  <input type="text" value={subForm.addressLine1} onChange={updateSubForm('addressLine1')} required />
                </div>
                <div className="form-row span-2">
                  <label>{t('subscriptions.address2')}</label>
                  <input type="text" value={subForm.addressLine2} onChange={updateSubForm('addressLine2')} />
                </div>
                <div className="form-row">
                  <label>{t('subscriptions.city')}</label>
                  <input type="text" value={subForm.city} onChange={updateSubForm('city')} required />
                </div>
                <div className="form-row">
                  <label>{t('subscriptions.state')}</label>
                  <input type="text" value={subForm.state} onChange={updateSubForm('state')} required />
                </div>
                <div className="form-row">
                  <label>{t('subscriptions.pincode')}</label>
                  <input type="text" value={subForm.pincode} onChange={updateSubForm('pincode')} required />
                </div>
              </div>
              {subStatus.error && <p className="form-error">{subStatus.error}</p>}
              <button className="btn btn-primary" type="submit" disabled={subStatus.loading}>
                {subStatus.loading ? t('subscriptions.saving') : t('subscriptions.create')}
              </button>
            </form>

            {subscriptions.length === 0 ? (
              <p className="muted">{t('subscriptions.empty')}</p>
            ) : (
              <div className="order-list" style={{ marginTop: '1.5rem' }}>
                {subscriptions.map((sub) => (
                  <div key={sub._id} className="order-card">
                    <div>
                      <h4>{sub.itemName} • {sub.qty} {sub.unit}</h4>
                      <p className="muted">
                        {t('subscriptions.nextRun')}: {sub.nextRunAt ? new Date(sub.nextRunAt).toLocaleDateString() : '--'}
                      </p>
                      <p className="muted">{t('subscriptions.status')}: {sub.status}</p>
                    </div>
                    <div>
                      {sub.status === 'active' ? (
                        <button className="btn btn-secondary" onClick={() => cancelSubscription(sub._id)}>
                          {t('subscriptions.cancel')}
                        </button>
                      ) : (
                        <span className="badge">{sub.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'cart' && (
          <section className="panel">
            <div className="panel-header">
              <h2>{t('cart.title')}</h2>
              <p>{t('cart.subtitle')}</p>
            </div>

            {cart.length === 0 ? (
              <p className="muted">{t('cart.empty')}</p>
            ) : (
              <div className="cart-layout">
                <div className="cart-items">
                  <div className="cart-header-row">
                    <span>{t('cart.product')}</span>
                    <span>{t('cart.price')}</span>
                    <span>{t('cart.quantity')}</span>
                    <span>{t('cart.subtotal')}</span>
                    <span></span>
                  </div>
                  {cart.map((item) => (
                    <div key={item._id} className="cart-row">
                      <div className="cart-cell cart-product">
                        <img
                          src={item.image || 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=800&auto=format&fit=crop'}
                          alt={item.name}
                        />
                        <div>
                          <h4>{item.name}</h4>
                          <p className="muted">₹{item.price}/{item.unit}</p>
                        </div>
                      </div>
                      <div className="cart-cell">₹{item.price}</div>
                      <div className="cart-cell">
                        <div className="qty-control">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                            onChange={(event) => updateQty(item._id, event.target.value)}
                            style={{ width: '90px' }}
                          />
                        </div>
                      </div>
                      <div className="cart-cell">₹{Number(item.price) * item.qty}</div>
                      <div className="cart-cell">
                        <button className="remove" onClick={() => removeItem(item._id)}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
                  <div className="cart-summary">
                    <h3>{t('cart.summary')}</h3>
                    <p>{t('cart.totalItems')}: {cart.reduce((sum, item) => sum + item.qty, 0)}</p>
                    <p className="total">
                      {t('cart.total')}: ₹{cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0)}
                    </p>
                    <div className="checkout-form">
                      <div className="checkout-section">
                        <h4>{t('checkout.details')}</h4>
                        <div className="checkout-grid">
                          <input type="text" placeholder={t('checkout.name')} value={checkout.name} onChange={updateCheckout('name')} />
                          <input type="tel" placeholder={t('checkout.phone')} value={checkout.phone} onChange={updateCheckout('phone')} />
                          <input type="text" placeholder={t('checkout.address1')} value={checkout.addressLine1} onChange={updateCheckout('addressLine1')} />
                          <input type="text" placeholder={t('checkout.address2')} value={checkout.addressLine2} onChange={updateCheckout('addressLine2')} />
                          <input type="text" placeholder={t('checkout.city')} value={checkout.city} onChange={updateCheckout('city')} />
                          <input type="text" placeholder={t('checkout.state')} value={checkout.state} onChange={updateCheckout('state')} />
                          <input type="text" placeholder={t('checkout.pincode')} value={checkout.pincode} onChange={updateCheckout('pincode')} />
                          <select value={checkout.deliveryOption} onChange={updateCheckout('deliveryOption')}>
                            <option value="platform">{t('checkout.delivery.platform')}</option>
                            <option value="farmer">{t('checkout.delivery.farmer')}</option>
                            <option value="pickup">{t('checkout.delivery.pickup')}</option>
                          </select>
                        </div>
                      </div>
                      <div className="checkout-section">
                        <h4>{t('checkout.paymentMethod')}</h4>
                        <div className="checkout-grid">
                          <select value={checkout.paymentMethod} onChange={updateCheckout('paymentMethod')}>
                            <option value="">{t('checkout.paymentMethod')}</option>
                            <option value="COD">{t('checkout.payment.cod')}</option>
                            <option value="UPI">{t('checkout.payment.upi')}</option>
                            <option value="Card">{t('checkout.payment.card')}</option>
                          </select>
                          {checkout.paymentMethod === 'UPI' && (
                            <input
                              type="text"
                              placeholder={t('checkout.upi')}
                              value={checkout.upiId}
                              onChange={updateCheckout('upiId')}
                            />
                          )}
                        </div>
                        {checkout.paymentMethod === 'Card' && (
                          <div className="card-grid">
                            <input
                              type="text"
                              placeholder={t('checkout.card.number')}
                              value={checkout.cardNumber}
                              onChange={updateCheckout('cardNumber')}
                            />
                            <input
                              type="text"
                              placeholder={t('checkout.card.name')}
                              value={checkout.cardName}
                              onChange={updateCheckout('cardName')}
                            />
                            <input
                              type="text"
                              placeholder={t('checkout.card.expiry')}
                              value={checkout.cardExpiry}
                              onChange={updateCheckout('cardExpiry')}
                            />
                            <input
                              type="text"
                              placeholder={t('checkout.card.cvv')}
                              value={checkout.cardCvv}
                              onChange={updateCheckout('cardCvv')}
                            />
                          </div>
                        )}
                        {checkoutError && <p className="form-error">{checkoutError}</p>}
                      </div>
                    </div>
                    <button className="btn btn-primary checkout-button" onClick={placeOrder}>{t('cart.place')}</button>
                  </div>
                </div>
              )}
            </section>
        )}

        {activeTab === 'orders' && (
          <section className="panel">
            <div className="panel-header">
              <h2>{t('orders.buyer.title')}</h2>
              <p>{t('orders.buyer.subtitle')}</p>
            </div>
            {orders.length === 0 ? (
              <p className="muted">{t('orders.buyer.empty')}</p>
            ) : (
              <div className="order-list">
                {orders.map((order) => (
                  <div key={order._id} className="order-card">
                    <div>
                      <h4>{t('orders.label')} #{order._id.slice(-6)}</h4>
                      <p>{new Date(order.createdAt).toLocaleString()}</p>
                      <p className="muted">{t('orders.status')}: {order.status}</p>
                      {order.source === 'subscription' && (
                        <p className="muted">{t('subscriptions.title')}</p>
                      )}
                      {order.syncStatus === 'pending' && (
                        <p className="muted">{t('offline.pending')}</p>
                      )}
                      {(order.items || []).length > 0 && (
                        <ul className="tip-list">
                          {order.items.map((item, index) => (
                            <li key={`${order._id}-${index}`}>
                              {item.name} x{item.qty} ({item.status})
                            </li>
                          ))}
                        </ul>
                      )}
                      {(order.items || []).length > 0 && (
                        <div style={{ marginTop: '0.75rem' }}>
                          {(() => {
                            const farmerMap = {};
                            (order.items || []).forEach((item) => {
                              const fid = item.farmerId?._id || item.farmerId;
                              if (!fid) return;
                              if (!farmerMap[fid]) {
                                farmerMap[fid] = { name: item.farmerName || t('review.farmer') };
                              }
                            });
                            const farmerIds = Object.keys(farmerMap);
                            return farmerIds.map((farmerId) => {
                              const existing = (order.buyerReviews || []).find(
                                (rev) => String(rev.farmer?._id || rev.farmer) === String(farmerId)
                              );
                              if (existing) {
                                return (
                                  <p key={`${order._id}-${farmerId}`} className="muted">
                                    {farmerMap[farmerId].name}: {t('review.submitted')} ({existing.rating}★)
                                  </p>
                                );
                              }
                              return (
                                <button
                                  key={`${order._id}-${farmerId}`}
                                  className="btn btn-secondary"
                                  type="button"
                                  onClick={() => setActiveReview({ orderId: order._id, farmerId, farmerName: farmerMap[farmerId].name })}
                                >
                                  {t('review.add')}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="badge">₹{order.total}</span>
                      <button className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={() => setActiveChatOrder(order._id)}>
                        Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="panel">
            <div className="panel-header">
              <h2>{t('profile.title')}</h2>
              <p>{t('profile.subtitle.buyer')}</p>
            </div>
            <div className="profile-card">
              <div>
                <h4>{user.name || 'Buyer'}</h4>
                <p>{user.email || 'email@buyer.com'}</p>
                <p>{user.phone || 'Phone not provided'}</p>
              </div>
              <div>
                <span className="badge">{user.role || 'buyer'}</span>
                {user.location?.lat && (
                  <p className="muted">Lat {user.location.lat.toFixed(3)}, Lng {user.location.lng.toFixed(3)}</p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {activeChatOrder && (
        <OrderChat orderId={activeChatOrder} onClose={() => setActiveChatOrder(null)} />
      )}

      {activeReview && (
        <div className="modal-overlay" onClick={() => setActiveReview(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('review.title')}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setActiveReview(null)}
              >
                ×
              </button>
            </div>
            <p className="muted">{t('review.order')} #{activeReview.orderId.slice(-6)}</p>
            <p className="muted">{t('review.farmer')}: {activeReview.farmerName}</p>
            <div className="review-form">
              {(() => {
                const mapKey = `${activeReview.orderId}:${activeReview.farmerId}`;
                const form = reviewForms[mapKey] || {};
                return (
                  <>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      placeholder={t('review.rating')}
                      value={form.rating || ''}
                      onChange={(event) => updateReviewField(activeReview.orderId, activeReview.farmerId, 'rating', event.target.value)}
                    />
                    <input
                      type="number"
                      min="1"
                      max="5"
                      placeholder={t('review.quality')}
                      value={form.qualityScore || ''}
                      onChange={(event) => updateReviewField(activeReview.orderId, activeReview.farmerId, 'qualityScore', event.target.value)}
                    />
                    <input
                      type="text"
                      placeholder={t('review.comment')}
                      value={form.comment || ''}
                      onChange={(event) => updateReviewField(activeReview.orderId, activeReview.farmerId, 'comment', event.target.value)}
                    />
                    {reviewError && <p className="form-error">{reviewError}</p>}
                    <button className="btn btn-primary" type="button" onClick={() => submitReview(activeReview.orderId, activeReview.farmerId)}>
                      {t('review.submit')}
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerDashboard;
