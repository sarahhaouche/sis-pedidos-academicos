'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  id: string;
  username: string;
  role: 'COORDENACAO_ADMIN' | 'ESTOQUE_ADMIN';
};

type OrderStatus = 'PENDING' | 'PRODUCING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

type OrderItem = {
  id: string;
  quantity: number;
  item: {
    id: string;
    name: string;
    category: string;
    size: string | null;
  };
};

type Order = {
  id: string;
  studentName: string;
  studentClass: string;
  requestedBy: string;
  status: OrderStatus;
  trackingCode?: string | null;
  createdAt: string;
  items: OrderItem[];
};

type StockMovementType = 'IN' | 'OUT';

type StockMovement = {
  id: string;
  itemId: string;
  orderId: string | null;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  performedBy: string | null;
  createdAt: string;
  item: {
    id: string;
    name: string;
    category: string;
    size: string | null;
  };
  order: {
    id: string;
    studentName: string;
  } | null;
};

function formatStatus(status: OrderStatus) {
  switch (status) {
    case 'PENDING':
      return 'Pendente';
    case 'PRODUCING':
      return 'Em produção';
    case 'SHIPPED':
      return 'Enviado';
    case 'DELIVERED':
      return 'Entregue';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return status;
  }
}

function formatMovementType(type: StockMovementType) {
  return type === 'IN' ? 'Entrada' : 'Saída';
}

function getMovementTypeBadgeClasses(type: StockMovementType) {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border';

  if (type === 'IN') {
    return `${base} bg-emerald-50 text-emerald-800 border-emerald-200`;
  }

  // OUT
  return `${base} bg-rose-50 text-rose-800 border-rose-200`;
}

export default function EstoqueHistoricoPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(true);

  // Autenticação / role
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('sis_pedidos:user');
    if (!stored) {
      router.replace('/login');
      return;
    }

    const parsed: User = JSON.parse(stored);
    if (parsed.role !== 'ESTOQUE_ADMIN') {
      router.replace('/login');
      return;
    }

    setUser(parsed);
  }, [router]);

  // Buscar pedidos (histórico simples)
  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoadingOrders(true);
        const res = await fetch('http://localhost:4000/orders');
        const data = await res.json();
        setOrders(data);
      } catch (error) {
        console.error('Erro ao carregar pedidos para histórico:', error);
      } finally {
        setLoadingOrders(false);
      }
    }

    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Buscar movimentações
  useEffect(() => {
    async function fetchMovements() {
      try {
        setLoadingMovements(true);
        const res = await fetch('http://localhost:4000/stock-movements?limit=500');
        const data = await res.json();
        setMovements(data);
      } catch (error) {
        console.error('Erro ao carregar movimentações de estoque:', error);
      } finally {
        setLoadingMovements(false);
      }
    }

    if (user) {
      fetchMovements();
    }
  }, [user]);

  // ---- EXPORTAÇÃO XLSX BONITA ----
  async function handleDownloadXlsx() {
    if (!movements.length) {
      alert('Não há movimentações para exportar.');
      return;
    }

    // Import dinâmico pra evitar problema no lado do servidor
    const ExcelJSModule = await import('exceljs');
    const ExcelJS = ExcelJSModule.default;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Movimentações');

    // Congela a linha de cabeçalho
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Define colunas
    sheet.columns = [
      { header: 'Data/Hora',     key: 'createdAt',  width: 20 },
      { header: 'Tipo',          key: 'type',       width: 12 },
      { header: 'Quantidade',    key: 'quantity',   width: 12 },
      { header: 'Item',          key: 'item',       width: 28 },
      { header: 'Categoria',     key: 'category',   width: 14 },
      { header: 'Tamanho',       key: 'size',       width: 10 },
      { header: 'Pedido (ID)',   key: 'orderId',    width: 30 },
      { header: 'Aluno',         key: 'student',    width: 20 },
      { header: 'Motivo',        key: 'reason',     width: 30 },
      { header: 'Responsável',   key: 'performedBy',width: 18 },
    ];

    // Adiciona linhas
    movements.forEach((m) => {
      sheet.addRow({
        createdAt: new Date(m.createdAt).toLocaleString('pt-BR'),
        type: formatMovementType(m.type),
        quantity: m.quantity,
        item: m.item.name,
        category: m.item.category,
        size: m.item.size ?? '',
        orderId: m.order?.id ?? '',
        student: m.order?.studentName ?? '',
        reason: m.reason ?? '',
        performedBy: m.performedBy ?? '',
      });
    });

    // Estilo do cabeçalho
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }, // slate-900
    };
    headerRow.border = {
      bottom: { style: 'thin', color: { argb: 'FFCBD5F5' } }, // slate-200
    };

    // Estilo das linhas (zebra + cores por tipo)
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // pula cabeçalho

      const typeCell = row.getCell('type');
      const typeValue = typeCell.value as string | null;

      // Zebra
      if (rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }, // slate-50
        };
      }

      // Bordas suaves
      row.eachCell((cell) => {
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } }, // slate-200
        };
        cell.font = { size: 10, color: { argb: 'FF0F172A' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      });

      // Cores por tipo (Entrada / Saída)
      if (typeValue === 'Entrada') {
        typeCell.font = { bold: true, color: { argb: 'FF166534' } }; // green-700
      } else if (typeValue === 'Saída') {
        typeCell.font = { bold: true, color: { argb: 'FFB91C1C' } }; // red-700
      }

      // Quantidade em negrito / monoespaçada
      const quantityCell = row.getCell('quantity');
      quantityCell.font = { ...quantityCell.font, bold: true };
      quantityCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Pedido (ID) e quantidade em fonte monoespaçada
      const orderIdCell = row.getCell('orderId');
      orderIdCell.font = { ...orderIdCell.font, name: 'Consolas' };
      quantityCell.font = { ...quantityCell.font, name: 'Consolas' };
    });

    // Gera buffer e baixa arquivo
    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const filename = `historico-estoque-${year}-${month}.xlsx`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }


  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Histórico do Estoque
            </h1>
            <p className="text-sm text-slate-600">
              Usuário: {user.username} — histórico de pedidos e movimentações de estoque.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push('/estoque')}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
            >
              Voltar ao painel
            </button>
          </div>
        </header>

        {/* Movimentações de estoque (ledger) + botão de download */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Movimentações de estoque
              </h2>
              <p className="text-xs text-slate-500">
                Entradas e saídas de itens registradas.
              </p>
            </div>
            <button
              onClick={handleDownloadXlsx}
              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
            >
              Baixar relatório (.xlsx)
            </button>

          </div>

          {loadingMovements ? (
            <div className="p-6 text-sm text-slate-600">
              Carregando movimentações...
            </div>
          ) : movements.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">
              Nenhuma movimentação registrada.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[460px]">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 sticky top-0 z-10">
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2">Tipo</th>
                    <th className="px-4 py-2">Quantidade</th>
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2">Categoria</th>
                    <th className="px-4 py-2">Tamanho</th>
                    <th className="px-4 py-2">Pedido</th>
                    <th className="px-4 py-2">Aluno</th>
                    <th className="px-4 py-2">Motivo</th>
                    <th className="px-4 py-2">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m, index) => (
                    <tr
                      key={m.id}
                      className={`border-b border-slate-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-3.5 align-top">
                        {new Date(m.createdAt).toLocaleString('pt-BR')}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <span className={getMovementTypeBadgeClasses(m.type)}>
                          {formatMovementType(m.type)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-top font-mono">
                        {m.quantity}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {m.item.name}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {m.item.category}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {m.item.size ?? '—'}
                      </td>

                      <td className="px-4 py-3.5 align-top text-[10px] font-mono">
                        {m.orderId ?? '—'}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {m.order?.studentName ?? '—'}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {m.reason ?? '—'}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {m.performedBy ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
