export interface Plan {
  planId: string;
  name: string;
  feeUSD: string;
  feeETH: string;
  exists: boolean;
  isLive: boolean;
  subscriberCount: number;
  isSubscribed?: boolean;
  nextPaymentTimestamp?: string;
  isActive?: boolean;
}
