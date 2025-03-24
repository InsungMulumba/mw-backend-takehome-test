import axios from 'axios';
import xmlConverter from 'simple-xml-to-json';

import { VehicleValuation } from '../models/vehicle-valuation';
import { premiumCarValuationURL } from '~root/config';
import { Child } from './types/premium-car-valuation';
import { Provider } from '~root/config';

export async function fetchValuationFromPremiumCarValuation(
  vrm: string,
  mileage: number,
): Promise<VehicleValuation> {
  let response;
  const valuation = new VehicleValuation();
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
  } catch (err) {
    console.log(`error in pcv:${err}`);
    console.trace(err);
  }

  return valuation;
}

function getValuationNumber(
  children: Child[],
  key: string,
): number {
  const item = children.find((child) => key in child);
  const value = item?.[key]?.content;
  return Number(value);
}
