export interface Plan {
  id: number;
  name: string;
  feeUSD: string;
  feeETH: string;
  exists: boolean;
  isLive: boolean;
  subscriberCount: number;
}
