export type UserRole = 'super_admin' | 'executive_director' | 'subscription_manager' | 'restaurant_monitor' | 'chain_owner' | 'branch_manager' | 'cashier' | 'kitchen' | 'driver' | 'waiter' | 'tables' | 'reporter';

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  restaurantId?: string;
  branchId?: string;
  branchName?: string;
  status: 'active' | 'inactive';
  password?: string;
  photoURL?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  logo: string;
  phone: string;
  address: string;
  governorate: string;
  password: string;
  subscriptionDays: number;
  colors?: {
    primary: string;
    secondary: string;
  };
  status: 'active' | 'suspended' | 'expired';
  ownerUid: string;
  createdAt: any;
  subscriptionEndDate?: any;
  menuUrl?: string;
  qrCode?: string;
  connectionStatus?: 'strong' | 'weak' | 'offline';
  avgOrderTime?: number; // in seconds
  commissionEnabled?: boolean;
  commissionAmount?: number;
}

export interface ChainOwner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  restaurantIds: string[];
  status: 'active' | 'inactive';
  createdAt: any;
}

export interface Branch {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  name: string;
  address: string;
  phone: string;
  logo?: string;
  menuUrl?: string;
  status: 'active' | 'suspended';
  createdAt: any;
  ownerUid?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface RestaurantFeatures {
  restaurantId: string;
  menu: boolean;
  pos: boolean;
  tables: boolean;
  kitchen: boolean;
  delivery: boolean;
  drivers: boolean;
  reports: boolean;
  printers: boolean;
  maps: boolean;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  address?: string;
  password?: string;
  photoURL?: string;
  status: 'online' | 'offline' | 'busy';
  currentLocation?: {
    lat: number;
    lng: number;
  };
  currentOrderId?: string;
  restaurantId?: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  branchId: string;
  customerName: string;
  customerPhone: string;
  customerLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  total: number;
  createdAt: any;
  driverId?: string;
  items: any[];
}

export interface Subscription {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  plan: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  startDate: any;
  endDate: any;
  amount?: number;
  status: 'active' | 'expired' | 'pending_payment';
  customDays?: number;
}

export interface PlatformSettings {
  platformName: string;
  platformLogo: string;
  platformIcon: string;
  restaurantPlatformName: string;
  restaurantPlatformLogo: string;
  companyPhone: string;
  supportPhone: string;
  email: string;
  instagram?: string;
  youtube?: string;
  facebook?: string;
  commissionEnabled: boolean;
  systemCommissionRate: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: any;
  snapshotUrl?: string; // For the "picture" taken during sensitive actions
}
