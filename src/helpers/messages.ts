import { Provider } from '~root/config';

export const LogMessages = {
  CIRCUIT_BREAKER_FALLBACK: (vrm: string) =>
    `Circuit breaker triggered. Falling back to ${Provider.PREMIUM} for VRM: ${vrm}`,
  VALUATION_EXISTS_ALREADY: (vrm: string) =>
    `Valuation already exists for ${vrm}, returning stored result.`,
  INVALID_VRM: () => 'vrm must be non-null & 7 characters or less',
  VALUATION_NOT_FOUND: (vrm: string) => `Valuation for VRM ${vrm} not found`,
  MILEAGE_NOT_POSITIVE: () => 'mileage must be a positive number',
  FAILED_TO_FETCH: () => 'Failed to fetch valuation',
};
