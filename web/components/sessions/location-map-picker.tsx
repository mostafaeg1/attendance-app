"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker icon references image files by URL that Next.js's
// bundler doesn't resolve the way a plain webpack/CRA setup would — without
// this the pin renders as a broken image.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_CENTER: [number, number] = [20, 0];
const DEFAULT_ZOOM = 2;
const PICKED_ZOOM = 17;

type LocationMapPickerProps = {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
};

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToPosition({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  const hasFlownRef = useRef(false);

  useEffect(() => {
    if (lat === null || lng === null) return;
    map.setView([lat, lng], Math.max(map.getZoom(), PICKED_ZOOM), {
      animate: hasFlownRef.current,
    });
    hasFlownRef.current = true;
  }, [lat, lng, map]);

  return null;
}

type SearchResult = { display_name: string; lat: string; lon: string };

function AddressSearch({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
      );
      const data = (await res.json()) as SearchResult[];
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Not a <form> — this list of fields already lives inside the
          session's own <form>, and nested forms are invalid HTML. */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="Search for an address"
          className="min-w-0 flex-1 rounded-lg border border-foreground/20 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="shrink-0 rounded-lg border border-foreground/20 px-3 py-2 text-sm hover:bg-foreground/5"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </div>
      {results.length > 0 && (
        <ul className="flex flex-col gap-0.5 rounded-lg border border-foreground/10 bg-background text-sm">
          {results.map((result, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onPick(Number(result.lat), Number(result.lon));
                  setResults([]);
                  setQuery(result.display_name);
                }}
                className="w-full truncate px-3 py-2 text-left hover:bg-foreground/5"
              >
                {result.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LocationMapPicker({ lat, lng, onPick }: LocationMapPickerProps) {
  const mapRef = useRef<LeafletMap | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <AddressSearch onPick={onPick} />
      <div className="h-64 w-full overflow-hidden rounded-lg border border-foreground/20">
        <MapContainer
          center={lat !== null && lng !== null ? [lat, lng] : DEFAULT_CENTER}
          zoom={lat !== null && lng !== null ? PICKED_ZOOM : DEFAULT_ZOOM}
          className="h-full w-full"
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlace onPick={onPick} />
          <FlyToPosition lat={lat} lng={lng} />
          {lat !== null && lng !== null && (
            <Marker
              position={[lat, lng]}
              icon={markerIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target as L.Marker;
                  const position = marker.getLatLng();
                  onPick(position.lat, position.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-foreground/50">
        Click the map or drag the pin to set the exact check-in location.
      </p>
    </div>
  );
}
