import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';

interface DeployGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPABASE_SQL = `-- Tabla de puntos de arbolado urbano para Supabase
create extension if not exists "pgcrypto";

create table if not exists public.puntos_arbolado (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  latitud double precision not null check (latitud >= -90 and latitud <= 90),
  longitud double precision not null check (longitud >= -180 and longitud <= 180),
  codigo_arbol text not null unique,
  especie text not null,
  tarea text not null check (tarea in ('riego', 'poda')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tres ejemplos iniciales en ubicaciones distintas
insert into public.puntos_arbolado (nombre, latitud, longitud, codigo_arbol, especie, tarea)
values
  ('Jacarandá de Plaza Italia', -34.581245, -58.420982, 'ARB-001', 'Jacaranda mimosifolia', 'riego'),
  ('Tipa del Rosedal', -34.570891, -58.417315, 'ARB-002', 'Tipuana tipu', 'poda'),
  ('Ceibo de Parque Centenario', -34.606432, -58.435718, 'ARB-003', 'Erythrina crista-galli', 'riego')
on conflict (codigo_arbol) do nothing;`;

export function DeployGuideModal({ isOpen, onClose }: DeployGuideModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="supabase-guide-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="supabase-guide-title" className="text-lg font-bold text-slate-900">
            Esquema Supabase y despliegue en Render
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar guía"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">
                1. Ejecutá este SQL en el Editor SQL de Supabase
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copiar SQL
                  </>
                )}
              </button>
            </div>
            <pre className="mt-2 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
              {SUPABASE_SQL}
            </pre>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold text-slate-700">
              2. Variables de entorno requeridas en Render
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="font-mono font-semibold text-slate-900">SUPABASE_URL</p>
                <p className="mt-1">URL del proyecto en Supabase.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="font-mono font-semibold text-slate-900">
                  SUPABASE_SERVICE_ROLE_KEY
                </p>
                <p className="mt-1">Clave privada del servidor en Supabase.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
