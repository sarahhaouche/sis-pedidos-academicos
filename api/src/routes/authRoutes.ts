// api/src/routes/authRoutes.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';

const router = Router();

/**
 * POST /auth/login
 * Body esperado:
 * {
 *   "username": "admin_coordenacao",
 *   "password": "coord123"
 * }
 *
 * Retorno (exemplo):
 * {
 *   "id": "...",
 *   "username": "admin_coordenacao",
 *   "role": "COORDENACAO_ADMIN"
 * }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'username e password são obrigatórios' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res
        .status(401)
        .json({ error: 'Usuário ou senha inválidos' });
    }

    const senhaConfere = await bcrypt.compare(password, user.passwordHash);

    if (!senhaConfere) {
      return res
        .status(401)
        .json({ error: 'Usuário ou senha inválidos' });
    }

    // Obs: aqui poderíamos gerar um JWT, mas por enquanto
    // vamos devolver só os dados básicos e deixar o front
    // guardar o role e decidir o fluxo.
    return res.json({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro ao realizar login' });
  }
});

export default router;
