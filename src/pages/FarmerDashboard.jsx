import React, { useEffect, useMemo, useRef, useState } from 'react';
import FarmerNavbar from '../components/FarmerNavbar.jsx';
import LoanAssistant from '../components/LoanAssistant/LoanAssistant.jsx';
import OrderChat from '../components/OrderChat.jsx';
import { API_BASE, getAuthHeaders } from '../utils/api.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getDemoGroupRequests, setDemoGroupRequests } from '../utils/demoMarketplace.js';
import {
  enqueueAction,
  getCachedFarmerListings,
  getCachedFarmerOrders,
  getCachedListings,
  isOnline,
  makeOfflineId,
  mergeListings,
  mergeOrders,
  removeQueuedAction,
  updateQueuedAction,
  setCachedFarmerListings,
  setCachedFarmerOrders,
  setCachedListings,
  syncMarketplaceQueue
} from '../utils/offlineMarketplace.js';

const defaultForm = {
  name: '',
  price: '',
  unit: 'kg',
  quantity: '',
  image: '',
  description: '',
  shelfLifeDays: ''
};

const hasDemoSession = () => {
  try {
    return JSON.parse(localStorage.getItem('kisanmitr_user'))?.demo === true;
  } catch (error) {
    return false;
  }
};

const FarmerDashboard = () => {
  const [activeTab, setActiveTab] = useState('sell');
  const [showAssistant, setShowAssistant] = useState(false);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState([]);
  const [subscriptionSelections, setSubscriptionSelections] = useState({});
  const [weather, setWeather] = useState(null);
  const { t, language } = useLanguage();
  const [status, setStatus] = useState({ loading: false, error: '' });
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [assistantView, setAssistantView] = useState('weather');
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(defaultForm);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !isOnline() || hasDemoSession());
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [groupRequests, setGroupRequests] = useState([]);
  const [groupSelections, setGroupSelections] = useState({});
  const [resources, setResources] = useState([]);
  // Use the exact selected language so backend can translate news into any supported language
  const newsLanguage = language || 'en';
  const [resourceMode, setResourceMode] = useState('buy');
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceForm, setResourceForm] = useState({
    type: 'rental',
    category: 'Tools',
    name: '',
    price: '',
    rentalDuration: '',
    brand: '',
    quality: '',
    visibility: 'farmers'
  });
  const [resourceStatus, setResourceStatus] = useState({ loading: false, error: '' });
  const [newsItems, setNewsItems] = useState([]);
  const [newsStatus, setNewsStatus] = useState({ loading: false, error: '', stale: false, cachedAt: null });
  const [expandedNewsId, setExpandedNewsId] = useState(null);
  const [groupToast, setGroupToast] = useState({ visible: false, message: '' });
  const toastTimeoutRef = useRef(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('kisanmitr_user')) || {};
    } catch (error) {
      return {};
    }
  }, []);

  const handleTabChange = (id) => {
    // Open the loans panel inline without opening the floating assistant
    if (id === 'loans') {
      setActiveTab('loans');
      return;
    }
    setActiveTab(id);
  };

  const fetchListings = async () => {
    const cached = getCachedFarmerListings(user.id);
    if (cached.length) {
      setListings(cached);
    }
    if (!isOnline() || user.demo) {
      return;
    }
    const response = await fetch(`${API_BASE}/api/products/farmer`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    const data = await response.json();
    if (response.ok) {
      const merged = mergeListings(data.products || [], getCachedFarmerListings(user.id));
      setListings(merged);
      setCachedFarmerListings(user.id, merged);
      setCachedListings(mergeListings(data.products || [], getCachedListings()));
    }
  };

  const fetchOrders = async () => {
    const cached = getCachedFarmerOrders(user.id);
    if (cached.length) {
      setOrders(cached);
    }
    if (!isOnline() || user.demo) {
      return;
    }
    const response = await fetch(`${API_BASE}/api/orders/farmer`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    const data = await response.json();
    if (response.ok) {
      const merged = mergeOrders(data.orders || [], getCachedFarmerOrders(user.id));
      setOrders(merged);
      setCachedFarmerOrders(user.id, merged);
    }
  };

  const fetchSubscriptionRequests = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/subscription-requests`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await response.json();
      if (response.ok) {
        setSubscriptionRequests(data.requests || []);
      }
    } catch (error) {
      // no-op
    }
  };

  const fetchWeather = async () => {
    if (!user.location?.lat || !user.location?.lng) return;
    const response = await fetch(
      `${API_BASE}/api/weather?lat=${user.location.lat}&lng=${user.location.lng}`
    );
    const data = await response.json();
    if (response.ok) {
      setWeather(data.summary || null);
    }
  };

  const fetchGroupRequests = async () => {
    if (user.demo) {
      setGroupRequests(getDemoGroupRequests());
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/group-fulfillment/requests`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await response.json();
      if (response.ok) {
        setGroupRequests(data.requests || []);
      }
    } catch (error) {
      // no-op
    }
  };

  const fetchResources = async () => {
    if (!user.location?.lat || !user.location?.lng) return;
    try {
      const response = await fetch(`${API_BASE}/api/resources/nearby?lat=${user.location.lat}&lng=${user.location.lng}`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await response.json();
      if (response.ok) {
        setResources(data.resources || []);
      }
    } catch (error) {
      // no-op to avoid blocking render
    }
  };

  useEffect(() => {
    if (user.demo) {
      setListings(getCachedFarmerListings(user.id));
      setOrders(getCachedFarmerOrders(user.id));
      setGroupRequests(getDemoGroupRequests());
      return undefined;
    }
    fetchListings();
    fetchOrders();
    fetchSubscriptionRequests();
    fetchWeather();
    fetchGroupRequests();
    fetchResources();
    fetchNews();
    const interval = setInterval(() => {
      fetchListings();
      fetchOrders();
      fetchGroupRequests();
      fetchSubscriptionRequests();
    }, 30000);
    const newsInterval = setInterval(() => {
      fetchNews();
    }, 5 * 60 * 1000);
    return () => {
      clearInterval(interval);
      clearInterval(newsInterval);
    };
  }, []);

  useEffect(() => {
    fetchNews();
  }, [newsLanguage]);

  useEffect(() => {
    if (!groupToast.visible) return;
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setGroupToast((prev) => ({ ...prev, visible: false }));
    }, 2500);
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [groupToast.visible]);

  useEffect(() => {
  const handleOnline = async () => {
      if (hasDemoSession()) return;
      setIsOffline(false);
      await syncMarketplaceQueue();
      fetchListings();
      fetchOrders();
      fetchSubscriptionRequests();
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

  const updateForm = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: reader.result }));
    };
    reader.onerror = () => {
      setStatus({ loading: false, error: 'Unable to read image file' });
    };
    reader.readAsDataURL(file);
  };

  const fetchNews = async () => {
    if (user.demo) {
      setNewsStatus({ loading: false, error: '', stale: false, cachedAt: null });
      return;
    }
    setNewsStatus((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetch(`${API_BASE}/api/news/agriculture?language=${newsLanguage}&limit=6`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load news');
      setNewsItems(data.items || []);
      setNewsStatus({ loading: false, error: data.error || '', stale: Boolean(data.stale), cachedAt: data.cachedAt });
    } catch (error) {
      setNewsStatus({ loading: false, error: error.message || 'Unable to load news', stale: false, cachedAt: null });
    }
  };

  const updateEditForm = (key) => (event) => {
    setEditForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleEditImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditForm((prev) => ({ ...prev, image: reader.result }));
    };
    reader.onerror = () => {
      setStatus({ loading: false, error: 'Unable to read image file' });
    };
    reader.readAsDataURL(file);
  };

  const updateGroupSelection = (requestId, key, value) => {
    setGroupSelections((prev) => ({
      ...prev,
      [requestId]: { ...prev[requestId], [key]: value }
    }));
  };

  const contributeToGroup = async (requestId) => {
    const selection = groupSelections[requestId];
    if (!selection?.productId || !selection?.qty) return;
    if (user.demo) {
      const product = listings.find((item) => item._id === selection.productId);
      const quantity = Number(selection.qty);
      if (!product || quantity <= 0 || quantity > product.quantity) {
        setGroupToast({ visible: true, message: 'Choose a quantity within the available stock.' });
        return;
      }
      const updatedRequests = getDemoGroupRequests().map((request) => {
        if (request._id !== requestId) return request;
        const contributions = [...(request.contributions || [])];
        const existing = contributions.find((item) => item.productId === product._id);
        const contribution = {
          farmerId: user.id,
          productId: product._id,
          qty: quantity,
          unitPrice: request.unitPrice,
          value: quantity * request.unitPrice
        };
        if (existing) Object.assign(existing, contribution);
        else contributions.push(contribution);
        const total = contributions.reduce((sum, item) => sum + item.qty, 0);
        return { ...request, contributions, status: total >= request.requestedQty ? 'Ready' : 'Open' };
      });
      setDemoGroupRequests(updatedRequests);
      setGroupRequests(updatedRequests);
      setGroupToast({ visible: true, message: t('group.toast.contributed') });
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/group-fulfillment/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          requestId,
          productId: selection.productId,
          qty: Number(selection.qty)
        })
      });
      const data = await response.json();
      if (response.ok) {
        setGroupRequests((prev) => prev.map((req) => (req._id === data.request._id ? data.request : req)));
        setGroupToast({ visible: true, message: t('group.toast.contributed') });
      } else {
        setGroupToast({ visible: true, message: data.message || t('group.toast.failed') });
      }
    } catch (error) {
      setGroupToast({ visible: true, message: t('group.toast.failed') });
    }
  };

  const finalizeGroup = async (requestId) => {
    if (user.demo) {
      const updatedRequests = getDemoGroupRequests().map((request) =>
        request._id === requestId && request.status === 'Ready'
          ? { ...request, status: 'Accepted' }
          : request
      );
      setDemoGroupRequests(updatedRequests);
      setGroupRequests(updatedRequests);
      setOrders((currentOrders) => {
        const updatedOrders = currentOrders.map((order) =>
          order._id === 'demo-order-group-wheat'
            ? { ...order, status: 'Accepted', items: order.items.map((item) => ({ ...item, status: 'Accepted' })) }
            : order
        );
        setCachedFarmerOrders(user.id, updatedOrders);
        return updatedOrders;
      });
      setGroupToast({ visible: true, message: 'Demo group order accepted.' });
      return;
    }
    const response = await fetch(`${API_BASE}/api/group-fulfillment/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ requestId })
    });
    if (response.ok) {
      fetchGroupRequests();
      fetchListings();
      fetchOrders();
    }
  };

  const updateResourceForm = (key) => (event) => {
    setResourceForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const createResource = async (event) => {
    event.preventDefault();
    setResourceStatus({ loading: true, error: '' });
    try {
      const response = await fetch(`${API_BASE}/api/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          type: resourceForm.type,
          category: resourceForm.category,
          name: resourceForm.name,
          price: Number(resourceForm.price),
          rentalDuration: resourceForm.type === 'rental' ? resourceForm.rentalDuration : '',
          brand: resourceForm.brand,
          quality: resourceForm.quality,
          visibility: resourceForm.visibility,
          providerName: user.name,
          providerPhone: user.phone,
          location: user.location || {}
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to add resource');
      setResources((prev) => [data.resource, ...prev]);
      setResourceForm({
        type: 'rental',
        category: 'Tools',
        name: '',
        price: '',
        rentalDuration: '',
        brand: '',
        quality: '',
        visibility: 'farmers'
      });
    } catch (error) {
      setResourceStatus({ loading: false, error: error.message || 'Unable to add resource' });
      return;
    }
    setResourceStatus({ loading: false, error: '' });
  };

  const handleAddListing = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '' });

    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        unit: form.unit,
        quantity: Number(form.quantity),
        image: form.image,
        description: form.description,
        shelfLifeDays: Number(form.shelfLifeDays)
      };

      if (!isOnline() || user.demo) {
        const offlineId = makeOfflineId('listing');
        const offlineListing = {
          _id: offlineId,
          offlineId,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
          name: form.name,
          price: Number(form.price),
          unit: form.unit,
          quantity: Number(form.quantity),
          image: form.image,
          description: form.description,
          shelfLifeDays: Number(form.shelfLifeDays),
          owner: {
            _id: user.id,
            name: user.name,
            location: user.location
          }
        };

        setListings((prev) => [offlineListing, ...prev]);
        setCachedFarmerListings(user.id, [offlineListing, ...getCachedFarmerListings(user.id)]);
        setCachedListings([offlineListing, ...getCachedListings()]);
        if (!user.demo) enqueueAction('CREATE_PRODUCT', {
          offlineId,
          farmerId: user.id,
          listing: {
            name: offlineListing.name,
            price: offlineListing.price,
            unit: offlineListing.unit,
            quantity: offlineListing.quantity,
            image: offlineListing.image,
            description: offlineListing.description,
            shelfLifeDays: offlineListing.shelfLifeDays
          }
        });
        setForm(defaultForm);
        setStatus({ loading: false, error: '' });
        return;
      }

      const response = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });

      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : {};
      if (!response.ok) {
        throw new Error(data.message || 'Unable to add listing');
      }

      setListings((prev) => [data.product, ...prev]);
      setCachedFarmerListings(user.id, [data.product, ...getCachedFarmerListings(user.id)]);
      setCachedListings([data.product, ...getCachedListings()]);
      setForm(defaultForm);
    } catch (error) {
      setStatus({ loading: false, error: error.message || 'Unable to add listing' });
      return;
    }

    setStatus({ loading: false, error: '' });
  };

  const daysLeft = (product) => {
    if (!product.shelfLifeDays || !product.createdAt) return null;
    const created = new Date(product.createdAt);
    const diffDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(product.shelfLifeDays - diffDays, 0);
  };

  const weatherSummary = useMemo(() => {
    if (!weather) return null;
    const temp = weather.temperatureC;
    const description = weather.description || 'clear';
    const rainExpected = weather.rainfallNext24hMm > 0;

    return {
      temp,
      description,
      rainExpected
    };
  }, [weather]);

  const advisory = useMemo(() => {
    if (!weatherSummary) return [];
    const items = [];
    const productNames = listings.map((item) => item.name.toLowerCase());
    if (weatherSummary.rainExpected) {
      items.push(t('advice.rain'));
      if (productNames.some((name) => name.includes('tomato') || name.includes('onion') || name.includes('chili'))) {
        items.push(t('advice.rain.produce'));
      }
    }
    if (weatherSummary.temp && weatherSummary.temp > 34) {
      items.push(t('advice.heat'));
    }
    if (weatherSummary.temp && weatherSummary.temp < 15) {
      items.push(t('advice.cold'));
    }
    if (items.length === 0) {
      items.push(t('advice.stable'));
    }
    return items;
  }, [weatherSummary, listings]);

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const prompt = chatInput.trim();

    // Quick client-side filter: encourage agriculture-related prompts only
    const isAgricultureQuery = (text) => {
      if (!text) return false;
      const s = text.toLowerCase();
      const keywords = [
        'agricult', 'farm', 'crop', 'mandi', 'market', 'irrigat', 'fertil', 'pesticid', 'harvest', 'sow', 'seeds', 'soil', 'weather', 'subsid', 'loan', 'tractor', 'dairy', 'poultry', 'storage', 'shelf', 'sowing', 'farming', 'price', 'crop', 'yield'
      ];
      const hindi = ['खेती', 'फसल', 'मंडी', 'कर्म', 'उर्वरक', 'खाद', 'बीज', 'सिंचाई', 'कटाई', 'किसान', 'सब्सिडी', 'कर्ज', 'ट्रैक्टर', 'पशुपालन', 'दूध'];
      for (const k of keywords) {
        if (s.includes(k)) return true;
      }
      for (const k of hindi) {
        if (s.includes(k)) return true;
      }
      return false;
    };

    // If prompt is not agriculture-related, return a friendly guidance message instead of calling backend
    if (!isAgricultureQuery(prompt)) {
      const guidance = t('assistant.guideAgriculture');
      setChatMessages((prev) => [...prev, { role: 'user', content: prompt }, { role: 'assistant', content: guidance }]);
      setChatInput('');
      return;
    }

    setChatMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    setChatInput('');

    const context = {
      weather: weatherSummary,
      listings: listings.map((item) => ({ name: item.name, shelfLifeDays: item.shelfLifeDays }))
    };

    try {
      const response = await fetch(`${API_BASE}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ prompt, context, language })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Assistant failed');
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: t('errors.ai') }]);
    }
  };

  const updateOrderStatus = async (orderId, action) => {
    if (!isOnline() || user.demo) {
      const updated = orders.map((order) => {
        if (order._id !== orderId) return order;
        const nextItems = (order.items || []).map((item) => {
          if (String(item.farmerId) === String(user.id)) {
            return { ...item, status: action === 'accept' ? 'Accepted' : 'Rejected' };
          }
          return item;
        });
        const statuses = nextItems.map((item) => item.status);
        const nextStatus = statuses.every((status) => status === 'Accepted')
          ? 'Accepted'
          : statuses.every((status) => status === 'Rejected')
          ? 'Rejected'
          : statuses.some((status) => status === 'Accepted' || status === 'Rejected')
          ? 'Partially Accepted'
          : 'Pending';
        return { ...order, items: nextItems, status: nextStatus, syncStatus: 'pending' };
      });
      setOrders(updated);
      setCachedFarmerOrders(user.id, updated);
      const target = orders.find((order) => order._id === orderId);
      if (target && !user.demo && !String(orderId).startsWith('offline-')) {
        enqueueAction('UPDATE_ORDER_STATUS', { orderId, action, farmerId: user.id });
      }
      return;
    }

    const response = await fetch(`${API_BASE}/api/orders/${orderId}/${action}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders() }
    });
    const data = await response.json();
    if (response.ok) {
      setOrders((prev) => {
        const next = prev.map((order) => (order._id === data.order._id ? data.order : order));
        setCachedFarmerOrders(user.id, next);
        return next;
      });
    }
  };

  const markOrderReceived = async (orderId) => {
    const response = await fetch(`${API_BASE}/api/orders/${orderId}/received-by-farmer`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders() }
    });
    const data = await response.json();
    if (response.ok) {
      setOrders((prev) => {
        const next = prev.map((order) => (order._id === data.order._id ? data.order : order));
        setCachedFarmerOrders(user.id, next);
        return next;
      });
    }
  };
  const acceptSubscriptionRequest = async (requestId) => {
    const productId = subscriptionSelections[requestId] || '';
    const response = await fetch(`${API_BASE}/api/subscription-requests/${requestId}/accept`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ productId })
    });
    if (response.ok) {
      setSubscriptionRequests((prev) => prev.filter((item) => item._id !== requestId));
      fetchOrders();
    }
  };

  const deleteListing = async (listing) => {
    const id = listing._id;
    const isPending = listing.syncStatus === 'pending';

    if (!isOnline() || user.demo) {
      const next = listings.filter((item) => item._id !== id);
      setListings(next);
      setCachedFarmerListings(user.id, next);
      setCachedListings(getCachedListings().filter((item) => item._id !== id));

      if (isPending) {
        removeQueuedAction((item) => item.type === 'CREATE_PRODUCT' && item.payload.offlineId === id);
      } else if (!user.demo) {
        enqueueAction('DELETE_PRODUCT', { productId: id, farmerId: user.id });
      }
      return;
    }

    const response = await fetch(`${API_BASE}/api/products/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
    if (response.ok) {
      const next = listings.filter((item) => item._id !== id);
      setListings(next);
      setCachedFarmerListings(user.id, next);
      setCachedListings(getCachedListings().filter((item) => item._id !== id));
    }
  };

  const startEditListing = (listing) => {
    setEditingId(listing._id);
    setEditForm({
      name: listing.name || '',
      price: listing.price || '',
      unit: listing.unit || 'kg',
      quantity: listing.quantity || '',
      image: listing.image || '',
      description: listing.description || '',
      shelfLifeDays: listing.shelfLifeDays || ''
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingId(null);
    setEditForm(defaultForm);
  };

  const handleUpdateListing = async (event) => {
    event.preventDefault();
    if (!editingId) return;
    setStatus({ loading: true, error: '' });

    const payload = {
      name: editForm.name,
      price: Number(editForm.price),
      unit: editForm.unit,
      quantity: Number(editForm.quantity),
      image: editForm.image,
      description: editForm.description,
      shelfLifeDays: Number(editForm.shelfLifeDays)
    };

    try {
      if (!isOnline() || user.demo) {
        const next = listings.map((item) =>
          item._id === editingId ? { ...item, ...payload } : item
        );
        setListings(next);
        setCachedFarmerListings(user.id, next);
        setCachedListings(
          getCachedListings().map((item) => (item._id === editingId ? { ...item, ...payload } : item))
        );

        const updatedQueue = updateQueuedAction(
          (item) => item.type === 'CREATE_PRODUCT' && item.payload.offlineId === editingId,
          (item) => ({ ...item, payload: { ...item.payload, listing: payload } })
        );

        if (!updatedQueue && !user.demo) {
          enqueueAction('UPDATE_PRODUCT', { productId: editingId, farmerId: user.id, updates: payload });
        }

        setEditingId(null);
        setEditForm(defaultForm);
        setShowEditModal(false);
        setStatus({ loading: false, error: '' });
        return;
      }

      const response = await fetch(`${API_BASE}/api/products/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : {};
      if (!response.ok) {
        throw new Error(data.message || 'Unable to update listing');
      }

      setListings((prev) => {
        const next = prev.map((item) => (item._id === data.product._id ? data.product : item));
        setCachedFarmerListings(user.id, next);
        return next;
      });
      setCachedListings(
        getCachedListings().map((item) => (item._id === data.product._id ? data.product : item))
      );

      setEditingId(null);
      setEditForm(defaultForm);
      setShowEditModal(false);
      setStatus({ loading: false, error: '' });
    } catch (error) {
      setStatus({ loading: false, error: error.message || 'Unable to update listing' });
    }
  };

  return (
    <div className="dashboard">
      <FarmerNavbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        orderCount={orders.length}
      />

      <div className="dashboard-body">
        {groupToast.visible && (
          <div className="action-toast">
            {groupToast.message}
          </div>
        )}
        {isOffline && (
          <div className="offline-banner">
            {t('offline.banner')}
          </div>
        )}
        {activeTab === 'sell' && (
          <section className="panel">
            <div className="panel-header">
              <h2>{t('sell.title')}</h2>
              <p>{t('sell.subtitle')}</p>
            </div>

            <form className="listing-form" onSubmit={handleAddListing}>
              <div className="form-grid">
                <div className="form-row">
                  <label>{t('sell.name')}</label>
                  <input type="text" value={form.name} onChange={updateForm('name')} required />
                </div>
                <div className="form-row">
                  <label>{t('sell.price')}</label>
                  <input type="number" value={form.price} onChange={updateForm('price')} required />
                </div>
                <div className="form-row">
                  <label>{t('sell.unit')}</label>
                  <select value={form.unit} onChange={updateForm('unit')}>
                    <option value="kg">{t('sell.unit.kg')}</option>
                    <option value="quintal">{t('sell.unit.quintal')}</option>
                    <option value="packet">{t('sell.unit.packet')}</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>{t('sell.quantity')}</label>
                  <input type="number" value={form.quantity} onChange={updateForm('quantity')} required />
                </div>
                <div className="form-row">
                  <label>{t('sell.shelfLife')}</label>
                  <input type="number" value={form.shelfLifeDays} onChange={updateForm('shelfLifeDays')} required />
                </div>
                <div className="form-row">
                  <label>{t('sell.image')}</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                </div>
                <div className="form-row span-2">
                  <label>{t('sell.description')}</label>
                  <textarea rows="3" value={form.description} onChange={updateForm('description')} />
                </div>
              </div>
              {status.error && <p className="form-error">{status.error}</p>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={status.loading}>
                  {status.loading ? t('sell.saving') : t('sell.publish')}
                </button>
              </div>
            </form>

            <div className="listing-preview">
              <h3>{t('sell.listings.title')}</h3>
              {listings.length === 0 ? (
                <p className="muted">{t('sell.listings.empty')}</p>
              ) : (
                <div className="listing-grid">
                  {listings.map((listing) => (
                    <div key={listing._id} className="listing-card">
                      <img src={listing.image || 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=800&auto=format&fit=crop'} alt={listing.name} />
                      <div className="listing-info">
                        <h4>{listing.name}</h4>
                        <p>{listing.description || 'Fresh produce ready for pickup.'}</p>
                        <div className="listing-meta">
                          <span>₹{listing.price}/{listing.unit}</span>
                          <span>{listing.quantity} available</span>
                        </div>
                        {listing.syncStatus === 'pending' && (
                          <span className="badge offline">{t('offline.pending')}</span>
                        )}
                        <div className="listing-actions">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => startEditListing(listing)}
                          >
                            {t('sell.edit')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => deleteListing(listing)}
                          >
                            {t('sell.delete')}
                          </button>
                        </div>
                        {daysLeft(listing) !== null && (
                          <span className="badge">{daysLeft(listing)} {t('sell.spoilage')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'orders' && (
          <>
            <div className="panel-header">
              <h2>{t('orders.title')}</h2>
              <p>{t('orders.subtitle')}</p>
            </div>
            {(() => {
              const mine = orders
                .map((order) => ({
                  ...order,
                  myItems: order.items?.filter((item) => String(item.farmerId) === String(user.id)) || []
                }))
                .filter((order) => order.myItems.length > 0);

              const received = mine.filter((order) =>
                order.myItems.some((item) => item.status === 'Pending')
              );
              const accepted = mine.filter((order) =>
                order.myItems.every((item) => item.status === 'Accepted')
              );

              const renderOrder = (order, showActions, extraActions) => {
                const buyerName = order.buyer?.name || order.buyerName || 'Buyer';
                return (
                  <div key={order._id} className="order-card">
                    <div>
                      <h4>{buyerName}</h4>
                      <p>{new Date(order.createdAt).toLocaleString()}</p>
                      <p className="muted">{t('orders.status')}: {order.status}</p>
                      {order.source === 'subscription' && (
                        <p className="muted">{t('subscriptions.title')}</p>
                      )}
                      {order.syncStatus === 'pending' && (
                        <p className="muted">{t('offline.pending')}</p>
                      )}
                      <ul className="tip-list">
                        {order.myItems.map((item, index) => (
                          <li key={`${order._id}-${index}`}>
                            {item.name} x{item.qty} ({item.status})
                          </li>
                        ))}
                      </ul>
                      {order.farmerReviews?.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <p className="muted">{t('review.received')}:</p>
                          {order.farmerReviews.map((review, idx) => (
                            <p key={`${order._id}-review-${idx}`} className="muted">
                              {review.rating}★ {review.comment ? `- ${review.comment}` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    {showActions && (
                      <div>
                        <button className="btn btn-secondary" onClick={() => updateOrderStatus(order._id, 'accept')}>
                          {t('orders.accept')}
                        </button>
                        <button className="btn btn-secondary" onClick={() => updateOrderStatus(order._id, 'reject')}>
                          {t('orders.reject')}
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ marginLeft: '0.5rem' }}
                          onClick={() => setActiveChatOrder(order._id)}
                        >
                          Chat
                        </button>
                      </div>
                    )}
                    {!showActions && (
                      <div>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setActiveChatOrder(order._id)}
                        >
                          Chat
                        </button>
                        {extraActions}
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <>
                  <div className="grid-2">
                  <section className="panel">
                    <h3>{t('orders.received.title')}</h3>
                    {received.length === 0 ? (
                      <p className="muted">{t('orders.empty')}</p>
                    ) : (
                      <div className="order-list">
                        {received.map((order) => renderOrder(order, true))}
                      </div>
                    )}
                  </section>
                  <section className="panel">
                    <h3>{t('orders.accepted.title')}</h3>
                    {accepted.length === 0 ? (
                      <p className="muted">{t('orders.empty')}</p>
                    ) : (
                      <div className="order-list">
                        {accepted.map((order) => {
                          const canMarkReceived =
                            order.status !== 'Completed' &&
                            !['Delivered', 'Picked Up'].includes(order.deliveryStatus);
                          return renderOrder(
                            order,
                            false,
                            canMarkReceived ? (
                              <button
                                className="btn btn-secondary"
                                style={{ marginTop: '0.5rem' }}
                                onClick={() => markOrderReceived(order._id)}
                              >
                                {t('orders.received.mark')}
                              </button>
                            ) : null
                          );
                        })}
                      </div>
                    )}
                  </section>
                  </div>
                  <section className="panel" style={{ marginTop: '1.5rem' }}>
                    <div className="panel-header">
                      <h3>{t('subscriptions.requests.title')}</h3>
                      <p>{t('subscriptions.requests.subtitle')}</p>
                    </div>
                    {subscriptionRequests.length === 0 ? (
                      <p className="muted">{t('subscriptions.requests.empty')}</p>
                    ) : (
                      <div className="order-list">
                        {subscriptionRequests.map((request) => {
                          const availableListings = listings || [];
                          return (
                            <div key={request._id} className="order-card">
                              <div>
                                <h4>{request.itemName} • {request.qty} {request.unit}</h4>
                                <p className="muted">
                                  {t('subscriptions.requests.delivery')} {request.deliveryOption}
                                </p>
                                <p className="muted">
                                  {t('subscriptions.requests.address')} {request.buyerDetails?.city}, {request.buyerDetails?.state}
                                </p>
                                {availableListings.length > 0 && (
                                  <div className="form-row" style={{ marginTop: '0.5rem' }}>
                                    <label>{t('subscriptions.requests.listing')}</label>
                                    <select
                                      value={subscriptionSelections[request._id] || ''}
                                      onChange={(event) =>
                                        setSubscriptionSelections((prev) => ({
                                          ...prev,
                                          [request._id]: event.target.value
                                        }))
                                      }
                                    >
                                      <option value="">{t('subscriptions.requests.listing.auto')}</option>
                                      {availableListings.map((listing) => (
                                        <option key={listing._id} value={listing._id}>
                                          {listing.name} • {listing.price}/{listing.unit}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                              <div>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => acceptSubscriptionRequest(request._id)}
                                >
                                  {t('subscriptions.requests.accept')}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </>
              );
            })()}
          </>
        )}

        {activeTab === 'group' && (
          <section className="panel">
            <div className="panel-header">
              <h2>{t('farmer.nav.group')}</h2>
              <p>Collaborate with nearby farmers to fulfill large orders.</p>
            </div>
            {groupRequests.length === 0 ? (
              <p className="muted">No group fulfillment requests right now.</p>
            ) : (
              <div className="order-list">
                {groupRequests.map((request) => {
                  const remaining = request.requestedQty - (request.contributions || []).reduce((sum, c) => sum + c.qty, 0);
                  const matchingProducts = listings.filter((product) =>
                    product.name?.toLowerCase() === request.productName?.toLowerCase() &&
                    (product.grade || 'Standard') === (request.grade || 'Standard') &&
                    product.price >= request.priceMin &&
                    product.price <= request.priceMax
                  );
                  return (
                    <div key={request._id} className="order-card">
                      <div>
                        <h4>{request.productName} ({request.grade})</h4>
                        <p className="muted">Requested: {request.requestedQty} {request.unit}</p>
                        <p className="muted">Remaining: {Math.max(remaining, 0)} {request.unit}</p>
                        <p className="muted">Status: {request.status}</p>
                        {request.contributions?.length > 0 && (
                          <ul className="tip-list">
                            {request.contributions.map((c, idx) => (
                              <li key={`${request._id}-${idx}`}>
                                {c.qty} {request.unit} → ₹{c.value}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div style={{ minWidth: '260px' }}>
                        <select
                          value={groupSelections[request._id]?.productId || ''}
                          onChange={(event) => updateGroupSelection(request._id, 'productId', event.target.value)}
                        >
                          <option value="">Select your stock</option>
                          {matchingProducts.map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.name} ({product.quantity} {product.unit} avail)
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Qty to contribute"
                          value={groupSelections[request._id]?.qty || ''}
                          onChange={(event) => updateGroupSelection(request._id, 'qty', event.target.value)}
                          style={{ marginTop: '0.5rem' }}
                        />
                        <button className="btn btn-secondary" onClick={() => contributeToGroup(request._id)} style={{ marginTop: '0.5rem' }}>
                          Contribute
                        </button>
                        {request.status === 'Ready' && (
                          <button className="btn btn-primary" onClick={() => finalizeGroup(request._id)} style={{ marginTop: '0.5rem' }}>
                            Finalize Group Acceptance
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'resources' && (
          <section className="panel">
            <div className="panel-header">
              <h2>{t('resources.title')}</h2>
              <p>{t('resources.subtitle')}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <button
                type="button"
                className={`btn ${resourceMode === 'buy' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setResourceMode('buy')}
              >
                {t('resources.mode.buy')}
              </button>
              <button
                type="button"
                className={`btn ${resourceMode === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setResourceMode('add')}
              >
                {t('resources.mode.add')}
              </button>
            </div>

            {resourceMode === 'add' ? (
              <form className="listing-form" onSubmit={createResource}>
                <div className="form-grid">
                  <div className="form-row">
                    <label>{t('resources.list.title')}</label>
                    <input
                      type="text"
                      value={resourceForm.name}
                      onChange={updateResourceForm('name')}
                      placeholder={t('resources.list.placeholder')}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label>{t('resources.list.type')}</label>
                    <select value={resourceForm.type} onChange={updateResourceForm('type')}>
                      <option value="rental">{t('resources.list.rental')}</option>
                      <option value="buy">{t('resources.list.buy')}</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label>{t('resources.list.category')}</label>
                    <select value={resourceForm.category} onChange={updateResourceForm('category')}>
                      <option value="Tools">{t('resources.list.tools')}</option>
                      <option value="Machinery">{t('resources.list.machinery')}</option>
                      <option value="Equipment">{t('resources.list.equipment')}</option>
                      <option value="Seeds">{t('resources.list.seeds')}</option>
                      <option value="Fertilizers">{t('resources.list.fertilizers')}</option>
                      <option value="Pesticides">{t('resources.list.pesticides')}</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label>{t('resources.list.price')}</label>
                    <input type="number" value={resourceForm.price} onChange={updateResourceForm('price')} required />
                  </div>
                  {resourceForm.type === 'rental' && (
                    <div className="form-row">
                      <label>{t('resources.list.duration')}</label>
                      <input
                        type="text"
                        value={resourceForm.rentalDuration}
                        onChange={updateResourceForm('rentalDuration')}
                        placeholder={t('resources.list.duration.placeholder')}
                      />
                    </div>
                  )}
                  <div className="form-row">
                    <label>{t('resources.list.brand')}</label>
                    <input type="text" value={resourceForm.brand} onChange={updateResourceForm('brand')} />
                  </div>
                  <div className="form-row">
                    <label>{t('resources.list.quality')}</label>
                    <input type="text" value={resourceForm.quality} onChange={updateResourceForm('quality')} />
                  </div>
                  <div className="form-row">
                    <label>{t('resources.list.visibility')}</label>
                    <select value={resourceForm.visibility} onChange={updateResourceForm('visibility')}>
                      <option value="farmers">{t('resources.list.visibility.farmers')}</option>
                      <option value="all">{t('resources.list.visibility.all')}</option>
                    </select>
                  </div>
                </div>
                {resourceStatus.error && <p className="form-error">{resourceStatus.error}</p>}
                <button className="btn btn-primary" type="submit" disabled={resourceStatus.loading}>
                  {resourceStatus.loading ? t('resources.list.saving') : t('resources.list.publish')}
                </button>
              </form>
            ) : (
              <div className="panel">
                <div className="form-row">
                  <label>{t('resources.search')}</label>
                  <input
                    type="text"
                    value={resourceSearch}
                    onChange={(event) => setResourceSearch(event.target.value)}
                    placeholder={t('resources.search.placeholder')}
                  />
                </div>
              </div>
            )}

            {resources.length === 0 ? (
              <p className="muted">{t('resources.empty')}</p>
            ) : (
              <div className="listing-grid">
                {resources
                  .filter((resource) => {
                    if (resourceMode !== 'buy') return true;
                    const needle = resourceSearch.trim().toLowerCase();
                    if (!needle) return true;
                    return (
                      resource.name?.toLowerCase().includes(needle) ||
                      resource.category?.toLowerCase().includes(needle) ||
                      resource.brand?.toLowerCase().includes(needle)
                    );
                  })
                  .map((resource) => (
                    <div key={resource._id} className="listing-card">
                      <div className="listing-info">
                        <h4>{resource.name}</h4>
                        <p>{resource.category} • {resource.type === 'rental' ? t('resources.list.rental') : t('resources.list.buy')}</p>
                        <div className="listing-meta">
                          <span>₹{resource.price}{resource.type === 'rental' && resource.rentalDuration ? `/${resource.rentalDuration}` : ''}</span>
                          <span>{resource.distanceKm ? `${resource.distanceKm.toFixed(1)} km` : t('resources.nearby')}</span>
                        </div>
                        {resource.location?.city || resource.location?.state ? (
                          <p className="muted">
                            {t('resources.location')}: {[resource.location?.city, resource.location?.state].filter(Boolean).join(', ')}
                          </p>
                        ) : null}
                        <p className="muted">{t('resources.provider')}: {resource.providerName || t('resources.provider.fallback')}</p>
                        {resource.onlineUrl ? (
                          <a className="btn btn-secondary" href={resource.onlineUrl} target="_blank" rel="noreferrer">
                            {t('resources.buyOnline')}
                          </a>
                        ) : (
                          <p className="muted">{t('resources.contact')}: {resource.providerPhone || t('resources.comparison.na')}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'assistant' && (
          <section className="panel">
            <div className="panel-header">
              <h2>{t('assistant.title')}</h2>
              <p>{t('assistant.subtitle')}</p>
            </div>

            <div className="assistant-panel">
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn ${assistantView === 'weather' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: '180px', height: '44px' }}
                  onClick={() => setAssistantView('weather')}
                >
                  {t('assistant.weather.title')}
                </button>
                <button
                  type="button"
                  className={`btn ${assistantView === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: '180px', height: '44px' }}
                  onClick={() => setAssistantView('chat')}
                >
                  {t('assistant.title')}
                </button>
                <button
                  type="button"
                  className={`btn ${assistantView === 'news' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: '180px', height: '44px' }}
                  onClick={() => setAssistantView('news')}
                >
                  {t('news.title')}
                </button>
              </div>

              {assistantView === 'weather' && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4>{t('assistant.weather.title')}</h4>
                  {weatherSummary ? (
                    <div className="weather-card">
                      <p><strong>{t('weather.now')}:</strong> {weatherSummary.description}, {weatherSummary.temp}°C</p>
                      <p className="muted">
                        {t('weather.humidity')}: {weather.humidity}% | {t('weather.rain24')}: {weather.rainfallNext24hMm} mm
                      </p>
                      {weather.alerts?.length > 0 && (
                        <p className="muted">{t('weather.alerts')}: {weather.alerts.join(', ')}</p>
                      )}
                      <ul className="tip-list">
                        {advisory.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="muted">{t('assistant.weather.none')}</p>
                  )}
                </div>
              )}

              {assistantView === 'chat' && (
                <div className="assistant-message" style={{ marginTop: '1.5rem' }}>
                  <label>{t('assistant.ask')}</label>
                  <div className="chat-box">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`chat-bubble ${msg.role}`}>
                        {msg.content}
                      </div>
                    ))}
                  </div>
                  <textarea
                    rows="3"
                    placeholder={t('assistant.placeholder')}
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                  />
                  <div className="chat-actions">
                    <button className="btn btn-primary" type="button" onClick={sendChat}>
                      {t('assistant.send')}
                    </button>
                  </div>
                </div>
              )}

              {assistantView === 'news' && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div className="panel-header">
                    <h3>{t('news.title')}</h3>
                    <p>{t('news.subtitle')}</p>
                  </div>
                  {newsStatus.stale && (
                    <p className="muted">{t('news.stale')}</p>
                  )}
                  {newsStatus.error && (
                    <p className="form-error">{newsStatus.error}</p>
                  )}
                  {newsStatus.loading ? (
                    <div className="listing-grid">
                      {[1, 2, 3].map((idx) => (
                        <div key={`news-skeleton-${idx}`} className="listing-card">
                          <div className="listing-info">
                            <div className="skeleton skeleton-title" />
                            <div className="skeleton skeleton-meta" />
                            <div className="skeleton skeleton-line" />
                            <div className="skeleton skeleton-line" />
                            <div className="skeleton skeleton-badge" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : newsItems.length === 0 ? (
                    <p className="muted">{t('news.empty')}</p>
                  ) : (
                    <div className="listing-grid">
                      {newsItems.map((item) => {
                        const impact = item.impact || {};
                        const impactText = typeof impact === 'string' ? impact : impact.impact;
                        const accessList = typeof impact === 'object' && Array.isArray(impact.access) ? impact.access : [];
                        const positiveList = typeof impact === 'object' && Array.isArray(impact.positive) ? impact.positive : [];
                        const negativeList = typeof impact === 'object' && Array.isArray(impact.negative) ? impact.negative : [];
                        const isExpanded = expandedNewsId === item.id;
                        return (
                          <div key={item.id} className="listing-card">
                            <div className="listing-info">
                              <button
                                type="button"
                                className="news-title-button"
                                onClick={() => setExpandedNewsId((prev) => (prev === item.id ? null : item.id))}
                              >
                                <h4>{item.title}</h4>
                                <span className="muted">{isExpanded ? t('news.collapse') : t('news.expand')}</span>
                              </button>
                              <p className="muted">
                                {item.source} • {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ''}
                              </p>
                              <p>{item.summary || t('news.summary')}</p>
                              <div className="bulk-tiers" style={{ marginTop: '0.75rem' }}>
                                <span className="badge">{t('news.impact.title')}</span>
                              </div>
                              <p className="muted" style={{ marginTop: '0.5rem' }}>
                                {impactText || t('news.impact.unavailable')}
                              </p>
                              {isExpanded && (accessList.length || positiveList.length || negativeList.length) && (
                                <div className="impact-grid" style={{ marginTop: '0.6rem' }}>
                                  {accessList.length > 0 && (
                                    <div className="impact-block">
                                      <span className="impact-label">{t('news.impact.access')}</span>
                                      <ul className="impact-list">
                                        {accessList.map((value, idx) => (
                                          <li key={`access-${item.id}-${idx}`}>{value}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {positiveList.length > 0 && (
                                    <div className="impact-block">
                                      <span className="impact-label">{t('news.impact.positive')}</span>
                                      <ul className="impact-list">
                                        {positiveList.map((value, idx) => (
                                          <li key={`positive-${item.id}-${idx}`}>{value}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {negativeList.length > 0 && (
                                    <div className="impact-block">
                                      <span className="impact-label">{t('news.impact.negative')}</span>
                                      <ul className="impact-list">
                                        {negativeList.map((value, idx) => (
                                          <li key={`negative-${item.id}-${idx}`}>{value}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                {item.url && (
                                  <a className="btn btn-secondary" href={item.url} target="_blank" rel="noreferrer">
                                    {t('news.readMore')}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'loans' && (
          <section className="panel">
            <div className="panel-header">
              <h2>{t('loans.title')}</h2>
              <p>{t('loans.subtitle')}</p>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <LoanAssistant onClose={() => setActiveTab('sell')} inline />
            </div>
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="panel">
            <div className="panel-header">
              <h2>{t('profile.title')}</h2>
              <p>{t('profile.subtitle.farmer')}</p>
            </div>
            <div className="profile-card">
              <div>
                <h4>{user.name || 'Farmer'}</h4>
                <p>{user.email || 'email@farmer.com'}</p>
                <p>{user.phone || 'Phone not provided'}</p>
              </div>
              <div>
                <span className="badge">{user.role || 'farmer'}</span>
                {user.location?.lat && (
                  <p className="muted">Lat {user.location.lat.toFixed(3)}, Lng {user.location.lng.toFixed(3)}</p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('sell.update')}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={closeEditModal}
              >
                ×
              </button>
            </div>
            <form className="listing-form" onSubmit={handleUpdateListing}>
              <div className="form-grid">
                <div className="form-row">
                  <label>{t('sell.name')}</label>
                  <input type="text" value={editForm.name} onChange={updateEditForm('name')} required />
                </div>
                <div className="form-row">
                  <label>{t('sell.price')}</label>
                  <input type="number" value={editForm.price} onChange={updateEditForm('price')} required />
                </div>
                <div className="form-row">
                  <label>{t('sell.unit')}</label>
                  <select value={editForm.unit} onChange={updateEditForm('unit')}>
                    <option value="kg">{t('sell.unit.kg')}</option>
                    <option value="quintal">{t('sell.unit.quintal')}</option>
                    <option value="packet">{t('sell.unit.packet')}</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>{t('sell.quantity')}</label>
                  <input type="number" value={editForm.quantity} onChange={updateEditForm('quantity')} required />
                </div>
                <div className="form-row">
                  <label>{t('sell.shelfLife')}</label>
                  <input type="number" value={editForm.shelfLifeDays} onChange={updateEditForm('shelfLifeDays')} required />
                </div>
                <div className="form-row">
                  <label>{t('sell.image')}</label>
                  <input type="file" accept="image/*" onChange={handleEditImageUpload} />
                </div>
                <div className="form-row span-2">
                  <label>{t('sell.description')}</label>
                  <textarea rows="3" value={editForm.description} onChange={updateEditForm('description')} />
                </div>
              </div>
              {status.error && <p className="form-error">{status.error}</p>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={status.loading}>
                  {status.loading ? t('sell.saving') : t('sell.update')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeEditModal}
                >
                  {t('sell.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!showAssistant && (
        <button
          className={`loan-assistant-fab ${activeTab === 'loans' ? 'on-loans' : ''}`}
          onClick={() => setShowAssistant(true)}
        >
          <span className="fab-icon">🌾</span>
          <span className="fab-text">{t('assistant.title')}</span>
        </button>
      )}

      {showAssistant && (
        <div className="loan-assistant">
            <div className="loan-assistant-header">
              <h2 className="loan-assistant-title">
                <span className="title-icon">🌾</span>
                {t('assistant.title')}
              </h2>
              <button className="close-btn" onClick={() => setShowAssistant(false)} aria-label="Close">×</button>
            </div>

            <div className="loan-assistant-content">
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn ${assistantView === 'weather' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: '180px', height: '44px' }}
                  onClick={() => setAssistantView('weather')}
                >
                  {t('assistant.weather.title')}
                </button>
                <button
                  type="button"
                  className={`btn ${assistantView === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: '180px', height: '44px' }}
                  onClick={() => setAssistantView('chat')}
                >
                  {t('assistant.title')}
                </button>
                <button
                  type="button"
                  className={`btn ${assistantView === 'news' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: '180px', height: '44px' }}
                  onClick={() => setAssistantView('news')}
                >
                  {t('news.title')}
                </button>
              </div>

              {assistantView === 'weather' && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4>{t('assistant.weather.title')}</h4>
                  {weatherSummary ? (
                    <div className="weather-card">
                      <p><strong>{t('weather.now')}:</strong> {weatherSummary.description}, {weatherSummary.temp}°C</p>
                      <p className="muted">
                        {t('weather.humidity')}: {weather.humidity}% | {t('weather.rain24')}: {weather.rainfallNext24hMm} mm
                      </p>
                      {weather.alerts?.length > 0 && (
                        <p className="muted">{t('weather.alerts')}: {weather.alerts.join(', ')}</p>
                      )}
                      <ul className="tip-list">
                        {advisory.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="muted">{t('assistant.weather.none')}</p>
                  )}
                </div>
              )}

              {assistantView === 'chat' && (
                <div className="assistant-message" style={{ marginTop: '1.5rem' }}>
                  <label>{t('assistant.ask')}</label>
                  <div className="chat-box">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`chat-bubble ${msg.role}`}>
                        {msg.content}
                      </div>
                    ))}
                  </div>
                  <textarea
                    rows="3"
                    placeholder={t('assistant.placeholder')}
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                  />
                  <div className="chat-actions">
                    <button className="btn btn-primary" type="button" onClick={sendChat}>
                      {t('assistant.send')}
                    </button>
                  </div>
                </div>
              )}

              {assistantView === 'news' && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div className="panel-header">
                    <h3>{t('news.title')}</h3>
                    <p>{t('news.subtitle')}</p>
                  </div>
                  {newsStatus.stale && (
                    <p className="muted">{t('news.stale')}</p>
                  )}
                  {newsStatus.error && (
                    <p className="form-error">{newsStatus.error}</p>
                  )}
                  {newsStatus.loading ? (
                    <div className="listing-grid">
                      {[1, 2, 3].map((idx) => (
                        <div key={`news-skeleton-${idx}`} className="listing-card">
                          <div className="listing-info">
                            <div className="skeleton skeleton-title" />
                            <div className="skeleton skeleton-meta" />
                            <div className="skeleton skeleton-line" />
                            <div className="skeleton skeleton-line" />
                            <div className="skeleton skeleton-badge" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : newsItems.length === 0 ? (
                    <p className="muted">{t('news.empty')}</p>
                  ) : (
                    <div className="listing-grid">
                      {newsItems.map((item) => {
                        const impact = item.impact || {};
                        const impactText = typeof impact === 'string' ? impact : impact.impact;
                        const accessList = typeof impact === 'object' && Array.isArray(impact.access) ? impact.access : [];
                        const positiveList = typeof impact === 'object' && Array.isArray(impact.positive) ? impact.positive : [];
                        const negativeList = typeof impact === 'object' && Array.isArray(impact.negative) ? impact.negative : [];
                        const isExpanded = expandedNewsId === item.id;
                        return (
                          <div key={item.id} className="listing-card">
                            <div className="listing-info">
                              <button
                                type="button"
                                className="news-title-button"
                                onClick={() => setExpandedNewsId((prev) => (prev === item.id ? null : item.id))}
                              >
                                <h4>{item.title}</h4>
                                <span className="muted">{isExpanded ? t('news.collapse') : t('news.expand')}</span>
                              </button>
                              <p className="muted">
                                {item.source} • {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ''}
                              </p>
                              <p>{item.summary || t('news.summary')}</p>
                              <div className="bulk-tiers" style={{ marginTop: '0.75rem' }}>
                                <span className="badge">{t('news.impact.title')}</span>
                              </div>
                              <p className="muted" style={{ marginTop: '0.5rem' }}>
                                {impactText || t('news.impact.unavailable')}
                              </p>
                              {isExpanded && (accessList.length || positiveList.length || negativeList.length) && (
                                <div className="impact-grid" style={{ marginTop: '0.6rem' }}>
                                  {accessList.length > 0 && (
                                    <div className="impact-block">
                                      <span className="impact-label">{t('news.impact.access')}</span>
                                      <ul className="impact-list">
                                        {accessList.map((value, idx) => (
                                          <li key={`access-${item.id}-${idx}`}>{value}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {positiveList.length > 0 && (
                                    <div className="impact-block">
                                      <span className="impact-label">{t('news.impact.positive')}</span>
                                      <ul className="impact-list">
                                        {positiveList.map((value, idx) => (
                                          <li key={`positive-${item.id}-${idx}`}>{value}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {negativeList.length > 0 && (
                                    <div className="impact-block">
                                      <span className="impact-label">{t('news.impact.negative')}</span>
                                      <ul className="impact-list">
                                        {negativeList.map((value, idx) => (
                                          <li key={`negative-${item.id}-${idx}`}>{value}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                {item.url && (
                                  <a className="btn btn-secondary" href={item.url} target="_blank" rel="noreferrer">
                                    {t('news.readMore')}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
      )}

      {activeChatOrder && (
        <OrderChat orderId={activeChatOrder} onClose={() => setActiveChatOrder(null)} />
      )}
    </div>
  );
};
export default FarmerDashboard;
