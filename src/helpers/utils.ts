import { Repository } from 'typeorm';
import { ProviderLog } from '../models/provider-logs';

export async function logProviderCall({
  repo,
  vrm,
  providerName,
  url,
  startTime,
  statusCode,
  errorMessage,
}: {
  repo: Repository<ProviderLog>;
  vrm: string;
  providerName: string;
  url: string;
  startTime: number;
  statusCode: number;
  errorMessage?: string;
}) {
  /**
   * Calulate the duration using native performance library
   */
  const duration = performance.now() - startTime;

  await repo.insert({
    vrm,
    providerName,
    duration,
    url,
    timestamp: new Date(),
    statusCode,
    errorMessage,
  });
}

export function isInvalidVRM(vrm: string) {
  if (vrm === null || vrm === '' || vrm.length > 7) {
    return true;
  }
  return false;
}
