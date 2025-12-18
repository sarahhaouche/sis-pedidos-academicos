import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'Usuário e senha são obrigatórios.' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    // Se usuário não existe
    if (!user) {
      return res
        .status(401)
        .json({ error: 'Usuário ou senha inválidos.' });
    }
    
    // usar user.password (nome da coluna no banco)
    const passwordOk = await bcrypt.compare(password, user.password);

    if (!passwordOk) {
      return res
        .status(401)
        .json({ error: 'Usuário ou senha inválidos.' });
    }

    // Login ok
    return res.json({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    console.error('Erro ao processar login:', error);
    return res
      .status(500)
      .json({ error: 'Erro ao processar login.' });
  }
});

export default router;
