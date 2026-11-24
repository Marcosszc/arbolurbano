import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Droplets,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Scissors,
  Search,
  Trash2,
} from 'lucide-react';
import { DeleteConfirmModal } from './components/DeleteConfirmModal.tsx';
import { DeployGuideModal } from './components/DeployGuideModal.tsx';
import { OpenStreetTreeMap } from './components/OpenStreetTreeMap.tsx';
import { TreeFormModal } from './components/TreeFormModal.tsx';
import type { TreePoint, TreePointInput, TreeTask } from './types/tree.ts';

type TaskFilter = 'todas' | TreeTask;

interface DraftFormValues {
  nombre: string;
  codigo_arbol: string;
  especie: string;
  tarea: TreeTask;
  latitud: string;
  longitud: string;
}

const EMPTY_DRAFT: DraftFormValues = {
  nombre: '',
  codigo_arbol: '',
  especie: '',
  tarea: 'riego',
  latitud: '',
  longitud: '',
};

function buildGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${lat},${lng}`
  )}`;
}

export default function App() {
  const [trees, setTrees] = useState<TreePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [taskFilter, setTaskFilter] = useState<TaskFilter>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTree, setEditingTree] = useState<TreePoint | null>(null);
  const [draftValues, setDraftValues] = useState<DraftFormValues>(EMPTY_DRAFT);
  const [pickingCoordinates, setPickingCoordinates] = useState(false);

  const [deletingTree, setDeletingTree] = useState<TreePoint | null>(null);
  const [deployGuideOpen, setDeployGuideOpen] = useState(false);

  const loadTrees = useCallback(async (filter: TaskFilter) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const qs = filter === 'todas' ? '' : `?tarea=${encodeURIComponent(filter)}`;
      const res = await fetch(`/api/trees${qs}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'No se pudieron cargar los puntos de arbolado.');
      }
      const data = (await res.json()) as TreePoint[];
      setTrees(data);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Error de conexión al cargar los puntos.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrees(taskFilter);
  }, [taskFilter, loadTrees]);

  const filteredTrees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return trees;
    return trees.filter(
      (item) =>
        item.nombre.toLowerCase().includes(q) ||
        item.codigo_arbol.toLowerCase().includes(q) ||
        item.especie.toLowerCase().includes(q)
    );
  }, [trees, searchQuery]);

  const selectedTree = useMemo(
    () => trees.find((item) => item.id === selectedTreeId) ?? null,
    [trees, selectedTreeId]
  );

  const counts = useMemo(() => {
    let riego = 0;
    let poda = 0;
    for (const t of trees) {
      if (t.tarea === 'riego') riego += 1;
      else if (t.tarea === 'poda') poda += 1;
    }
    return { total: trees.length, riego, poda };
  }, [trees]);

  const openCreateModal = () => {
    setEditingTree(null);
    setDraftValues({
      ...EMPTY_DRAFT,
      tarea: taskFilter === 'poda' ? 'poda' : 'riego',
    });
    setPickingCoordinates(false);
    setFormOpen(true);
  };

  const openEditModal = (tree: TreePoint) => {
    setEditingTree(tree);
    setDraftValues({
      nombre: tree.nombre,
      codigo_arbol: tree.codigo_arbol,
      especie: tree.especie,
      tarea: tree.tarea,
      latitud: String(tree.latitud),
      longitud: String(tree.longitud),
    });
    setPickingCoordinates(false);
    setFormOpen(true);
  };

  const handleStartPickOnMap = () => {
    setFormOpen(false);
    setPickingCoordinates(true);
  };

  const handlePickCoordinates = useCallback((lat: number, lng: number) => {
    setDraftValues((prev) => ({
      ...prev,
      latitud: lat.toFixed(6),
      longitud: lng.toFixed(6),
    }));
    setPickingCoordinates(false);
    setFormOpen(true);
  }, []);

  const handleFormSubmit = async (payload: TreePointInput): Promise<string | null> => {
    try {
      const url = editingTree ? `/api/trees/${editingTree.id}` : '/api/trees';
      const method = editingTree ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        return body?.error || 'No se pudo guardar el registro.';
      }
      const saved = body as TreePoint;
      setFormOpen(false);
      setEditingTree(null);
      await loadTrees(taskFilter);
      if (taskFilter === 'todas' || saved.tarea === taskFilter) {
        setSelectedTreeId(saved.id);
      }
      return null;
    } catch {
      return 'Error de red al guardar el punto.';
    }
  };

  const handleDeleteConfirm = async (tree: TreePoint) => {
    try {
      const res = await fetch(`/api/trees/${tree.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setFetchError(body?.error || 'No se pudo eliminar el registro.');
      } else {
        if (selectedTreeId === tree.id) {
          setSelectedTreeId(null);
        }
        await loadTrees(taskFilter);
      }
    } catch {
      setFetchError('Error de red al eliminar el punto.');
    } finally {
      setDeletingTree(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          <a
            href="#inventario"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            ArboMapa
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#inventario"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Inventario
            </a>
            <a
              href="#mapa"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              OpenStreetMap
            </a>
            <button
              type="button"
              onClick={() => setDeployGuideOpen(true)}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Supabase SQL
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo punto
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {/* Page Heading + Summary Strip */}
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
              Gestión territorial de arbolado urbano
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Registrá ejemplares con coordenadas en grados decimales, filtrá tareas de riego o poda, visualizá cada marcador en OpenStreetMap y abrí su ubicación directa en Google Maps.
            </p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white">
            <div className="px-5 py-3">
              <p className="text-xs font-medium text-slate-500">Puntos visibles</p>
              <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-slate-900">
                {counts.total}
              </p>
            </div>
            <div className="px-5 py-3">
              <p className="text-xs font-medium text-slate-500">Riego</p>
              <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-sky-700">
                {counts.riego}
              </p>
            </div>
            <div className="px-5 py-3">
              <p className="text-xs font-medium text-slate-500">Poda</p>
              <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-amber-700">
                {counts.poda}
              </p>
            </div>
          </div>
        </div>

        {fetchError && (
          <div
            role="alert"
            className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
          >
            <span>{fetchError}</span>
            <button
              type="button"
              onClick={() => loadTrees(taskFilter)}
              className="rounded-md bg-white px-3 py-1.5 font-semibold text-red-700 border border-red-200 hover:bg-red-100 whitespace-nowrap shrink-0"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Main Split Workspace */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
          {/* Left Column: Filters + Tree Inventory List */}
          <section
            id="inventario"
            aria-label="Listado de puntos de arbolado"
            className="flex flex-col rounded-xl border border-slate-200 bg-white lg:col-span-5"
          >
            <div className="space-y-3 border-b border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-900">
                  Puntos registrados
                </h2>

                {/* Interactive Task Filter */}
                <div
                  role="group"
                  aria-label="Filtrar por tarea"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1"
                >
                  <button
                    type="button"
                    onClick={() => setTaskFilter('todas')}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      taskFilter === 'todas'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter('riego')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      taskFilter === 'riego'
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
                    Riego
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter('poda')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      taskFilter === 'poda'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
                    Poda
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, código o especie..."
                  aria-label="Buscar puntos de arbolado"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                />
              </div>
            </div>

            {/* Records List */}
            <div className="flex-1 divide-y divide-slate-200 overflow-y-auto max-h-[540px]">
              {isLoading ? (
                <div className="space-y-4 p-4">
                  {[1, 2, 3].map((idx) => (
                    <div key={idx} className="animate-pulse space-y-2 py-2">
                      <div className="h-4 w-2/3 rounded bg-slate-200" />
                      <div className="h-3 w-1/2 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : filteredTrees.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                  <MapPin className="h-7 w-7 text-slate-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    No hay puntos para mostrar
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-slate-500">
                    Cambiá el filtro de tarea o agregá un nuevo ejemplar con sus coordenadas decimales.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Agregar punto
                  </button>
                </div>
              ) : (
                filteredTrees.map((tree) => {
                  const isSelected = selectedTreeId === tree.id;
                  const isRiego = tree.tarea === 'riego';
                  return (
                    <div
                      key={tree.id}
                      className={`group flex items-start justify-between gap-3 px-4 py-3.5 transition-colors ${
                        isSelected ? 'bg-emerald-50/75' : 'hover:bg-slate-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedTreeId(tree.id)}
                        className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-emerald-700"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">
                            {tree.nombre}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                              isRiego ? 'text-sky-700' : 'text-amber-700'
                            }`}
                          >
                            {isRiego ? (
                              <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {isRiego ? 'Riego' : 'Poda'}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs text-slate-600">
                          <span className="font-mono font-medium text-slate-800">
                            {tree.codigo_arbol}
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span className="italic">{tree.especie}</span>
                        </p>

                        <p className="mt-1 font-mono text-[11px] tabular-nums text-slate-500">
                          {tree.latitud.toFixed(6)}, {tree.longitud.toFixed(6)}
                        </p>
                      </button>

                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <a
                          href={buildGoogleMapsUrl(tree.latitud, tree.longitud)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Ver ${tree.nombre} en Google Maps`}
                          title="Ver en Google Maps"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-700 transition-colors hover:bg-emerald-100/70 hover:text-emerald-900"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                        <button
                          type="button"
                          onClick={() => openEditModal(tree)}
                          aria-label={`Editar ${tree.nombre}`}
                          title="Editar punto"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTree(tree)}
                          aria-label={`Eliminar ${tree.nombre}`}
                          title="Eliminar punto"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Right Column: OpenStreetMap Viewport + Direct Google Maps Link */}
          <section
            id="mapa"
            aria-label="Mapa OpenStreetMap de puntos"
            className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white lg:col-span-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900">
                  {selectedTree ? selectedTree.nombre : 'Mapa OpenStreetMap'}
                </h2>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {selectedTree ? (
                    <>
                      <span className="font-mono">{selectedTree.codigo_arbol}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono tabular-nums">
                        {selectedTree.latitud.toFixed(6)}, {selectedTree.longitud.toFixed(6)}
                      </span>
                    </>
                  ) : (
                    'Seleccioná un registro del listado o un marcador para ver su ubicación.'
                  )}
                </p>
              </div>

              {selectedTree && (
                <a
                  href={buildGoogleMapsUrl(selectedTree.latitud, selectedTree.longitud)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
                >
                  Ver en Google Maps
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </div>

            {pickingCoordinates && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-950">
                <span className="font-medium">
                  Hacé clic en cualquier punto del mapa para capturar la latitud y longitud en grados decimales.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPickingCoordinates(false);
                    setFormOpen(true);
                  }}
                  className="rounded-md border border-emerald-300 bg-white px-3 py-1 font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap shrink-0"
                >
                  Volver al formulario
                </button>
              </div>
            )}

            <div className="relative h-[500px] w-full flex-1 lg:h-[560px]">
              <OpenStreetTreeMap
                trees={filteredTrees}
                selectedTree={selectedTree}
                onSelectTree={(tree) => setSelectedTreeId(tree ? tree.id : null)}
                pickingCoordinates={pickingCoordinates}
                onPickCoordinates={handlePickCoordinates}
              />
            </div>
          </section>
        </div>
      </main>

      <TreeFormModal
        isOpen={formOpen}
        editingTree={editingTree}
        draftValues={draftValues}
        onDraftChange={setDraftValues}
        onStartPickOnMap={handleStartPickOnMap}
        onClose={() => {
          setFormOpen(false);
          setEditingTree(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <DeleteConfirmModal
        tree={deletingTree}
        onCancel={() => setDeletingTree(null)}
        onConfirm={handleDeleteConfirm}
      />

      <DeployGuideModal
        isOpen={deployGuideOpen}
        onClose={() => setDeployGuideOpen(false)}
      />
    </div>
  );
}
