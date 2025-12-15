// api/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  console.log('Limpando itens antigos...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();

  console.log('Criando itens de catálogo...');

  await prisma.item.createMany({
    data: [
      {
        name: 'Camiseta uniforme - tamanho P',
        category: 'uniforme',
        size: 'P',
        stockQuantity: 30,
      },
      {
        name: 'Camiseta uniforme - tamanho M',
        category: 'uniforme',
        size: 'M',
        stockQuantity: 40,
      },
      {
        name: 'Camiseta uniforme - tamanho G',
        category: 'uniforme',
        size: 'G',
        stockQuantity: 35,
      },
      {
        name: 'Mochila escolar padrão',
        category: 'mochila',
        size: 'único',
        stockQuantity: 20,
      },
      {
        name: 'Kit material básico',
        category: 'material',
        size: 'único',
        stockQuantity: 50,
      },
    ],
  });

  console.log('Criando usuários de acesso...');

  const senhaCoord = await bcrypt.hash('coord123', 10);
  const senhaEstoque = await bcrypt.hash('estoque123', 10);

  await prisma.user.createMany({
    data: [
      {
        username: 'admin_coordenacao',
        passwordHash: senhaCoord,
        role: 'COORDENACAO_ADMIN',
      },
      {
        username: 'admin_estoque',
        passwordHash: senhaEstoque,
        role: 'ESTOQUE_ADMIN',
      },
    ],
  });


  console.log('Seed concluído com sucesso ✅');

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
