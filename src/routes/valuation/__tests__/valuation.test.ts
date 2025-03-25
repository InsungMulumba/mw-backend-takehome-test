import { fastify } from '~root/test/fastify';
import { VehicleValuationRequest } from '../types/vehicle-valuation-request';
import { fetchValuationFromSuperCarValuation } from '@app/super-car/super-car-valuation';
import { fetchValuationFromPremiumCarValuation } from '@app/premium-car/premium-car-valuation';
import { Mock, MockedFunction } from 'vitest';
import { VehicleValuation } from '@app/models/vehicle-valuation';
import { Provider } from '~root/config';

vi.mock('@app/super-car/super-car-valuation', () => ({
  fetchValuationFromSuperCarValuation: vi.fn(),
}));

vi.mock('@app/premium-car/premium-car-valuation', () => ({
  fetchValuationFromPremiumCarValuation: vi.fn(),
}));

describe('ValuationController (e2e)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe('PUT /valuations/', () => {
    it('should return 404 if VRM is missing', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: 10000,
      };

      const res = await fastify.inject({
        url: '/valuations',
        method: 'PUT',
        body: requestBody,
      });

      expect(res.statusCode).toStrictEqual(404);
    });

    it('should return 400 if VRM is 8 characters or more', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: 10000,
      };

      const res = await fastify.inject({
        url: '/valuations/12345678',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(400);
    });

    it('should return 400 if mileage is missing', async () => {
      const requestBody: VehicleValuationRequest = {
        // @ts-expect-error intentionally malformed payload
        mileage: null,
      };

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(400);
    });

    it('should return 400 if mileage is negative', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: -1,
      };

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(400);
    });

    it('should return 200 with valid request', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: 10000,
      };

      (
        fetchValuationFromSuperCarValuation as MockedFunction<
          typeof fetchValuationFromSuperCarValuation
        >
      ).mockResolvedValue({
        vrm: 'ABC123',
        lowestValue: 10,
        highestValue: 1000000,
        midpointValue: 5000000,
      });

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(200);
      /**
       * Added these assertions to ensure we are calling providers correctly
       */
      expect(fetchValuationFromSuperCarValuation).toHaveBeenCalled();
      expect(fetchValuationFromPremiumCarValuation).not.toHaveBeenCalled();
    });

    it('should return 200 without calling provider if already exists', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: 10000,
      };

      const existingValuation = {
        vrm: 'ABC123',
        lowestValue: 9000,
        highestValue: 11000,
        provider: '',
      };
      const mockFindOneBy = fastify.orm.getRepository(VehicleValuation)
        .findOneBy as Mock;
      mockFindOneBy.mockResolvedValue(existingValuation);

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(200);
      expect(fetchValuationFromSuperCarValuation).not.toHaveBeenCalled();
      expect(fetchValuationFromPremiumCarValuation).not.toHaveBeenCalled();
      mockFindOneBy.mockReset();
    });

    it('should return 200 with valid request, using failover', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: 10000,
      };

      (fetchValuationFromSuperCarValuation as Mock).mockRejectedValue(
        new Error('SuperCar Error'),
      );

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        body: requestBody,
        method: 'PUT',
      });

      expect(res.statusCode).toStrictEqual(200);
      expect(fetchValuationFromSuperCarValuation).toHaveBeenCalled();
      expect(fetchValuationFromPremiumCarValuation).toHaveBeenCalled();
    });

    it('should return 502 if both services fail', async () => {
      const requestBody: VehicleValuationRequest = {
        mileage: 10000,
      };

      (fetchValuationFromSuperCarValuation as Mock).mockRejectedValue(
        new Error('SuperCar Error'),
      );

      (fetchValuationFromPremiumCarValuation as Mock).mockRejectedValue(
        new Error('PremiumCar Error'),
      );

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        body: requestBody,
        method: 'PUT',
      });
      expect(res.statusCode).toStrictEqual(502);
      expect(fetchValuationFromSuperCarValuation).toHaveBeenCalled();
      expect(fetchValuationFromPremiumCarValuation).toHaveBeenCalled();
    });
  });

  describe('GET /valuations/', () => {
    it('should return 200 using default provider if no provider is saved', async () => {
      const existingValuation = {
        vrm: 'ABC123',
        lowestValue: 9000,
        highestValue: 11000,
      };
      const mockFindOneBy = fastify.orm.getRepository(VehicleValuation)
        .findOneBy as Mock;
      mockFindOneBy.mockResolvedValue(existingValuation);

      const res = await fastify.inject({
        url: '/valuations/ABC123',
        body: {},
        method: 'GET',
      });

      expect(res.statusCode).toStrictEqual(200);
      expect(JSON.parse(res.body)).toEqual({
        vrm: 'ABC123',
        lowestValue: 9000,
        highestValue: 11000,
        provider: Provider.SUPER,
      });
      mockFindOneBy.mockReset();
    });

    it('should return 404 if valuation does not exist', async () => {
      const existingValuation = {
        vrm: 'ABC123',
        lowestValue: 9000,
        highestValue: 11000,
      };
      const mockFindOneBy = fastify.orm.getRepository(VehicleValuation)
        .findOneBy as Mock;
        mockFindOneBy.mockImplementation(async ({ vrm }) => {
          if (vrm !== existingValuation.vrm) return null;
          return {
            vrm: 'ABC123',
            lowestValue: 9000,
            highestValue: 11000,
          };
        });
      const res = await fastify.inject({
        url: '/valuations/DEF456',
        body: {},
        method: 'GET',
      });
      console.log(JSON.parse(res.body));

      expect(res.statusCode).toStrictEqual(404);
      mockFindOneBy.mockReset();

    });


  });
});
