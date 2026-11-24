import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Crosshair, Droplets, Scissors, X } from 'lucide-react';
import { validateTreeForm } from '../types/tree.ts';
import type {
  TreePoint,
  TreePointInput,
  TreeTask,
  ValidationErrors,
} from '../types/tree.ts';

interface TreeFormModalProps {
  isOpen: boolean;
  editingTree: TreePoint | null;
  draftValues: {
    nombre: string;
    codigo_arbol: string;
    especie: string;
    tarea: TreeTask;
    latitud: string;
    longitud: string;
  };
  onDraftChange: (next: {
    nombre: string;
    codigo_arbol: string;
    especie: string;
    tarea: TreeTask;
    latitud: string;
    longitud: string;
  }) => void;
  onStartPickOnMap: () => void;
  onClose: () => void;
  onSubmit: (payload: TreePointInput) => Promise<string | null>;
}

export function TreeFormModal({
  isOpen,
  editingTree,
  draftValues,
  onDraftChange,
  onStartPickOnMap,
  onClose,
  onSubmit,
}: TreeFormModalProps) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setErrors({});
    setServerError(null);
  }, [isOpen, editingTree]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const result = validateTreeForm(draftValues);
    if (!result.valid || !result.parsed) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    const errMsg = await onSubmit(result.parsed);
    setIsSubmitting(false);

    if (errMsg) {
      setServerError(errMsg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tree-form-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="tree-form-title" className="text-lg font-bold text-slate-900">
            {editingTree ? 'Editar punto de arbolado' : 'Agregar punto de arbolado'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6" noValidate>
          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
            >
              {serverError}
            </div>
          )}

          <div>
            <label
              htmlFor="tree-nombre"
              className="block text-xs font-semibold text-slate-700"
            >
              Nombre del punto
            </label>
            <input
              id="tree-nombre"
              type="text"
              value={draftValues.nombre}
              onChange={(e) =>
                onDraftChange({ ...draftValues, nombre: e.target.value })
              }
              placeholder="Ej. Lapacho de Plaza San Martín"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
            />
            {errors.nombre && (
              <p className="mt-1 text-xs text-red-600">{errors.nombre}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tree-codigo"
                className="block text-xs font-semibold text-slate-700"
              >
                Código de árbol
              </label>
              <input
                id="tree-codigo"
                type="text"
                value={draftValues.codigo_arbol}
                onChange={(e) =>
                  onDraftChange({ ...draftValues, codigo_arbol: e.target.value })
                }
                placeholder="Ej. ARB-004"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
              />
              {errors.codigo_arbol && (
                <p className="mt-1 text-xs text-red-600">{errors.codigo_arbol}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="tree-especie"
                className="block text-xs font-semibold text-slate-700"
              >
                Especie
              </label>
              <input
                id="tree-especie"
                type="text"
                value={draftValues.especie}
                onChange={(e) =>
                  onDraftChange({ ...draftValues, especie: e.target.value })
                }
                placeholder="Ej. Handroanthus impetiginosus"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
              />
              {errors.especie && (
                <p className="mt-1 text-xs text-red-600">{errors.especie}</p>
              )}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700">
              Tarea asignada
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => onDraftChange({ ...draftValues, tarea: 'riego' })}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  draftValues.tarea === 'riego'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
                Riego
              </button>
              <button
                type="button"
                onClick={() => onDraftChange({ ...draftValues, tarea: 'poda' })}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  draftValues.tarea === 'poda'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
                Poda
              </button>
            </div>
            {errors.tarea && (
              <p className="mt-1 text-xs text-red-600">{errors.tarea}</p>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Coordenadas (grados decimales)
              </span>
              <button
                type="button"
                onClick={onStartPickOnMap}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 whitespace-nowrap shrink-0"
              >
                <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
                Elegir en el mapa
              </button>
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="tree-latitud"
                  className="block text-xs font-medium text-slate-600"
                >
                  Latitud (−90 a 90)
                </label>
                <input
                  id="tree-latitud"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={draftValues.latitud}
                  onChange={(e) =>
                    onDraftChange({ ...draftValues, latitud: e.target.value })
                  }
                  placeholder="-34.581245"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                />
                {errors.latitud && (
                  <p className="mt-1 text-xs text-red-600">{errors.latitud}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="tree-longitud"
                  className="block text-xs font-medium text-slate-600"
                >
                  Longitud (−180 a 180)
                </label>
                <input
                  id="tree-longitud"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={draftValues.longitud}
                  onChange={(e) =>
                    onDraftChange({ ...draftValues, longitud: e.target.value })
                  }
                  placeholder="-58.420982"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                />
                {errors.longitud && (
                  <p className="mt-1 text-xs text-red-600">{errors.longitud}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isSubmitting
                ? 'Guardando...'
                : editingTree
                  ? 'Guardar cambios'
                  : 'Crear punto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
