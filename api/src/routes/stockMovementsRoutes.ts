import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

/**
 * GET /stock-movements
 * Retorna as movimentações de estoque (ledger)
 * Opcional: ?limit=200
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit
      ? Number(req.query.limit)
      : 200;

    const movements = await prisma.stockMovement.findMany({
      include: {
        item: true,
        order: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: isNaN(limit) ? 200 : limit,
    });

    return res.json(movements);
  } catch (error) {
    console.error('Erro ao listar movimentações de estoque:', error);
    return res.status(500).json({
      error: 'Erro ao listar movimentações de estoque',
    });
  }
});

export default router;
