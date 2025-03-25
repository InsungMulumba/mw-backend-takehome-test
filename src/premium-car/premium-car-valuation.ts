import axios from 'axios';
import xmlConverter from 'simple-xml-to-json';
import { VehicleValuation } from '../models/vehicle-valuation';
import { premiumCarValuationURL } from '~root/config';
import { Child } from './types/premium-car-valuation';
import { Provider } from '~root/config';
import { logProviderCall } from '@app/helpers/utils';
import { Repository } from 'typeorm';
import { ProviderLog } from '@app/models/provider-logs';

export async function fetchValuationFromPremiumCarValuation(
  vrm: string,
  mileage: number,
  logRepository: Repository<ProviderLog>,
): Promise<VehicleValuation> {
  let response;
  const valuation = new VehicleValuation();
  const startTime = performance.now();

  try {
    axios.defaults.baseURL = premiumCarValuationURL;
    response = await axios.get(`valuations/${vrm}?mileage=${mileage}`);

    const parsedResponse = xmlConverter.convertXML(response.data);
    const children: Child[] = parsedResponse.root.children as Child[];

    valuation.vrm = vrm;
    valuation.lowestValue = getValuationNumber(
      children,
      'ValuationDealershipMinimum',
    );
    valuation.highestValue = getValuationNumber(
      children,
      'ValuationDealershipMaximum',
    );
    valuation.provider = Provider.PREMIUM;

    logProviderCall({
      repo: logRepository,
      vrm,
      providerName: Provider.PREMIUM,
      url: `valuations/${vrm}?mileage=${mileage}`,

      startTime,
      statusCode: 200,
    });
  } catch (err) {
    let errorMessage = `Failed to fetch valuation from ${Provider.PREMIUM} due to server error`;

    if (err instanceof Error) {
      errorMessage = err.message;
    }

    logProviderCall({
      repo: logRepository,
      vrm,
      providerName: Provider.PREMIUM,
      url: `valuations/${vrm}?mileage=${mileage}`,
      startTime,
      statusCode: 502,
      errorMessage,
    });
    throw err;
  }

  return valuation;
}

function getValuationNumber(children: Child[], key: string): number {
  const item = children.find((child) => key in child);
  const value = item?.[key]?.content;
  return Number(value);
}
