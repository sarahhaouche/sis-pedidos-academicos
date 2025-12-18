import { Router, Request, Response } from 'express';
import { prisma } from '../prisma'; 

const router = Router();

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'Usuário e senha são obrigatórios.' });
    }

    // busca pelo username no banco
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // se não achou ou senha não bate, erro
    if (!user || user.password !== password) {
      return res
        .status(401)
        .json({ error: 'Usuário ou senha inválidos.' });
    }

    // devolve só os dados necessários pro front
    return res.json({
      id: user.id,
      username: user.username,
      role: user.role, // 'COORDENACAO_ADMIN' ou 'ESTOQUE_ADMIN'
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro ao processar login.' });
  }
});

export default router;
