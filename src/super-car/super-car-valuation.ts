import axios from 'axios';
import { VehicleValuation } from '../models/vehicle-valuation';
import { SuperCarValuationResponse } from './types/super-car-valuation-response';
import { Provider, superCarValuationURL } from '~root/config';

export async function fetchValuationFromSuperCarValuation(
  vrm: string,
  mileage: number,
): Promise<VehicleValuation> {
  let response;
  const valuation = new VehicleValuation();
  try {
    axios.defaults.baseURL = superCarValuationURL;
    response = await axios.get<SuperCarValuationResponse>(
      `valuations/${vrm}?mileage=${mileage}`,
    );

    valuation.vrm = vrm;
    valuation.lowestValue = response.data.valuation.lowerValue;
    valuation.highestValue = response.data.valuation.upperValue;
    valuation.provider = Provider.SUPER;
  } catch (err) {
    console.log(`error in fetchValuation from SCV:${err}`);
    console.trace(err);
  }
  return valuation;
}
