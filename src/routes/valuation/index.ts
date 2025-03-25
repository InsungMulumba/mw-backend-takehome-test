import { FastifyInstance } from 'fastify';
import CircuitBreaker from 'opossum';
import { VehicleValuationRequest } from './types/vehicle-valuation-request';
import { fetchValuationFromSuperCarValuation } from '@app/super-car/super-car-valuation';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { fetchValuationFromPremiumCarValuation } from '@app/premium-car/premium-car-valuation';
import { breakerOptions, Provider } from '~root/config';
import { ProviderLog } from '@app/models/provider-logs';
import { LogMessages } from '@app/helpers/messages';
import { isInvalidVRM } from '@app/helpers/utils';


export function valuationRoutes(fastify: FastifyInstance) {

  /**
   * We use circuit breaker provided by opossum for failover mechanism
   */
  const breaker = new CircuitBreaker(
    fetchValuationFromSuperCarValuation,
    breakerOptions,
  );
  breaker.fallback((vrm: string, mileage: number) => {
    const providerLogRepository = fastify.orm.getRepository(ProviderLog);

    fastify.log.warn(LogMessages.CIRCUIT_BREAKER_FALLBACK(vrm));

    return fetchValuationFromPremiumCarValuation(
      vrm,
      mileage,
      providerLogRepository,
    );
  });

  fastify.get<{
    Params: {
      vrm: string;
    };
  }>('/valuations/:vrm', async (request, reply) => {
    const valuationRepository = fastify.orm.getRepository(VehicleValuation);
    const { vrm } = request.params;

    if (isInvalidVRM(vrm)) {
      return reply
        .code(400)
        .send({ message: LogMessages.INVALID_VRM });
    }

    const result = await valuationRepository.findOneBy({ vrm: vrm });

    /** 
     * Backwards compatibility for valuations saved pre introduction of failover
     * I'm working with assumption that all previous valuations were saved with Super Car Valuations
     * If this is not the case, this could be easily changed to whatever value we wish to return to the FE
     */
    if (result && !result.provider) {
      result.provider = Provider.SUPER;
    }

    if (!result) {
      return reply.code(404).send({
        message: LogMessages.VALUATION_NOT_FOUND(vrm),
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
    const providerLogRepository = fastify.orm.getRepository(ProviderLog);
    const { vrm } = request.params;
    const { mileage } = request.body;

    if (isInvalidVRM(vrm)) {
      return reply
        .code(400)
        .send({ message: LogMessages.INVALID_VRM });
    }

    if (mileage === null || mileage <= 0) {
      return reply.code(400).send({
        message: LogMessages.MILEAGE_NOT_POSITIVE,
      });
    }


    /**
     * I used early return pattern here to avoid unecessary provider calls
     * in prod we could even use in-memory cache to avoid DB calls
     */
    const existingRecord = await valuationRepository.findOneBy({ vrm });
    if (existingRecord) {
      fastify.log.info(
        LogMessages.VALUATION_EXISTS_ALREADY(vrm)
      );
      return existingRecord;
    }

    let valuation: VehicleValuation;

    try {

      valuation = await breaker.fire(vrm, mileage, providerLogRepository);

    } catch (err) {
      return reply.code(502).send({ message: LogMessages.FAILED_TO_FETCH });
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
