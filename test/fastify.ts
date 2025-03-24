import { beforeAll, afterAll } from 'vitest'
import { app } from '@app/app'
import { VehicleValuation } from '@app/models/vehicle-valuation';

export const fastify = app()

beforeAll(async () => {
  // called once before all tests run
  await fastify.ready()

   const realRepository = fastify.orm.getRepository(VehicleValuation);

   vi.spyOn(realRepository, 'findOneBy').mockResolvedValue(null);
   vi.spyOn(realRepository, 'insert').mockResolvedValue({
     identifiers: [],
     generatedMaps: [],
     raw: undefined
   });
 
   const mockDataSource = {
     getRepository: () => realRepository,
     destroy: vi.fn()
   };
 
   Object.assign(fastify, { orm: mockDataSource });
   
 
})
afterAll(async () => {
  // called once after all tests run
  await fastify.close()
})
