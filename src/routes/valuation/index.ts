import { FastifyInstance } from 'fastify';
import CircuitBreaker from 'opossum';
import { VehicleValuationRequest } from './types/vehicle-valuation-request';
import { fetchValuationFromSuperCarValuation } from '@app/super-car/super-car-valuation';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { fetchValuationFromPremiumCarValuation } from '@app/premium-car/premium-car-valuation';
import { Provider } from '~root/config';

const breakerOptions = {
  timeout: 15000,
  errorThresholdPercentage: 50,
  resetTimeout: 5000,
  volumeThreshold: 5,
};

const breaker = new CircuitBreaker(
  fetchValuationFromSuperCarValuation,
  breakerOptions,
);

breaker.fallback((vrm: string, mileage: number) => {
  console.warn(
    `Circuit breaker triggered. Falling back to PremiumCarValuations for VRM: ${vrm}`,
  );
  return fetchValuationFromPremiumCarValuation(vrm, mileage);
});

export function valuationRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Params: {
      vrm: string;
    };
  }>('/valuations/:vrm', async (request, reply) => {
    const valuationRepository = fastify.orm.getRepository(VehicleValuation);
    const { vrm } = request.params;

    if (vrm === null || vrm === '' || vrm.length > 7) {
      return reply
        .code(400)
        .send({ message: 'vrm must be 7 characters or less', statusCode: 400 });
    }

    const result = await valuationRepository.findOneBy({ vrm: vrm });
    console.log(result);
    /** Backwards compatibility for valuations saved pre introduction of failover
     * I'm working with assumption that all previous valuations were saved with Super Car Valuations
     * If this is not the case, this could be easily changed to whatever value we wish to return to the FE
     */
    if (result && !result.provider) {
      result.provider = Provider.SUPER;
    }

    if (!result) {
      return reply.code(404).send({
        message: `Valuation for VRM ${vrm} not found`,
        statusCode: 404,
      });
    }
    return result;
  });

  fastify.put<{
    Body: VehicleValuationRequest;
    Params: {
      vrm: string;
    };
  }>('/valuations/:vrm', async (request, reply) => {
    const valuationRepository = fastify.orm.getRepository(VehicleValuation);
    const { vrm } = request.params;
    const { mileage } = request.body;

    console.log(`vrm2: ${vrm}`);

    if (vrm.length > 7) {
      return reply
        .code(400)
        .send({ message: 'vrm must be 7 characters or less', statusCode: 400 });
    }

    if (mileage === null || mileage <= 0) {
      return reply.code(400).send({
        message: 'mileage must be a positive number',
        statusCode: 400,
      });
    }

    const existingRecord = await valuationRepository.findOneBy({ vrm });
    if (existingRecord) {
      console.log(
        `Valuation already exists for ${vrm}, returning cached result.`,
      );
      return existingRecord;
    }

    let valuation: VehicleValuation;

    try {
      valuation = await breaker.fire(vrm, mileage);
    } catch (err) {
      return reply
        .code(502)
        .send({ message: 'Failed to fetch valuation', statusCode: 502 });
    }

    await valuationRepository.insert(valuation).catch((err) => {
      if (err.code !== 'SQLITE_CONSTRAINT') {
        throw err;
      }
    });

    fastify.log.info('Valuation created: ', valuation);

    return valuation;
  });
}
