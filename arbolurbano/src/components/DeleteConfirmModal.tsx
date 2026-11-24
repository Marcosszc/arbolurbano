import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { TreePoint } from '../types/tree.ts';

interface DeleteConfirmModalProps {
  tree: TreePoint | null;
  onCancel: () => void;
  onConfirm: (tree: TreePoint) => Promise<void>;
}

export function DeleteConfirmModal({
  tree,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!tree) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm(tree);
    setIsDeleting(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="delete-modal-title" className="text-base font-bold text-slate-900">
            Eliminar punto de arbolado
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar confirmación"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm leading-relaxed text-slate-600">
            ¿Querés eliminar el registro{' '}
            <span className="font-semibold text-slate-900">{tree.nombre}</span> (
            <span className="font-mono text-xs text-slate-800">{tree.codigo_arbol}</span>
            )? Esta acción quitará el marcador del mapa de forma permanente.
          </p>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {isDeleting ? 'Eliminando...' : 'Eliminar registro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
