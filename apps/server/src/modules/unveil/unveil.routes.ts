/**
 * World Unveil (🌍) Fog-of-War Discovery & Exploration Routes
 */
import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../../database/db.js';
import { authenticate } from '../../middleware/auth.js';

export async function unveilRoutes(app: FastifyInstance): Promise<void> {
  // 1. Get Visited Cells
  app.get('/unveil/cells', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;

    const cells = await query(
      `SELECT cell_token, visit_count, unveiled_at
       FROM unveiled_territories
       WHERE user_id = $1
       ORDER BY unveiled_at DESC`,
      [userId]
    );

    return reply.send({ success: true, cells });
  });

  // 2. Get Exploration Stats
  app.get('/unveil/stats', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;

    const stats = await queryOne(
      `SELECT COUNT(*) as total_unveiled,
              COALESCE(SUM(visit_count), 0) as total_visits,
              MIN(unveiled_at) as first_unveiled_at,
              MAX(unveiled_at) as last_unveiled_at
       FROM unveiled_territories
       WHERE user_id = $1`,
      [userId]
    );

    return reply.send({
      success: true,
      stats: {
        total_unveiled: parseInt(stats?.total_unveiled || '0', 10),
        total_visits: parseInt(stats?.total_visits || '0', 10),
        first_unveiled_at: stats?.first_unveiled_at || null,
        last_unveiled_at: stats?.last_unveiled_at || null,
      },
    });
  });

  // 3. Record Visited Cells (Batch or Single)
  app.post('/unveil/cells', { preHandler: [authenticate] }, async (request, reply) => {
    const { cells, cell_token } = request.body as any;
    const userId = request.user!.userId;

    const targetCells: string[] = Array.isArray(cells)
      ? cells
      : (cell_token ? [cell_token] : []);

    if (targetCells.length === 0) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'cells array is required' });
    }

    for (const cell of targetCells) {
      if (typeof cell === 'string' && cell.length > 0) {
        await query(
          `INSERT INTO unveiled_territories (user_id, cell_token, visit_count)
           VALUES ($1, $2, 1)
           ON CONFLICT (user_id, cell_token) DO UPDATE
           SET visit_count = unveiled_territories.visit_count + 1, unveiled_at = NOW()`,
          [userId, cell]
        );
      }
    }

    return reply.send({ success: true, recorded: targetCells.length });
  });
}
