import { subscriptionService, SubscriptionStatusResponse } from './subscriptionService';
import { settingsService, SettingItem } from './settingsService';

export interface LicenceInfo {
  licenceVersion: string;
  subscriptionPlan: string;
  trialDurationDays: number;
  trialStatus: 'Not Started' | 'Active' | 'Expired';
  trialStartDate: string | null;
  trialEndDate: string | null;
  subscriptionStatus: string;
  renewalDate: string | null;
  daysRemaining: number;
  isEligibleForTrial: boolean;
}

const STORAGE_KEY = 'ajalkar_licence_cache';
const TRIAL_DURATION_DAYS = 28;

const calculateDaysRemaining = (endDateStr: string | null, isTrial: boolean = true): number => {
  if (!endDateStr) return TRIAL_DURATION_DAYS;
  const endDate = new Date(endDateStr).getTime();
  const now = Date.now();
  const diffMs = endDate - now;
  const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  // If trial, cannot exceed 28 days
  if (isTrial && days > TRIAL_DURATION_DAYS) {
    return TRIAL_DURATION_DAYS;
  }
  return days;
};

export const licenceService = {
  getLicenceInfo: async (): Promise<LicenceInfo> => {
    // 1. Try fetching current validated subscription from backend
    try {
      const sub: any = await subscriptionService.getCurrentSubscription();
      if (sub) {
        const isTrial = Boolean(
          Boolean(sub.isTrial) ||
          Boolean(sub.trial) ||
          sub.billingCycle === 'TRIAL' ||
          sub.status === 'TRIAL_ACTIVE' ||
          sub.status === 'TRIAL_EXPIRED' ||
          (sub.planName && String(sub.planName).toUpperCase().includes('TRIAL')) ||
          (sub.planCode && String(sub.planCode).toUpperCase().includes('TRIAL')) ||
          Boolean(sub.trialStartDate)
        );
        const rawDays = Number(sub.daysRemaining);
        const safeDays = !isNaN(rawDays) ? rawDays : TRIAL_DURATION_DAYS;
        const clampedDays = (isTrial || sub.billingCycle === 'TRIAL' || sub.status?.includes('TRIAL'))
          ? Math.min(TRIAL_DURATION_DAYS, Math.max(0, safeDays))
          : safeDays;
        const isExpired = sub.status === 'TRIAL_EXPIRED' || sub.status === 'EXPIRED' || clampedDays <= 0;
        const trialStatus: 'Not Started' | 'Active' | 'Expired' = isTrial
          ? (isExpired ? 'Expired' : 'Active')
          : (sub.trialStartDate ? 'Active' : 'Not Started');

        const info: LicenceInfo = {
          licenceVersion: sub.tier || 'Enterprise',
          subscriptionPlan: sub.planName || 'Hotel Enterprise',
          trialDurationDays: TRIAL_DURATION_DAYS,
          trialStatus,
          trialStartDate: sub.trialStartDate,
          trialEndDate: sub.trialEndDate,
          subscriptionStatus: isExpired ? 'Expired' : 'Active',
          renewalDate: sub.endDate ? sub.endDate.split('T')[0] : null,
          daysRemaining: clampedDays,
          isEligibleForTrial: sub.isEligibleForTrial,
        };

        // Cache valid values locally and sanitize any stale cache > 28
        try {
          localStorage.setItem(`${STORAGE_KEY}_licence_version`, info.licenceVersion);
          localStorage.setItem(`${STORAGE_KEY}_subscription_plan`, info.subscriptionPlan);
          localStorage.setItem(`${STORAGE_KEY}_trial_status`, info.trialStatus);
          localStorage.setItem(`${STORAGE_KEY}_trial_duration_days`, '28');
          if (sub.trialStartDate) localStorage.setItem(`${STORAGE_KEY}_trial_start_date`, sub.trialStartDate);
          if (sub.trialEndDate) localStorage.setItem(`${STORAGE_KEY}_trial_end_date`, sub.trialEndDate);
          if (info.renewalDate) localStorage.setItem(`${STORAGE_KEY}_renewal_date`, info.renewalDate);
          localStorage.setItem(`${STORAGE_KEY}_subscription_status`, info.subscriptionStatus);
          localStorage.setItem(`${STORAGE_KEY}_days_remaining`, String(info.daysRemaining));
        } catch {
          // ignore storage error
        }

        return info;
      }
    } catch (err) {
      console.warn('Backend subscription endpoint unavailable, falling back to settings/local cache:', err);
    }

    // 2. Fallback: query settingsService & local cache
    let settings: SettingItem[] = [];
    try {
      settings = await settingsService.getSettings();
    } catch {
      // ignore
    }

    const licenceSettings = settings.filter((s) => s.category === 'licence');
    const getVal = (key: string): string | null => {
      const match = licenceSettings.find((s) => s.settingKey === key);
      if (match) return match.settingValue;
      try {
        const cached = localStorage.getItem(`${STORAGE_KEY}_${key}`);
        if (cached) return cached;
      } catch {
        // ignore
      }
      return null;
    };

    // Purge any stale cache (e.g. 30 or 360 days)
    try {
      const cachedTrialDays = localStorage.getItem(`${STORAGE_KEY}_trial_duration_days`);
      if (cachedTrialDays !== '28') {
        localStorage.setItem(`${STORAGE_KEY}_trial_duration_days`, '28');
      }
      const cachedRemaining = localStorage.getItem(`${STORAGE_KEY}_days_remaining`);
      if (cachedRemaining && parseInt(cachedRemaining, 10) > TRIAL_DURATION_DAYS) {
        localStorage.setItem(`${STORAGE_KEY}_days_remaining`, String(TRIAL_DURATION_DAYS));
      }
    } catch {
      // ignore
    }

    const trialStartDate = getVal('trial_start_date');
    let trialEndDate = getVal('trial_end_date');
    const renewalDate = getVal('renewal_date');
    const licenceVersion = getVal('licence_version') || 'Enterprise';
    const subscriptionPlan = getVal('subscription_plan') || 'Hotel Enterprise';
    const rawSubStatus = getVal('subscription_status');

    // If trialEndDate was wrongly set beyond 28 days from trialStartDate, fix it
    if (trialStartDate && trialEndDate) {
      const startMs = new Date(trialStartDate).getTime();
      const endMs = new Date(trialEndDate).getTime();
      const spanDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
      if (spanDays > 28) {
        // Was set to 30 or 360 days! Recalculate as start + 28 days
        const fixedEnd = new Date(startMs + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
        trialEndDate = fixedEnd.toISOString();
        try {
          localStorage.setItem(`${STORAGE_KEY}_trial_end_date`, trialEndDate);
        } catch {}
      }
    }

    let trialStatus: 'Not Started' | 'Active' | 'Expired' = 'Not Started';
    let subscriptionStatus = 'Active';
    let daysRemaining = TRIAL_DURATION_DAYS;

    if (trialStartDate && trialEndDate) {
      daysRemaining = calculateDaysRemaining(trialEndDate, true);
      if (daysRemaining <= 0) {
        trialStatus = 'Expired';
        subscriptionStatus = 'Expired';
      } else {
        trialStatus = 'Active';
        subscriptionStatus = rawSubStatus && rawSubStatus.includes('Expired') ? 'Expired' : 'Active';
      }
    } else {
      trialStatus = 'Not Started';
      subscriptionStatus = 'Active';
      daysRemaining = TRIAL_DURATION_DAYS;
    }
    daysRemaining = Math.min(TRIAL_DURATION_DAYS, Math.max(0, daysRemaining));

    return {
      licenceVersion,
      subscriptionPlan,
      trialDurationDays: TRIAL_DURATION_DAYS,
      trialStatus,
      trialStartDate,
      trialEndDate,
      subscriptionStatus,
      renewalDate,
      daysRemaining,
      isEligibleForTrial: !trialStartDate,
    };
  },

  startFreeTrial: async (): Promise<LicenceInfo> => {
    try {
      await subscriptionService.startFreeTrial();
    } catch (err: any) {
      console.warn('Backend start trial failed:', err);
      // Fallback: save 28-day trial in settings
      const start = new Date();
      const end = new Date(start.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const renewalDateStr = end.toISOString().split('T')[0];

      await Promise.all([
        settingsService.saveSetting('licence', 'licence_version', 'Enterprise'),
        settingsService.saveSetting('licence', 'subscription_plan', 'Hotel Enterprise'),
        settingsService.saveSetting('licence', 'trial_status', 'Active'),
        settingsService.saveSetting('licence', 'trial_start_date', startIso),
        settingsService.saveSetting('licence', 'trial_end_date', endIso),
        settingsService.saveSetting('licence', 'trial_duration_days', String(TRIAL_DURATION_DAYS)),
        settingsService.saveSetting('licence', 'renewal_date', renewalDateStr),
      ]);
    }

    window.dispatchEvent(new Event('licence-updated'));
    return licenceService.getLicenceInfo();
  },

  openCheckoutModal: (planId?: string | number, mode: 'renew' | 'upgrade' = 'renew') => {
    window.dispatchEvent(
      new CustomEvent('open-subscription-modal', {
        detail: { planId, mode },
      })
    );
  },

  renewSubscription: async (months?: number): Promise<LicenceInfo> => {
    // Dispatch checkout modal to require real payment verification
    licenceService.openCheckoutModal(undefined, 'renew');
    return licenceService.getLicenceInfo();
  },

  upgradePlan: async (planName: string, months?: number): Promise<LicenceInfo> => {
    licenceService.openCheckoutModal(planName, 'upgrade');
    return licenceService.getLicenceInfo();
  },
};

export default licenceService;
