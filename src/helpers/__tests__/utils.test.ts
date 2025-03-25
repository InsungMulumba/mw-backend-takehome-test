import { logProviderCall } from '@app/helpers/utils';
import { ProviderLog } from '@app/models/provider-logs';
import { Repository } from 'typeorm';
import { Provider } from '~root/config';

describe.only('logProviderCall', () => {
  it('should insert a ProviderLog entry with correct values', async () => {
    const mockInsert = vi.fn();
    const mockRepo = {
      insert: mockInsert,
    };

    const mockStart = performance.now();
    await new Promise((r) => setTimeout(r, 10));

    const mockVRM = 'TEST123';
    await logProviderCall({
      repo: mockRepo as unknown as Repository<ProviderLog>,
      vrm: mockVRM,
      providerName: Provider.SUPER,
      startTime: mockStart,
      statusCode: 200,
      url: 'valuations/TEST123?mileage=9999',
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const inserted = mockInsert.mock.calls[0][0] as ProviderLog;

    expect(inserted.vrm).toBe(mockVRM);
    expect(inserted.providerName).toBe(Provider.SUPER);
    expect(inserted.statusCode).toBe(200);
    expect(inserted.errorMessage).toBe(undefined);
    expect(inserted.url).toBe('valuations/TEST123?mileage=9999');
    expect(typeof inserted.duration).toBe('number');
    expect(inserted.timestamp).toBeInstanceOf(Date);
  });
});
