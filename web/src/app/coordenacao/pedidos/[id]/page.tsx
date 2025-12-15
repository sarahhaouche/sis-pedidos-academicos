'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

const CLASS_OPTIONS = [
  '6º Ano - Ensino Fundamental',
  '7º Ano - Ensino Fundamental',
  '8º Ano - Ensino Fundamental',
  '9º Ano - Ensino Fundamental',
  '1º Ano - Ensino Médio',
  '2º Ano - Ensino Médio',
  '3º Ano - Ensino Médio',
];


type User = {
  id: string;
  username: string;
  role: 'COORDENACAO_ADMIN' | 'ESTOQUE_ADMIN';
};

type OrderStatus = 'PENDING' | 'PRODUCING' | 'DELIVERED' | 'CANCELLED';

type Item = {
  id: string;
  name: string;
  category: string;
  size: string | null;
};

type OrderItemForm = {
  itemId: string;
  quantity: number;
};

type OrderFromApi = {
  id: string;
  studentName: string;
  studentClass: string;
  requestedBy: string;
  status: OrderStatus;
  items: {
    id: string;
    quantity: number;
    item: Item;
  }[];
};

export default function EditarPedidoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [user, setUser] = useState<User | null>(null);
  const [itemsCatalog, setItemsCatalog] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const [order, setOrder] = useState<OrderFromApi | null>(null);

  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1) Autorização
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

  // 2) Carregar catálogo de itens
  useEffect(() => {
    async function fetchItems() {
      try {
        setLoadingItems(true);
        const res = await fetch('http://localhost:4000/items?onlyActive=true');
        const data = await res.json();
        setItemsCatalog(data);
      } catch (error) {
        console.error('Erro ao carregar itens:', error);
      } finally {
        setLoadingItems(false);
      }
    }

    fetchItems();
  }, []);

  // 3) Carregar pedido
  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`http://localhost:4000/orders/${orderId}`);
        if (!res.ok) {
          router.replace('/coordenacao');
          return;
        }
        const data: OrderFromApi = await res.json();
        setOrder(data);

        setStudentName(data.studentName);
        setStudentClass(data.studentClass);
        setRequestedBy(data.requestedBy);
        setOrderItems(
          data.items.map((oi) => ({
            itemId: oi.item.id,
            quantity: oi.quantity,
          })),
        );
      } catch (error) {
        console.error('Erro ao carregar pedido:', error);
      }
    }

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, router]);

  function handleAddItemRow() {
    setOrderItems((prev) => [...prev, { itemId: '', quantity: 1 }]);
  }

  function handleRemoveItemRow(index: number) {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleChangeItem(index: number, field: 'itemId' | 'quantity', value: string) {
    setOrderItems((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: field === 'quantity' ? Number(value) || 0 : value,
            }
          : row,
      ),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!order) return;

    if (order.status !== 'PENDING') {
      setError('Somente pedidos pendentes podem ser editados.');
      return;
    }

    if (!studentName || !studentClass || !requestedBy) {
      setError('Preencha nome do aluno, turma e solicitante.');
      return;
    }

    const validItems = orderItems.filter(
      (it) => it.itemId && it.quantity && it.quantity > 0,
    );

    if (validItems.length === 0) {
      setError('Adicione pelo menos um item com quantidade maior que zero.');
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`http://localhost:4000/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          studentClass,
          requestedBy,
          items: validItems,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Erro ao salvar alterações');
        return;
      }

      router.push('/coordenacao');
    } catch (err) {
      console.error(err);
      setError('Erro de conexão com o servidor.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || !order) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Carregando pedido...</p>
      </main>
    );
  }

  const isReadOnly = order.status !== 'PENDING';

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Editar pedido
            </h1>
            <p className="text-sm text-slate-600">
              Pedido de {order.studentName} — status atual: {order.status}
            </p>
            {isReadOnly && (
              <p className="text-xs text-red-600 mt-1">
                Este pedido não está mais pendente e não pode ser editado.
              </p>
            )}
          </div>

          <button
            onClick={() => router.push('/coordenacao')}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
          >
            Voltar ao painel
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
        >
          {/* Dados do aluno */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Nome do aluno
              </label>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                disabled={isReadOnly}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Turma / Série
              </label>
              <select
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                disabled={isReadOnly}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-white disabled:bg-slate-100"
              >
                <option value="">Selecione a turma/série</option>

                {/* se o pedido antigo tiver uma turma fora da lista, garante que ela apareça */}
                {!CLASS_OPTIONS.includes(studentClass) && studentClass && (
                  <option value={studentClass}>{studentClass}</option>
                )}

                {CLASS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Solicitante
              </label>
              <input
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                disabled={isReadOnly}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Itens do pedido */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">
                Itens do pedido
              </h2>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="text-xs font-medium text-slate-900 hover:underline"
                >
                  + Adicionar item
                </button>
              )}
            </div>

            {loadingItems ? (
              <p className="text-xs text-slate-500">Carregando catálogo...</p>
            ) : (
              <div className="space-y-2">
                {orderItems.map((row, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      value={row.itemId}
                      onChange={(e) =>
                        handleChangeItem(index, 'itemId', e.target.value)
                      }
                      disabled={isReadOnly}
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100"
                    >
                      <option value="">Selecione um item</option>
                      {itemsCatalog.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} {item.size ? `(${item.size})` : ''}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) =>
                        handleChangeItem(index, 'quantity', e.target.value)
                      }
                      disabled={isReadOnly}
                      className="w-20 rounded-md border border-slate-300 px-2 py-2 text-sm text-right outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100"
                    />

                    {!isReadOnly && orderItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {!isReadOnly && (
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          )}
        </form>
      </div>
    </main>
  );
}
