import axios from 'axios';
import { VehicleValuation } from '../models/vehicle-valuation';
import { SuperCarValuationResponse } from './types/super-car-valuation-response';
import { Provider, superCarValuationURL } from '~root/config';
import { logProviderCall } from '@app/helpers/utils';
import { Repository } from 'typeorm';
import { ProviderLog } from '@app/models/provider-logs';

export async function fetchValuationFromSuperCarValuation(
  vrm: string,
  mileage: number,
  logRepository: Repository<ProviderLog>,
): Promise<VehicleValuation> {
  let response;
  const valuation = new VehicleValuation();
  const startTime = performance.now();

  try {
    axios.defaults.baseURL = superCarValuationURL;
    response = await axios.get<SuperCarValuationResponse>(
      `valuations/${vrm}?mileage=${mileage}`,
    );

    valuation.vrm = vrm;
    valuation.lowestValue = response.data.valuation.lowerValue;
    valuation.highestValue = response.data.valuation.upperValue;
    valuation.provider = Provider.SUPER;

    logProviderCall({
      repo: logRepository,
      vrm,
      providerName: Provider.SUPER,
      url: `valuations/${vrm}?mileage=${mileage}`,

      startTime,
      statusCode: 200,
    });
  } catch (err) {
    let errorMessage = 'Failed to fetch valuation from due to server error';

    if (err instanceof Error) {
      errorMessage = err.message;
    }

    logProviderCall({
      repo: logRepository,
      vrm,
      providerName: Provider.SUPER,
      url: `valuations/${vrm}?mileage=${mileage}`,
      startTime,
      statusCode: 502,
      errorMessage,
    });
    throw err;
  }

  return valuation;
}
