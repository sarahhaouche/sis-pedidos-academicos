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
  createdAt: string;
  items: OrderItem[];
  trackingCode?: string | null; 
};


export default function CoordenacaoPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const params = new URLSearchParams();

  // 1) Garante que só coordenação entra
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('sis_pedidos:user');
    if (!stored) {
      router.replace('/login');
      return;
    }

    const parsed: User = JSON.parse(stored);
    if (parsed.role !== 'COORDENACAO_ADMIN') {
      router.replace('/login');
      return;
    }

    setUser(parsed);
  }, [router]);

  // 2) Busca pedidos sempre que filtro mudar
  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);

        if (statusFilter !== 'ALL') {
          params.append('status', statusFilter);
        }
        if (search.trim() !== '') {
          params.append('search', search.trim());
        }

        const API_URL = process.env.NEXT_PUBLIC_API_URL;
        
        const query = params.toString();
        const url = query
          ? `${API_URL}/orders?${query}`
          : `${API_URL}/orders`;

        const res = await fetch(url);
        const data = await res.json();
        setOrders(data);
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
      } finally {
        setLoading(false);
      }
    }

    // só busca depois que o user estiver definido (evita chamada antes do redirect)
    if (user) {
      fetchOrders();
    }
  }, [statusFilter, search, user]);

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

function getStatusChipClasses(status: OrderStatus) {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border';

  switch (status) {
    case 'PENDING':
      return `${base} bg-amber-50 text-amber-800 border-amber-200`;
    case 'PRODUCING':
      return `${base} bg-blue-50 text-blue-800 border-blue-200`;
    case 'SHIPPED':
      return `${base} bg-sky-50 text-sky-800 border-sky-200`;
    case 'DELIVERED':
      return `${base} bg-emerald-50 text-emerald-800 border-emerald-200`;
    case 'CANCELLED':
      return `${base} bg-rose-50 text-rose-800 border-rose-200`;
    default:
      return `${base} bg-slate-100 text-slate-800 border-slate-200`;
  }
}

type StatusFilter = 'ALL' | OrderStatus;

function getStatusFilterClasses(status: StatusFilter, isActive: boolean) {
  const base =
    'rounded-full px-3 py-1 text-xs font-medium border transition-colors';

  if (status === 'ALL') {
    return isActive
      ? `${base} bg-slate-900 text-white border-slate-900`
      : `${base} bg-white text-slate-800 border-slate-300 hover:bg-slate-100`;
  }

  if (status === 'PENDING') {
    return isActive
      ? `${base} bg-amber-500 text-white border-amber-500`
      : `${base} bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100`;
  }

  if (status === 'PRODUCING') {
    return isActive
      ? `${base} bg-blue-500 text-white border-blue-500`
      : `${base} bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100`;
  }

  if (status === 'SHIPPED') {
    return isActive
      ? `${base} bg-sky-500 text-white border-sky-500`
      : `${base} bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100`;
  }

  if (status === 'DELIVERED') {
    return isActive
      ? `${base} bg-emerald-500 text-white border-emerald-500`
      : `${base} bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100`;
  }

  if (status === 'CANCELLED') {
    return isActive
      ? `${base} bg-rose-500 text-white border-rose-500`
      : `${base} bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100`;
  }

  return `${base} bg-slate-100 text-slate-800 border-slate-200`;
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
              Painel da Coordenação
            </h1>
            <p className="text-sm text-slate-600">
              Visualize, crie e acompanhe os pedidos de itens acadêmicos.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push('/coordenacao/novo')}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Novo pedido
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('sis_pedidos:user');
                router.push('/login');
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Filtros */}
        <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PENDING', 'PRODUCING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status === 'ALL' ? 'ALL' : status)}
                  className={getStatusFilterClasses(
                    status,
                    statusFilter === status,
                  )}
                >
                  {status === 'ALL'
                    ? 'Todos'
                    : formatStatus(status as OrderStatus)}
                </button>
              ),
            )}
          </div>


          <div className="w-full md:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por aluno ou turma..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </section>

        {/* Tabela de pedidos */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-slate-600">
              Carregando pedidos...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">
              Nenhum pedido encontrado para esse filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2">Aluno</th>
                    <th className="px-4 py-2">Turma</th>
                    <th className="px-4 py-2">Itens</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Rastreio</th>
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr
                      key={order.id}
                      className={`border-b border-slate-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-3.5 align-top text-sm font-medium text-slate-900">
                        {order.studentName}
                      </td>

                      <td className="px-4 py-3.5 align-top text-sm text-slate-700">
                        {order.studentClass}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <ul className="space-y-1">
                          {order.items.map((oi) => (
                            <li key={oi.id} className="text-xs text-slate-700">
                              {oi.quantity}× {oi.item.name}
                            </li>
                          ))}
                        </ul>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <span className={getStatusChipClasses(order.status)}>
                          {formatStatus(order.status)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-top text-xs text-slate-600">
                        {order.trackingCode ? (
                          <span className="font-mono">
                            {order.trackingCode}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleString('pt-BR')}
                      </td>

                      <td className="px-4 py-3.5 align-top text-xs">
                        {order.status === 'PENDING' ? (
                          <button
                            onClick={() =>
                              router.push(`/coordenacao/pedidos/${order.id}`)
                            }
                            className="font-medium text-slate-900 hover:underline"
                          >
                            Editar
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
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
