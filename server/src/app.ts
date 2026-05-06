import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { communitySoundingBatchSchema } from './community-soundings.js';
import {
  createCommunitySoundingRepository,
  type CommunitySoundingRepository,
} from './community-sounding-repository.js';

export type BuildAppOptions = {
  dataDir: string;
  repository?: CommunitySoundingRepository;
  logger?: boolean;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  const repository = options.repository ?? createCommunitySoundingRepository(options.dataDir);

  await app.register(cors, {
    origin: true,
  });

  app.get('/health', async () => ({
    ok: true,
    service: 'harbourmesh-server',
    time: new Date().toISOString(),
  }));

  app.post('/api/community/soundings', async (request, reply) => {
    try {
      const batch = communitySoundingBatchSchema.parse(request.body);
      const receipt = await repository.acceptBatch(batch);
      return reply.code(202).send(receipt);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          ok: false,
          error: 'invalid_community_sounding_batch',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      throw error;
    }
  });

  app.get('/api/community/soundings/summary', async () => repository.getSummary());

  return app;
}
