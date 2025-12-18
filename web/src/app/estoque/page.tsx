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
    stockQuantity: number;
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

type StockItem = {
  id: string;
  name: string;
  category: string;
  size: string | null;
  stockQuantity: number;
};


function hasSufficientStock(order: Order): boolean {
  return order.items.every(
    (oi) => oi.item.stockQuantity >= oi.quantity,
  );
}

export default function EstoquePage() {
  const router = useRouter();

  const [itemsCatalog, setItemsCatalog] = useState<StockItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editedStock, setEditedStock] = useState<Record<string, string>>({});

  // 1) Garantir que só ESTOQUE_ADMIN entra
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

  // 2) Buscar pedidos conforme filtro
  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);

        const params = new URLSearchParams();

        if (statusFilter !== 'ALL') {
          params.append('status', statusFilter);
        }
        if (search.trim() !== '') {
          params.append('search', search.trim());
        }

        const query = params.toString();
        const url = query
          ? `http://localhost:4000/orders?${query}`
          : 'http://localhost:4000/orders';

        const res = await fetch(url);
        const data = await res.json();
        setOrders(data);
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchOrders();
    }
  }, [statusFilter, search, user]);

  useEffect(() => {
    async function fetchItems() {
      try {
        setLoadingItems(true);
        const res = await fetch('http://localhost:4000/items?onlyActive=true');
        const data = await res.json();
        setItemsCatalog(data);
      } catch (error) {
        console.error('Erro ao carregar itens para estoque:', error);
      } finally {
        setLoadingItems(false);
      }
    }

    if (user) {
      fetchItems();
    }
  }, [user]);


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


  async function handleUpdateStatus(orderId: string, nextStatus: OrderStatus) {
    try {
      setUpdatingId(orderId);

      const res = await fetch(
        `http://localhost:4000/orders/${orderId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      const updatedOrder: Order = await res.json();

      if (!res.ok) {
        console.error('Erro ao atualizar status:', updatedOrder);
        alert(
          (updatedOrder as any)?.error ??
            'Erro ao atualizar status do pedido',
        );
        return;
      }

      // Atualiza a lista de pedidos com o pedido vindo da API
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? updatedOrder : o)),
      );

      // Se foi PENDING -> PRODUCING, atualiza também o estoque local
      if (nextStatus === 'PRODUCING') {
        setItemsCatalog((prev) =>
          prev.map((item) => {
            const fromOrder = updatedOrder.items.find(
              (oi) => oi.item.id === item.id,
            );
            return fromOrder
              ? { ...item, stockQuantity: fromOrder.item.stockQuantity }
              : item;
          }),
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro de conexão ao atualizar status.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleMarkProducing(order: Order) {
  // Popup pedindo nome do responsável
  const name = window.prompt(
    'Informe o nome do administrador de estoque que está enviando este pedido para produção:',
  );

  if (!name || !name.trim()) {
    // usuário cancelou ou deixou vazio → não faz nada
    return;
  }

  try {
    setUpdatingId(order.id);

    const res = await fetch(
      `http://localhost:4000/orders/${order.id}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PRODUCING',
          performedBy: name.trim(), // vai pro backend
        }),
      },
    );

    const updatedOrder: Order = await res.json();

    if (!res.ok) {
      console.error('Erro ao atualizar status:', updatedOrder);
      alert(
        (updatedOrder as any)?.error ??
          'Erro ao enviar pedido para produção.',
      );
      return;
    }

    // Atualiza pedidos
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? updatedOrder : o)),
    );

    // Atualiza estoque local com base nos itens retornados
    setItemsCatalog((prev) =>
      prev.map((item) => {
        const fromOrder = updatedOrder.items.find(
          (oi) => oi.item.id === item.id,
        );
        return fromOrder
          ? { ...item, stockQuantity: fromOrder.item.stockQuantity }
          : item;
      }),
    );
  } catch (error) {
    console.error('Erro ao enviar para produção:', error);
    alert('Erro de conexão ao enviar pedido para produção.');
  } finally {
    setUpdatingId(null);
  }
}


  // Estoque

  function handleLocalStockChange(itemId: string, value: string) {
  const quantity = Number(value) || 0;

  setItemsCatalog((prev) =>
    prev.map((item) =>
      item.id === itemId ? { ...item, stockQuantity: quantity } : item,
    ),
  );
}

async function handleSaveStock(itemId: string, newQuantity: number) {
  if (Number.isNaN(newQuantity) || newQuantity < 0) {
    alert('Informe uma quantidade válida (zero ou maior).');
    return;
  }

  const name = window.prompt(
    'Informe o nome do administrador de estoque que está realizando este ajuste:',
  );

  if (!name || !name.trim()) {
    return; // cancelou ou deixou vazio
  }

  try {
    const res = await fetch(`http://localhost:4000/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockQuantity: newQuantity,
        reason: 'Ajuste manual pelo painel de estoque',
        performedBy: name.trim(),
      }),
    });

    const updatedItem = await res.json();

    if (!res.ok) {
      console.error('Erro ao ajustar estoque:', updatedItem);
      alert(
        (updatedItem as any)?.error ??
          'Erro ao salvar ajuste de estoque.',
      );
      return;
    }

    setItemsCatalog((prev) =>
      prev.map((item) => (item.id === itemId ? updatedItem : item)),
    );

    // limpa o valor editado desse item
    setEditedStock((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  } catch (error) {
    console.error('Erro ao ajustar estoque:', error);
    alert('Erro de conexão ao salvar ajuste de estoque.');
  }
}

  // Rastreio do pedido

  async function handleShip(order: Order) {
  const code = window.prompt('Informe o código de rastreio deste pedido:');

  if (!code || !code.trim()) {
    return; // usuário cancelou ou deixou vazio
  }

  try {
    setUpdatingId(order.id);

    const res = await fetch(
      `http://localhost:4000/orders/${order.id}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'SHIPPED',
          trackingCode: code.trim(),
        }),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('Erro ao registrar envio:', data);
      alert(data?.error ?? 'Erro ao registrar envio do pedido');
      return;
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { ...o, status: data.status, trackingCode: data.trackingCode }
          : o,
      ),
    );
  } catch (error) {
    console.error('Erro ao registrar envio:', error);
    alert('Erro de conexão ao registrar envio.');
  } finally {
    setUpdatingId(null);
  }
}

  const visibleOrders = orders.filter((order) => {
    if (statusFilter === 'ALL') return true;
    return order.status === statusFilter;
  });

  const showStockColumn = statusFilter === 'PENDING';



  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Painel do Estoque
            </h1>
            <p className="text-sm text-slate-600">
              Gerencie os pedidos pendentes e em produção.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/estoque/historico')}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Histórico do estoque
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
            {(['PENDING', 'PRODUCING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'ALL'] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() =>
                    setStatusFilter(
                      status === 'ALL' ? 'ALL' : (status as OrderStatus),
                    )
                  }
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
          ) : visibleOrders.length === 0 ? (
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

                    {showStockColumn && (
                      <th className="px-4 py-2">Estoque</th>
                    )}

                    <th className="px-4 py-2">Rastreio</th>
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order, index) => (
                    <tr
                      key={order.id}
                      className={`border-b border-slate-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      }`}
                    >
                      {/* Aluno */}
                      <td className="px-4 py-3.5 align-top text-sm font-medium text-slate-900">
                        {order.studentName}
                      </td>

                      {/* Turma */}
                      <td className="px-4 py-3.5 align-top text-sm text-slate-700">
                        {order.studentClass}
                      </td>

                      {/* Itens */}
                      <td className="px-4 py-3.5 align-top">
                        <ul className="space-y-1">
                          {order.items.map((oi) => (
                            <li key={oi.id} className="text-xs text-slate-700">
                              {oi.quantity}× {oi.item.name}
                            </li>
                          ))}
                        </ul>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 align-top">
                        <span className={getStatusChipClasses(order.status)}>
                          {formatStatus(order.status)}
                        </span>
                      </td>

                      {/* Estoque – só na aba Pendente */}
                      {showStockColumn && (
                        <td className="px-4 py-3.5 align-top text-xs">
                          {hasSufficientStock(order) ? (
                            <span className="text-emerald-700 font-medium">
                              Estoque suficiente
                            </span>
                          ) : (
                            <span className="text-rose-600 font-medium">
                              Estoque insuficiente
                            </span>
                          )}
                        </td>
                      )}

                      {/* Rastreio */}
                      <td className="px-4 py-3.5 align-top text-xs text-slate-600">
                        {order.trackingCode ? (
                          <span className="font-mono">{order.trackingCode}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="px-4 py-3.5 align-top text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleString('pt-BR')}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5 align-top text-xs">
                        <div className="flex flex-wrap gap-2">
                          {order.status === 'PENDING' && (
                            <>
                              {hasSufficientStock(order) && (
                                <button
                                  disabled={updatingId === order.id}
                                  onClick={() => handleMarkProducing(order)}
                                  className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Em produção
                                </button>
                              )}
                              <button
                                disabled={updatingId === order.id}
                                onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                                className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Cancelar
                              </button>
                            </>
                          )}

                          {order.status === 'PRODUCING' && (
                            <>
                              <button
                                disabled={updatingId === order.id}
                                onClick={() => handleShip(order)}
                                className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-800 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Registrar envio
                              </button>
                            </>
                          )}

                          {order.status === 'SHIPPED' && (
                            <button
                              disabled={updatingId === order.id}
                              onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                              className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Marcar como entregue
                            </button>
                          )}

                          {(order.status === 'DELIVERED' || order.status === 'CANCELLED') && (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-400">
                              Nenhuma ação disponível
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* Gestão de estoque */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-800">
              Gestão de estoque
            </h2>
            <p className="text-xs text-slate-500">
              Atualize as quantidades disponíveis de cada item.
            </p>
          </div>

          {loadingItems ? (
            <div className="p-4 text-xs text-slate-600">
              Carregando itens...
            </div>
          ) : itemsCatalog.length === 0 ? (
            <div className="p-4 text-xs text-slate-600">
              Nenhum item cadastrado.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Categoria</th>
                  <th className="px-4 py-2">Tamanho</th>
                  <th className="px-4 py-2">Estoque atual</th>
                  <th className="px-4 py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {itemsCatalog.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-100 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3.5 align-top text-sm text-slate-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-3.5 align-top text-xs text-slate-600">
                      {item.category}
                    </td>
                    <td className="px-4 py-3.5 align-top text-xs text-slate-600">
                      {item.size ?? 'único'}
                    </td>

                    {/* Estoque atual (campo editável) */}
                    <td className="px-4 py-3.5 align-top">
                      <input
                        type="number"
                        min={0}
                        className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                        value={editedStock[item.id] ?? String(item.stockQuantity)}
                        onChange={(e) =>
                          setEditedStock((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                      />
                    </td>

                    {/* Botão salvar */}
                    <td className="px-4 py-3.5 align-top">
                      <button
                        onClick={() =>
                          handleSaveStock(
                            item.id,
                            Number(editedStock[item.id] ?? item.stockQuantity),
                          )
                        }
                        className="text-xs font-medium text-emerald-700 hover:underline"
                      >
                        Salvar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

      </div>
    </main>
  );
}
