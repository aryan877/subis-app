export const isPaymasterBalanceSufficient = (
  balance: string,
  threshold: number = 0.01
): boolean => {
  return parseFloat(balance) >= threshold;
};
