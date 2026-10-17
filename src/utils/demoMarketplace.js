import { setCachedBuyerOrders, setCachedFarmerListings, setCachedFarmerOrders, setCachedListings } from './offlineMarketplace.js';

const GROUP_KEY = 'kisanmitr_demo_group_requests';
const farmerId = 'demo-farmer';
const buyerId = 'demo-buyer';
const groupOrderId = 'demo-order-group-wheat';
const productIds = {
  wheatAsha: 'demo-product-wheat-asha',
  wheatRavi: 'demo-product-wheat-ravi',
  tomatoes: 'demo-product-tomatoes',
  spinach: 'demo-product-spinach'
};

export const seedDemoMarketplace = () => {
  const farmerListings = [
    {
      _id: productIds.wheatAsha,
      name: 'Wheat',
      grade: 'A',
      price: 28,
      unit: 'kg',
      quantity: 40,
      minOrderQty: 1,
      description: 'Fresh local wheat. Demo listing from Asha Farm.',
      shelfLifeDays: 180,
      owner: { _id: farmerId, name: 'Demo Farmer' }
    },
    {
      _id: productIds.tomatoes,
      name: 'Tomatoes',
      grade: 'Standard',
      price: 32,
      unit: 'kg',
      quantity: 45,
      minOrderQty: 1,
      description: 'Fresh red tomatoes, harvested nearby.',
      shelfLifeDays: 5,
      owner: { _id: farmerId, name: 'Demo Farmer' }
    },
    {
      _id: productIds.spinach,
      name: 'Spinach',
      grade: 'Standard',
      price: 24,
      unit: 'bunch',
      quantity: 35,
      minOrderQty: 1,
      description: 'Fresh leafy spinach, harvested this morning.',
      shelfLifeDays: 3,
      owner: { _id: farmerId, name: 'Demo Farmer' }
    }
  ];

  const otherListings = [
    {
      _id: productIds.wheatRavi,
      name: 'Wheat',
      grade: 'A',
      price: 29,
      unit: 'kg',
      quantity: 25,
      minOrderQty: 1,
      description: 'Matching Grade A wheat available for group supply.',
      shelfLifeDays: 180,
      owner: { _id: 'demo-farmer-ravi', name: 'Demo Farmer Ravi' }
    }
  ];

  const groupRequest = {
    _id: 'demo-group-wheat',
    orderId: groupOrderId,
    productName: 'Wheat',
    grade: 'A',
    unit: 'kg',
    requestedQty: 60,
    unitPrice: 28,
    priceMin: 25.2,
    priceMax: 30.8,
    deliveryArea: 'Gurugram, Haryana',
    status: 'Open',
    contributions: [
      {
        farmerId: 'demo-farmer-ravi',
        productId: productIds.wheatRavi,
        qty: 20,
        unitPrice: 28,
        value: 560
      }
    ]
  };

  const groupOrder = {
    _id: groupOrderId,
    createdAt: new Date().toISOString(),
    buyerDetails: { name: 'Green Basket Cafe', city: 'Gurugram', state: 'Haryana' },
    deliveryOption: 'platform',
    status: 'Pending Group Fulfillment',
    total: 1680,
    items: [{
      product: productIds.wheatAsha,
      name: 'Wheat',
      grade: 'A',
      price: 28,
      unitPrice: 28,
      lineTotal: 1680,
      unit: 'kg',
      qty: 60,
      farmerId,
      farmerName: 'Demo Farmer',
      status: 'Group Pending'
    }]
  };

  const tomatoOrder = {
    _id: 'demo-order-tomatoes',
    createdAt: new Date().toISOString(),
    buyerDetails: { name: 'Green Basket Cafe', city: 'Gurugram', state: 'Haryana' },
    deliveryOption: 'pickup',
    status: 'Pending',
    total: 320,
    items: [{
      product: productIds.tomatoes,
      name: 'Tomatoes',
      grade: 'Standard',
      price: 32,
      unitPrice: 32,
      lineTotal: 320,
      unit: 'kg',
      qty: 10,
      farmerId,
      farmerName: 'Demo Farmer',
      status: 'Pending'
    }]
  };

  setCachedListings([...farmerListings, ...otherListings]);
  setCachedFarmerListings(farmerId, farmerListings);
  setCachedFarmerOrders(farmerId, [groupOrder, tomatoOrder]);
  setCachedBuyerOrders(buyerId, [groupOrder, tomatoOrder]);
  localStorage.setItem(GROUP_KEY, JSON.stringify([groupRequest]));
};

export const getDemoGroupRequests = () => {
  try {
    return JSON.parse(localStorage.getItem(GROUP_KEY) || '[]');
  } catch (error) {
    return [];
  }
};

export const setDemoGroupRequests = (requests) => {
  localStorage.setItem(GROUP_KEY, JSON.stringify(requests));
};
