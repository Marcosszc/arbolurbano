import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { TreePoint } from '../types/tree.ts';

interface OpenStreetTreeMapProps {
  trees: TreePoint[];
  selectedTree: TreePoint | null;
  onSelectTree: (tree: TreePoint | null) => void;
  pickingCoordinates: boolean;
  onPickCoordinates: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER: [number, number] = [-34.586189, -58.424672];

function createMarkerIcon(tree: TreePoint, isSelected: boolean): L.DivIcon {
  const color = isSelected
    ? '#15803d'
    : tree.tarea === 'riego'
      ? '#0284c7'
      : '#d97706';
  const size = isSelected ? 22 : 16;
  const ring = isSelected ? '0 0 0 4px rgba(21,128,61,0.25)' : '0 2px 6px rgba(15,23,42,0.3)';

  return L.divIcon({
    className: 'custom-osm-tree-marker',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2.5px solid #ffffff;box-shadow:${ring};"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function buildSafePopupContent(tree: TreePoint): HTMLElement {
  const container = document.createElement('div');
  container.className = 'min-w-[200px] text-slate-900';

  const title = document.createElement('p');
  title.className = 'text-sm font-semibold text-slate-900 m-0';
  title.textContent = tree.nombre;
  container.appendChild(title);

  const meta = document.createElement('p');
  meta.className = 'text-xs text-slate-600 mt-1 mb-0';
  const codeSpan = document.createElement('span');
  codeSpan.className = 'font-mono font-medium';
  codeSpan.textContent = tree.codigo_arbol;
  meta.appendChild(codeSpan);
  meta.appendChild(document.createTextNode(' · '));
  const speciesSpan = document.createElement('span');
  speciesSpan.className = 'italic';
  speciesSpan.textContent = tree.especie;
  meta.appendChild(speciesSpan);
  container.appendChild(meta);

  const coords = document.createElement('p');
  coords.className = 'font-mono text-[11px] text-slate-500 mt-1.5 mb-0';
  coords.textContent = `${tree.latitud.toFixed(6)}, ${tree.longitud.toFixed(6)}`;
  container.appendChild(coords);

  const footer = document.createElement('div');
  footer.className =
    'mt-2 pt-1.5 border-t border-slate-200 flex items-center justify-between gap-2 text-xs';

  const taskLabel = document.createElement('span');
  taskLabel.className =
    tree.tarea === 'riego' ? 'font-medium text-sky-700' : 'font-medium text-amber-700';
  taskLabel.textContent = tree.tarea === 'riego' ? 'Tarea: Riego' : 'Tarea: Poda';
  footer.appendChild(taskLabel);

  const gmapsLink = document.createElement('a');
  gmapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${tree.latitud},${tree.longitud}`
  )}`;
  gmapsLink.target = '_blank';
  gmapsLink.rel = 'noopener noreferrer';
  gmapsLink.className = 'font-medium text-emerald-700 hover:underline';
  gmapsLink.textContent = 'Abrir en Google Maps';
  footer.appendChild(gmapsLink);

  container.appendChild(footer);
  return container;
}

export function OpenStreetTreeMap({
  trees,
  selectedTree,
  onSelectTree,
  pickingCoordinates,
  onPickCoordinates,
}: OpenStreetTreeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerInstancesRef = useRef<Record<string, L.Marker>>({});
  const pickingRef = useRef(pickingCoordinates);
  const onPickRef = useRef(onPickCoordinates);
  const onSelectRef = useRef(onSelectTree);

  useEffect(() => {
    pickingRef.current = pickingCoordinates;
  }, [pickingCoordinates]);

  useEffect(() => {
    onPickRef.current = onPickCoordinates;
  }, [onPickCoordinates]);

  useEffect(() => {
    onSelectRef.current = onSelectTree;
  }, [onSelectTree]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = layerGroup;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (pickingRef.current) {
        onPickRef.current(
          Number(e.latlng.lat.toFixed(6)),
          Number(e.latlng.lng.toFixed(6))
        );
      }
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      markerInstancesRef.current = {};
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    markerInstancesRef.current = {};

    for (const tree of trees) {
      const isSelected = selectedTree?.id === tree.id;
      const marker = L.marker([tree.latitud, tree.longitud], {
        icon: createMarkerIcon(tree, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.bindPopup(buildSafePopupContent(tree));
      marker.on('click', () => {
        onSelectRef.current(tree);
      });

      marker.addTo(layerGroup);
      markerInstancesRef.current[tree.id] = marker;
    }

    if (selectedTree) {
      const targetMarker = markerInstancesRef.current[selectedTree.id];
      map.setView([selectedTree.latitud, selectedTree.longitud], Math.max(map.getZoom(), 15), {
        animate: true,
      });
      if (targetMarker) {
        targetMarker.openPopup();
      }
    } else if (trees.length > 1) {
      const bounds = L.latLngBounds(
        trees.map((t) => [t.latitud, t.longitud] as [number, number])
      );
      map.fitBounds(bounds, { padding: [48, 48] });
    } else if (trees.length === 1) {
      map.setView([trees[0].latitud, trees[0].longitud], 15);
    }
  }, [trees, selectedTree]);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full min-h-[480px] ${
        pickingCoordinates ? 'cursor-crosshair' : ''
      }`}
    />
  );
}
