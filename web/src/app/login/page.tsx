'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type LoginResponse = {
  id: string;
  username: string;
  role: 'COORDENACAO_ADMIN' | 'ESTOQUE_ADMIN';
};

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setError(null);

    if (!username || !password) {
      setError('Informe usuário e senha.');
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch('http://localhost:4000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data: LoginResponse | { error?: string } = await res.json();

      if (!res.ok) {
        setError(
          (data as any)?.error ?? 'Não foi possível fazer login. Tente novamente.',
        );
        return;
      }

      // salva usuário no localStorage para os outros painéis
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sis_pedidos:user', JSON.stringify(data));
      }

      const role = (data as LoginResponse).role;

      if (role === 'COORDENACAO_ADMIN') {
        router.replace('/coordenacao');
      } else if (role === 'ESTOQUE_ADMIN') {
        router.replace('/estoque');
      } else {
        router.replace('/');
      }
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Erro de conexão. Verifique se a API está rodando.');
    } finally {
      setSubmitting(false);
    }
  }

  function fillCoord() {
    setUsername('admin_coordenacao');
    setPassword('coord123');
    setError(null);
  }

  function fillEstoque() {
    setUsername('admin_estoque');
    setPassword('estoque123');
    setError(null);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo / título */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-900 text-sm font-semibold mb-3">
            SP
          </div>
          <h1 className="text-2xl font-semibold text-white">
            Sistema de pedidos acadêmicos
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Faça login como coordenação ou estoque para acessar o painel.
          </p>
        </div>

        {/* Card de login */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg shadow-slate-900/20 p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="text-xs font-medium text-slate-700 uppercase tracking-wide"
              >
                Usuário
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                placeholder="admin_coordenacao ou admin_estoque"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium text-slate-700 uppercase tracking-wide"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Rodapézinho */}
        <p className="mt-4 text-center text-[11px] text-slate-400">
          Em caso de dúvida sobre usuário ou senha, procure o time responsável
          pelo sistema.
        </p>
      </div>
    </main>
  );
}
