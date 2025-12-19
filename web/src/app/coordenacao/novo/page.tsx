'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function NovoPedidoPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [itemsCatalog, setItemsCatalog] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([
    { itemId: '', quantity: 1 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Garante que só coordenação entra
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
    setRequestedBy(parsed.username); // já preenche com o usuário logado
  }, [router]);

  // Carrega catálogo de itens
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    async function fetchItems() {
      try {
        setLoadingItems(true);
        const res = await fetch(`${API_URL}/items?onlyActive=true`)
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
              [field]:
                field === 'quantity' ? Number(value) || 0 : value,
            }
          : row,
      ),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

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

      const API_URL = process.env.NEXT_PUBLIC_API_URL;

      const res = await fetch('${API_URL}/orders', {
        method: 'POST',
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
        setError(data?.error ?? 'Erro ao criar pedido');
        return;
      }

      // deu certo: volta para o painel
      router.push('/coordenacao');
    } catch (err) {
      console.error(err);
      setError('Erro de conexão com o servidor.');
    } finally {
      setSubmitting(false);
    }
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
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Novo pedido
            </h1>
            <p className="text-sm text-slate-600">
              Preencha os dados do aluno e selecione os itens que serão
              solicitados.
            </p>
          </div>

          <button
            onClick={() => router.push('/coordenacao')}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
          >
            Voltar ao painel
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          {/* Dados do aluno */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Nome do aluno
              </label>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Turma / Série
              </label>
              <select
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 bg-white"
              >
                <option value="">Selecione a turma/série</option>
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
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                placeholder="Nome de quem está cadastrando o pedido"
              />
            </div>
          </div>

          {/* Itens do pedido */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">
                Itens do pedido
              </h2>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs font-medium text-slate-900 hover:underline"
              >
                + Adicionar item
              </button>
            </div>

            {loadingItems ? (
              <p className="text-xs text-slate-500">Carregando catálogo...</p>
            ) : itemsCatalog.length === 0 ? (
              <p className="text-xs text-red-600">
                Nenhum item cadastrado. Cadastre itens primeiro.
              </p>
            ) : (
              <div className="space-y-2">
                {orderItems.map((row, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-center"
                  >
                    <select
                      value={row.itemId}
                      onChange={(e) =>
                        handleChangeItem(index, 'itemId', e.target.value)
                      }
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
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
                      className="w-20 rounded-md border border-slate-300 px-2 py-2 text-sm text-right outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    />

                    {orderItems.length > 1 && (
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

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? 'Enviando...' : 'Criar pedido'}
          </button>
        </form>
      </div>
    </main>
  );
}
