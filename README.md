# Sistema de Pedidos Acadêmicos

Sistema interno para gestão de **pedidos e entregas de itens acadêmicos**  
(uniformes, mochilas, materiais escolares etc.), com:

- Painel da **Coordenação**
- Painel do **Estoque**
- Controle de **status de pedidos**
- **Controle de estoque com ledger** (histórico de movimentações)
- Exportação de **relatórios em XLSX**

---

## Stack

**Backend (`/api`)**

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL

**Frontend (`/web`)**

- Next.js (App Router)
- React
- TypeScript
- TailwindCSS

---

## Estrutura do projeto

```bash
/
├── api/          # Backend (API REST em Node + Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma      # Modelos e enums
│   │   └── migrations/        # Migrations geradas pelo Prisma
│   ├── src/
│   │   ├── index.ts           # Entrada da API
│   │   ├── routes/            # Rotas (auth, orders, items, stock-movements)
│   │   └── ...                # Demais arquivos de configuração
│   └── .env                   # DATABASE_URL (não versionado)
│
├── web/          # Frontend (Next.js)
│   ├── src/app/
│   │   ├── login/             # Tela de login
│   │   ├── coordenacao/       # Painel da coordenação
│   │   ├── estoque/           # Painel do estoque
│   │   └── estoque/historico/ # Histórico de movimentações
│   └── ...
│
└── README.md
