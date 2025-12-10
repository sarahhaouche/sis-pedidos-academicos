import express, { Request, Response } from 'express';
import { prisma } from './prisma';

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

// Rota pra testar conexão com o banco
app.get('/db-health', async (_req: Request, res: Response) => {
  try {
    // faz uma query bem simples
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

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
