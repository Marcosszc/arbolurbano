export type TreeTask = 'riego' | 'poda';

export interface TreePoint {
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

export interface TreePointInput {
  nombre: string;
  latitud: number;
  longitud: number;
  codigo_arbol: string;
  especie: string;
  tarea: TreeTask;
}

export interface ValidationErrors {
  nombre?: string;
  latitud?: string;
  longitud?: string;
  codigo_arbol?: string;
  especie?: string;
  tarea?: string;
}

export function validateTreeForm(values: {
  nombre: string;
  latitud: string;
  longitud: string;
  codigo_arbol: string;
  especie: string;
  tarea: string;
}): { valid: boolean; errors: ValidationErrors; parsed?: TreePointInput } {
  const errors: ValidationErrors = {};

  const nombre = values.nombre.trim();
  if (!nombre) {
    errors.nombre = 'Ingresá el nombre del punto.';
  } else if (nombre.length > 160) {
    errors.nombre = 'El nombre no puede superar los 160 caracteres.';
  }

  const codigoArbol = values.codigo_arbol.trim();
  if (!codigoArbol) {
    errors.codigo_arbol = 'Ingresá el código de árbol (ej. ARB-004).';
  } else if (codigoArbol.length > 48) {
    errors.codigo_arbol = 'El código no puede superar los 48 caracteres.';
  }

  const especie = values.especie.trim();
  if (!especie) {
    errors.especie = 'Ingresá la especie botánica o común.';
  } else if (especie.length > 120) {
    errors.especie = 'La especie no puede superar los 120 caracteres.';
  }

  if (values.tarea !== 'riego' && values.tarea !== 'poda') {
    errors.tarea = 'Seleccioná una tarea válida (riego o poda).';
  }

  const latRaw = values.latitud.trim().replace(',', '.');
  const latNum = Number(latRaw);
  if (!latRaw || !Number.isFinite(latNum)) {
    errors.latitud = 'Ingresá una latitud numérica en grados decimales.';
  } else if (latNum < -90 || latNum > 90) {
    errors.latitud = 'La latitud debe estar entre −90 y 90 grados decimales.';
  }

  const lngRaw = values.longitud.trim().replace(',', '.');
  const lngNum = Number(lngRaw);
  if (!lngRaw || !Number.isFinite(lngNum)) {
    errors.longitud = 'Ingresá una longitud numérica en grados decimales.';
  } else if (lngNum < -180 || lngNum > 180) {
    errors.longitud = 'La longitud debe estar entre −180 y 180 grados decimales.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    parsed: {
      nombre,
      latitud: Number(latNum.toFixed(6)),
      longitud: Number(lngNum.toFixed(6)),
      codigo_arbol: codigoArbol,
      especie,
      tarea: values.tarea as TreeTask,
    },
  };
}
