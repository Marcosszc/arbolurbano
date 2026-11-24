import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

type TreeTask = 'riego' | 'poda';

interface TreePoint {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  codigo_arbol: string;
  especie: string;
  tarea: TreeTask;
  created_at: string;
  updated_at: string;
}

const PORT = Number(process.env.PORT) || 3000;
const TABLE_NAME = 'puntos_arbolado';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'trees.json');

const SEED_TREES: TreePoint[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    nombre: 'Jacarandá de Plaza Italia',
    latitud: -34.581245,
    longitud: -58.420982,
    codigo_arbol: 'ARB-001',
    especie: 'Jacaranda mimosifolia',
    tarea: 'riego',
    created_at: '2026-11-24T09:00:00.000Z',
    updated_at: '2026-11-24T09:00:00.000Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    nombre: 'Tipa del Rosedal',
    latitud: -34.570891,
    longitud: -58.417315,
    codigo_arbol: 'ARB-002',
    especie: 'Tipuana tipu',
    tarea: 'poda',
    created_at: '2026-11-24T09:05:00.000Z',
    updated_at: '2026-11-24T09:05:00.000Z',
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    nombre: 'Ceibo de Parque Centenario',
    latitud: -34.606432,
    longitud: -58.435718,
    codigo_arbol: 'ARB-003',
    especie: 'Erythrina crista-galli',
    tarea: 'riego',
    created_at: '2026-11-24T09:10:00.000Z',
    updated_at: '2026-11-24T09:10:00.000Z',
  },
];

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readLocalTrees(): TreePoint[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_TREES, null, 2), 'utf8');
    return [...SEED_TREES];
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...SEED_TREES];
    }
    return parsed as TreePoint[];
  } catch {
    return [...SEED_TREES];
  }
}

function writeLocalTrees(trees: TreePoint[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(trees, null, 2), 'utf8');
}

function validatePayload(body: unknown): {
  error?: string;
  data?: {
    nombre: string;
    latitud: number;
    longitud: number;
    codigo_arbol: string;
    especie: string;
    tarea: TreeTask;
  };
} {
  if (!body || typeof body !== 'object') {
    return { error: 'Cuerpo de solicitud inválido.' };
  }

  const record = body as Record<string, unknown>;
  const nombre = typeof record.nombre === 'string' ? record.nombre.trim() : '';
  const codigoArbol =
    typeof record.codigo_arbol === 'string' ? record.codigo_arbol.trim() : '';
  const especie = typeof record.especie === 'string' ? record.especie.trim() : '';
  const tarea = record.tarea;

  if (!nombre || nombre.length > 160) {
    return { error: 'El nombre del punto es obligatorio (máximo 160 caracteres).' };
  }
  if (!codigoArbol || codigoArbol.length > 48) {
    return { error: 'El código de árbol es obligatorio (máximo 48 caracteres).' };
  }
  if (!especie || especie.length > 120) {
    return { error: 'La especie es obligatoria (máximo 120 caracteres).' };
  }
  if (tarea !== 'riego' && tarea !== 'poda') {
    return { error: 'La tarea debe ser "riego" o "poda".' };
  }

  const latitud = Number(record.latitud);
  const longitud = Number(record.longitud);

  if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
    return {
      error: 'La latitud debe ser un número decimal válido entre −90 y 90.',
    };
  }
  if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
    return {
      error: 'La longitud debe ser un número decimal válido entre −180 y 180.',
    };
  }

  return {
    data: {
      nombre,
      latitud: Number(latitud.toFixed(6)),
      longitud: Number(longitud.toFixed(6)),
      codigo_arbol: codigoArbol,
      especie,
      tarea,
    },
  };
}

function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9-]{4,64}$/.test(id);
}

async function ensureSupabaseSeeded(supabase: SupabaseClient): Promise<void> {
  try {
    const { count, error } = await supabase
      .from(TABLE_NAME)
      .select('id', { count: 'exact', head: true });
    if (!error && count === 0) {
      await supabase.from(TABLE_NAME).insert(
        SEED_TREES.map(({ nombre, latitud, longitud, codigo_arbol, especie, tarea }) => ({
          nombre,
          latitud,
          longitud,
          codigo_arbol,
          especie,
          tarea,
        }))
      );
    }
  } catch (err) {
    console.error('Supabase initial seed check failed:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  const supabase = getSupabaseClient();
  if (supabase) {
    await ensureSupabaseSeeded(supabase);
  } else {
    readLocalTrees();
  }

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get('/api/trees', async (req: Request, res: Response) => {
    const tareaFilter = typeof req.query.tarea === 'string' ? req.query.tarea.trim() : '';
    if (tareaFilter && tareaFilter !== 'riego' && tareaFilter !== 'poda') {
      res.status(400).json({ error: 'Filtro de tarea inválido.' });
      return;
    }

    try {
      if (supabase) {
        let query = supabase
          .from(TABLE_NAME)
          .select('*')
          .order('created_at', { ascending: false });

        if (tareaFilter === 'riego' || tareaFilter === 'poda') {
          query = query.eq('tarea', tareaFilter);
        }

        const { data, error } = await query;
        if (error) {
          console.error('Supabase GET /api/trees error:', error);
          res.status(500).json({ error: 'No se pudieron consultar los puntos en Supabase.' });
          return;
        }
        res.json(data || []);
        return;
      }

      const localTrees = readLocalTrees();
      const filtered = tareaFilter
        ? localTrees.filter((item) => item.tarea === tareaFilter)
        : localTrees;
      filtered.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      res.json(filtered);
    } catch (err) {
      console.error('GET /api/trees failed:', err);
      res.status(500).json({ error: 'Error interno al listar los registros.' });
    }
  });

  app.post('/api/trees', async (req: Request, res: Response) => {
    const validation = validatePayload(req.body);
    if (validation.error || !validation.data) {
      res.status(400).json({ error: validation.error || 'Datos inválidos.' });
      return;
    }

    const payload = validation.data;

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('Supabase POST /api/trees error:', error);
          if (error.code === '23505') {
            res.status(409).json({ error: 'Ya existe un árbol registrado con ese código.' });
            return;
          }
          res.status(500).json({ error: 'No se pudo guardar el punto en Supabase.' });
          return;
        }
        res.status(201).json(data);
        return;
      }

      const trees = readLocalTrees();
      if (
        trees.some(
          (item) => item.codigo_arbol.toLowerCase() === payload.codigo_arbol.toLowerCase()
        )
      ) {
        res.status(409).json({ error: 'Ya existe un árbol registrado con ese código.' });
        return;
      }

      const now = new Date().toISOString();
      const created: TreePoint = {
        id: crypto.randomUUID(),
        ...payload,
        created_at: now,
        updated_at: now,
      };
      trees.unshift(created);
      writeLocalTrees(trees);
      res.status(201).json(created);
    } catch (err) {
      console.error('POST /api/trees failed:', err);
      res.status(500).json({ error: 'Error interno al crear el registro.' });
    }
  });

  app.put('/api/trees/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    if (!isValidId(id)) {
      res.status(400).json({ error: 'Identificador de registro inválido.' });
      return;
    }

    const validation = validatePayload(req.body);
    if (validation.error || !validation.data) {
      res.status(400).json({ error: validation.error || 'Datos inválidos.' });
      return;
    }

    const payload = validation.data;

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Supabase PUT /api/trees error:', error);
          if (error.code === '23505') {
            res.status(409).json({ error: 'Ya existe otro árbol con ese código.' });
            return;
          }
          if (error.code === 'PGRST116') {
            res.status(404).json({ error: 'Registro no encontrado.' });
            return;
          }
          res.status(500).json({ error: 'No se pudo actualizar el registro en Supabase.' });
          return;
        }
        res.json(data);
        return;
      }

      const trees = readLocalTrees();
      const index = trees.findIndex((item) => item.id === id);
      if (index === -1) {
        res.status(404).json({ error: 'Registro no encontrado.' });
        return;
      }

      const duplicate = trees.some(
        (item) =>
          item.id !== id &&
          item.codigo_arbol.toLowerCase() === payload.codigo_arbol.toLowerCase()
      );
      if (duplicate) {
        res.status(409).json({ error: 'Ya existe otro árbol con ese código.' });
        return;
      }

      const updated: TreePoint = {
        ...trees[index],
        ...payload,
        updated_at: new Date().toISOString(),
      };
      trees[index] = updated;
      writeLocalTrees(trees);
      res.json(updated);
    } catch (err) {
      console.error('PUT /api/trees failed:', err);
      res.status(500).json({ error: 'Error interno al actualizar el registro.' });
    }
  });

  app.delete('/api/trees/:id', async (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    if (!isValidId(id)) {
      res.status(400).json({ error: 'Identificador de registro inválido.' });
      return;
    }

    try {
      if (supabase) {
        const { error, count } = await supabase
          .from(TABLE_NAME)
          .delete({ count: 'exact' })
          .eq('id', id);

        if (error) {
          console.error('Supabase DELETE /api/trees error:', error);
          res.status(500).json({ error: 'No se pudo eliminar el registro en Supabase.' });
          return;
        }
        if (count === 0) {
          res.status(404).json({ error: 'Registro no encontrado.' });
          return;
        }
        res.json({ deleted: true, id });
        return;
      }

      const trees = readLocalTrees();
      const next = trees.filter((item) => item.id !== id);
      if (next.length === trees.length) {
        res.status(404).json({ error: 'Registro no encontrado.' });
        return;
      }
      writeLocalTrees(next);
      res.json({ deleted: true, id });
    } catch (err) {
      console.error('DELETE /api/trees failed:', err);
      res.status(500).json({ error: 'Error interno al eliminar el registro.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
