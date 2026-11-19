import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  timestamp?: number;
  read: boolean;
  targetScreen?: string;
  type?: 'BILLING' | 'PAYMENT' | 'PURCHASE' | 'KOT' | 'INVENTORY' | 'STAFF' | 'GENERAL' | 'PLAN';
}

const STORAGE_KEY = '@hotel_notifications';

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'New Bill Settled',
    desc: 'Table 03 bill payment of ₹1,470 completed successfully.',
    time: '2m ago',
    timestamp: Date.now() - 2 * 60 * 1000,
    read: false,
    targetScreen: 'Billing',
    type: 'BILLING',
  },
  {
    id: '2',
    title: 'KOT Dispatched',
    desc: 'Order #KOT-104 dispatched to kitchen for Table 02.',
    time: '5m ago',
    timestamp: Date.now() - 5 * 60 * 1000,
    read: false,
    targetScreen: 'KOT',
    type: 'KOT',
  },
  {
    id: '3',
    title: 'Purchase Order Created',
    desc: 'PO-2026-102 created for Namdev Provisions (₹32,340).',
    time: '12m ago',
    timestamp: Date.now() - 12 * 60 * 1000,
    read: false,
    targetScreen: 'Purchase',
    type: 'PURCHASE',
  },
  {
    id: '4',
    title: 'Payment Received',
    desc: 'UPI payment of ₹2,499 received via PhonePe.',
    time: '25m ago',
    timestamp: Date.now() - 25 * 60 * 1000,
    read: true,
    targetScreen: 'Payments',
    type: 'PAYMENT',
  },
  {
    id: '5',
    title: 'Low Inventory Alert',
    desc: 'Amul Salted Butter & Paneer stock below reorder level.',
    time: '35m ago',
    timestamp: Date.now() - 35 * 60 * 1000,
    read: true,
    targetScreen: 'Purchase',
    type: 'INVENTORY',
  },
];

class NotificationManager {
  private notifications: NotificationItem[] = [];
  private listeners: Array<(items: NotificationItem[]) => void> = [];
  private isLoaded = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.notifications = parsed;
        } else {
          this.notifications = DEFAULT_NOTIFICATIONS;
        }
      } else {
        this.notifications = DEFAULT_NOTIFICATIONS;
        await this.persist();
      }
    } catch {
      this.notifications = DEFAULT_NOTIFICATIONS;
    }
    this.isLoaded = true;
    this.notify();
    this.checkDailyPlanNotification();
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
    } catch (e) {
      console.warn('Failed to persist notifications', e);
    }
  }

  private notify() {
    const copy = [...this.notifications];
    this.listeners.forEach(fn => {
      try { fn(copy); } catch {}
    });
  }

  public subscribe(listener: (items: NotificationItem[]) => void): () => void {
    this.listeners.push(listener);
    if (this.isLoaded) {
      listener([...this.notifications]);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  public async addNotification(item: {
    title: string;
    desc: string;
    targetScreen?: string;
    type?: NotificationItem['type'];
  }): Promise<NotificationItem> {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: item.title,
      desc: item.desc,
      time: 'Just now',
      timestamp: Date.now(),
      read: false,
      targetScreen: item.targetScreen,
      type: item.type || 'GENERAL',
    };

    this.notifications = [newNotif, ...this.notifications].slice(0, 50); // Keep latest 50
    await this.persist();
    this.notify();
    return newNotif;
  }

  public async markAsRead(id: string): Promise<void> {
    this.notifications = this.notifications.map(n => n.id === id ? { ...n, read: true } : n);
    await this.persist();
    this.notify();
  }

  public async markAllAsRead(): Promise<void> {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    await this.persist();
    this.notify();
  }

  public async deleteNotification(id: string): Promise<void> {
    this.notifications = this.notifications.filter(n => n.id !== id);
    await this.persist();
    this.notify();
  }

  public async clearAll(): Promise<void> {
    this.notifications = [];
    await this.persist();
    this.notify();
  }

  /**
   * Daily Plan Upgrade Notification Check:
   * When subscription/trial days remaining is <= 10,
   * adds a daily warning notification indicating remaining days and prompting upgrade.
   */
  public async checkDailyPlanNotification(): Promise<void> {
    try {
      let daysRemaining = 9; // Default trial/starter remaining days if not explicitly configured

      const planStr = await AsyncStorage.getItem('@hotel_license_plan');
      if (planStr) {
        try {
          const p = JSON.parse(planStr);
          if (p.expiryDate) {
            const exp = new Date(p.expiryDate).getTime();
            daysRemaining = Math.max(0, Math.ceil((exp - Date.now()) / (1000 * 60 * 60 * 24)));
          } else if (p.daysRemaining !== undefined && p.daysRemaining !== null) {
            daysRemaining = Number(p.daysRemaining);
          }
        } catch {}
      }

      if (daysRemaining <= 10) {
        const todayStr = new Date().toISOString().split('T')[0];
        const lastNotifDate = await AsyncStorage.getItem('@last_plan_upgrade_notif_date');

        // Check if today's notification already exists
        const hasTodayNotif = this.notifications.some(
          n =>
            (n.type === 'PLAN' || n.title.includes('Plan Upgrade') || n.title.includes('Subscription Plan')) &&
            new Date(n.timestamp || Date.now()).toISOString().split('T')[0] === todayStr
        );

        if (lastNotifDate !== todayStr && !hasTodayNotif) {
          const title = daysRemaining <= 0
            ? 'Subscription Plan Expired - Upgrade Now'
            : `Plan Upgrade Required (${daysRemaining} Days Left)`;
          const desc = daysRemaining <= 0
            ? 'Your hotel subscription plan has expired! Please renew or upgrade your plan now to continue using all hotel management features.'
            : `Your subscription plan will expire in ${daysRemaining} days. Upgrade your plan now to avoid service interruption.`;

          await this.addNotification({
            title,
            desc,
            targetScreen: 'Settings',
            type: 'PLAN',
          });

          await AsyncStorage.setItem('@last_plan_upgrade_notif_date', todayStr);
        }
      }
    } catch (e) {
      console.warn('Failed to check daily plan notification in Native:', e);
    }
  }
}

export const notificationManager = new NotificationManager();
export default notificationManager;

