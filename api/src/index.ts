import express, { Request, Response } from 'express';
import { prisma } from './prisma';
import itemsRoutes from './routes/itemsRoutes';
import ordersRoutes from './routes/ordersRoutes';
import authRoutes from './routes/authRoutes';
import stockMovementsRoutes from './routes/stockMovementsRoutes';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    service: 'api-pedidos-academicos',
    timestamp: new Date().toISOString(),
  });
});

app.get('/db-health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1+1 AS result`;

    return res.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao conectar no banco:', error);
    return res.status(500).json({
      status: 'error',
      db: 'disconnected',
    });
  }
});

app.use(cors({
  origin: 'http://localhost:3000', // seu Next em dev
}));

app.use(express.json());

//Rotas de autenticação
app.use('/auth', authRoutes);

// Rotas de catálogo de itens
app.use('/items', itemsRoutes);

// Rotas de pedidos
app.use('/orders', ordersRoutes);

//Rotas de estoque
app.use('/stock-movements', stockMovementsRoutes);

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
