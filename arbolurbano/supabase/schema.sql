-- Tabla de puntos de arbolado urbano para Supabase (PostgreSQL)
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

create index if not exists idx_puntos_arbolado_tarea on public.puntos_arbolado (tarea);

-- Tres ejemplos iniciales en ubicaciones distintas (Buenos Aires)
insert into public.puntos_arbolado (nombre, latitud, longitud, codigo_arbol, especie, tarea)
values
  ('Jacarandá de Plaza Italia', -34.581245, -58.420982, 'ARB-001', 'Jacaranda mimosifolia', 'riego'),
  ('Tipa del Rosedal', -34.570891, -58.417315, 'ARB-002', 'Tipuana tipu', 'poda'),
  ('Ceibo de Parque Centenario', -34.606432, -58.435718, 'ARB-003', 'Erythrina crista-galli', 'riego')
on conflict (codigo_arbol) do nothing;
