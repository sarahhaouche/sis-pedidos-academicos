// api/src/routes/itemsRoutes.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

/**
 * GET /items
 * Lista itens do catálogo.
 * Suporta filtros opcionais:
 *  - ?category=uniforme
 *  - ?onlyActive=true
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, onlyActive } = req.query;

    const items = await prisma.item.findMany({
      where: {
        category: category ? String(category) : undefined,
        isActive:
          typeof onlyActive === 'string'
            ? onlyActive.toLowerCase() === 'true'
            : undefined,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.json(items);
  } catch (error) {
    console.error('Erro ao listar itens:', error);
    return res.status(500).json({ error: 'Erro ao listar itens' });
  }
});

/**
 * POST /items
 * Cria um novo item de catálogo.
 * Body esperado:
 * {
 *   "name": "Camiseta uniforme - tamanho P",
 *   "category": "uniforme",
 *   "size": "P",
 *   "stockQuantity": 30,
 *   "isActive": true
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, category, size, stockQuantity, isActive } = req.body;

    if (!name || !category) {
      return res
        .status(400)
        .json({ error: 'name e category são obrigatórios' });
    }

    const item = await prisma.item.create({
      data: {
        name,
        category,
        size: size ?? null,
        stockQuantity: typeof stockQuantity === 'number' ? stockQuantity : 0,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    });

    return res.status(201).json(item);
  } catch (error) {
    console.error('Erro ao criar item:', error);
    return res.status(500).json({ error: 'Erro ao criar item' });
  }
});

/**
 * PATCH /items/:id
 * Atualiza campos pontuais do item (nome, estoque, ativo, etc.)
 */

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stockQuantity, reason, performedBy } = req.body;

    if (typeof stockQuantity !== 'number') {
      return res.status(400).json({
        error: 'stockQuantity deve ser um número',
      });
    }

    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    const delta = stockQuantity - item.stockQuantity;

    // Nada mudou? só retorna o item mesmo
    if (delta === 0) {
      return res.json(item);
    }

    const movementType =
      delta > 0 ? 'IN' : 'OUT'; // entrada ou saída
    const movementQuantity = Math.abs(delta);

    const updatedItem = await prisma.$transaction(async (tx) => {
      // 1) atualiza saldo
      const updated = await tx.item.update({
        where: { id },
        data: { stockQuantity },
      });

      // 2) registra movimento no ledger
      await tx.stockMovement.create({
        data: {
          itemId: id,
          type: movementType as any,
          quantity: movementQuantity,
          reason: reason ?? 'Ajuste manual de estoque',
          performedBy: performedBy ?? null, //nome do admin
        },
      });

      return updated;
    });

    return res.json(updatedItem);
  } catch (error) {
    console.error('Erro ao atualizar estoque:', error);
    return res.status(500).json({ error: 'Erro ao atualizar estoque' });
  }
});


/**
 * GET /items/:id
 * (opcional, mas útil) Detalhe de um item específico
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await prisma.item.findUnique({
      where: { id },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    return res.json(item);
  } catch (error) {
    console.error('Erro ao buscar item:', error);
    return res.status(500).json({ error: 'Erro ao buscar item' });
  }
});

export default router;
