import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /auth/login
 * Body esperado:
 * {
 *   "username": "admin_coordenacao",
 *   "password": "coord123"
 * }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    console.log('[AUTH] Tentativa de login', { username });

    if (!username || !password) {
      console.log('[AUTH] Falha: username ou password ausentes');
      return res
        .status(400)
        .json({ error: 'Usuário e senha são obrigatórios.' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    console.log('[AUTH] Usuário encontrado?', !!user);

    if (!user) {
      return res
        .status(401)
        .json({ error: 'Usuário ou senha inválidos.' });
    }

    const passwordOk = await bcrypt.compare(password, user.password);

    console.log('[AUTH] passwordOk?', passwordOk);

    if (!passwordOk) {
      return res
        .status(401)
        .json({ error: 'Usuário ou senha inválidos.' });
    }

    console.log('[AUTH] Login OK para', username);

    return res.json({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    console.error('[AUTH] Erro ao processar login:', error);
    return res
      .status(500)
      .json({ error: 'Erro ao processar login.' });
  }
});

export default router;
