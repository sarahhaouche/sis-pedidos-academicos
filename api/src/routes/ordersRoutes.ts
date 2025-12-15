// api/src/routes/ordersRoutes.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { OrderStatus } from '@prisma/client';

const router = Router();

/**
 * POST /orders
 * Cria um novo pedido.
 * Body esperado:
 * {
 *   "studentName": "Fulano",
 *   "studentClass": "5º ano A",
 *   "requestedBy": "Coordenação X",
 *   "items": [
 *     { "itemId": "uuid-do-item", "quantity": 2 },
 *     { "itemId": "uuid-outro-item", "quantity": 1 }
 *   ]
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { studentName, studentClass, requestedBy, items } = req.body;

    if (!studentName || !studentClass || !requestedBy) {
      return res.status(400).json({
        error: 'studentName, studentClass e requestedBy são obrigatórios',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: 'É necessário informar ao menos um item' });
    }

    // opcional: valida se todas as quantities são > 0
    const invalidItem = items.find(
      (it: any) => !it.itemId || typeof it.quantity !== 'number' || it.quantity <= 0,
    );
    if (invalidItem) {
      return res.status(400).json({
        error:
          'Cada item precisa de itemId e quantity > 0',
      });
    }

    const order = await prisma.order.create({
      data: {
        studentName,
        studentClass,
        requestedBy,
        status: OrderStatus.PENDING, // sempre começa pendente
        items: {
          create: items.map((it: any) => ({
            itemId: it.itemId,
            quantity: it.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    return res.status(201).json(order);
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return res.status(500).json({ error: 'Erro ao criar pedido' });
  }
});

/**
 * GET /orders
 * Lista pedidos, com filtros opcionais:
 *  - ?status=PENDING | PRODUCING | DELIVERED | CANCELLED
 *  - ?search=Fulano (busca por nome do aluno ou turma)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;

    let statusFilter: OrderStatus | undefined = undefined;
    if (typeof status === 'string' && status in OrderStatus) {
      statusFilter = status as OrderStatus;
    }

    const orders = await prisma.order.findMany({
      where: {
        status: statusFilter,
        OR:
          typeof search === 'string' && search.trim() !== ''
            ? [
                {
                  studentName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  studentClass: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ]
            : undefined,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    return res.json(orders);
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    return res.status(500).json({ error: 'Erro ao listar pedidos' });
  }
});

/**
 * GET /orders/:id
 * Detalhe de um pedido (usado por coordenação e estoque)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    return res.json(order);
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return res.status(500).json({ error: 'Erro ao buscar pedido' });
  }
});

/**
 * PATCH /orders/:id/status
 * Atualiza o status do pedido.
 * Body esperado:
 * { "status": "PRODUCING" }
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, trackingCode } = req.body;

    if (!status || !(status in OrderStatus)) {
      return res.status(400).json({
        error: `status inválido. Use um destes: ${Object.keys(OrderStatus).join(', ')}`,
      });
    }

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const current = order.status;
    const next = status as OrderStatus;

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]:   [OrderStatus.PRODUCING, OrderStatus.CANCELLED],
      [OrderStatus.PRODUCING]: [OrderStatus.SHIPPED,   OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]:   [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!allowedTransitions[current].includes(next)) {
      return res.status(400).json({
        error: `Transição de status inválida: ${current} -> ${next}`,
      });
    }

    // 👇 regra: se for marcar como SHIPPED, precisa do código de rastreio
    const dataToUpdate: any = { status: next };

    if (next === OrderStatus.SHIPPED) {
      if (!trackingCode || typeof trackingCode !== 'string' || !trackingCode.trim()) {
        return res.status(400).json({
          error: 'trackingCode é obrigatório ao marcar pedido como SHIPPED',
        });
      }
      dataToUpdate.trackingCode = trackingCode.trim();
    }

    const updated = await prisma.order.update({
      where: { id },
      data: dataToUpdate,
      include: {
        items: { include: { item: true } },
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
  }
});


/**
 * PATCH /orders/:id
 * Edição de pedido (linha da Coordenação).
 * Só permite editar pedidos PENDING.
 * Body igual ao de criação:
 * {
 *   "studentName": "...",
 *   "studentClass": "...",
 *   "requestedBy": "...",
 *   "items": [{ "itemId": "...", "quantity": 2 }]
 * }
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { studentName, studentClass, requestedBy, items } = req.body;

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    if (existing.status !== OrderStatus.PENDING) {
      return res.status(400).json({
        error: 'Somente pedidos com status PENDING podem ser editados',
      });
    }

    if (!studentName || !studentClass || !requestedBy) {
      return res.status(400).json({
        error: 'studentName, studentClass e requestedBy são obrigatórios',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: 'É necessário informar ao menos um item' });
    }

    const invalidItem = items.find(
      (it: any) => !it.itemId || typeof it.quantity !== 'number' || it.quantity <= 0,
    );
    if (invalidItem) {
      return res.status(400).json({
        error:
          'Cada item precisa de itemId e quantity > 0',
      });
    }

    // Faz tudo em transação: apaga itens anteriores e recria
    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: {
          studentName,
          studentClass,
          requestedBy,
        },
      }),
      prisma.orderItem.deleteMany({
        where: { orderId: id },
      }),
      prisma.order.update({
        where: { id },
        data: {
          items: {
            create: items.map((it: any) => ({
              itemId: it.itemId,
              quantity: it.quantity,
            })),
          },
        },
        include: {
          items: { include: { item: true } },
        },
      }),
    ]);

    // updatedOrder aqui é o último update da transação
    return res.json(updatedOrder);
  } catch (error) {
    console.error('Erro ao editar pedido:', error);
    return res.status(500).json({ error: 'Erro ao editar pedido' });
  }
});

export default router;
