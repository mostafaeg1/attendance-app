"use client";

import { useState } from "react";
import { useActionState } from "react";
import dynamic from "next/dynamic";
import { createSession, type SessionActionState } from "@/actions/sessions";
import { SESSION_DURATION_OPTIONS } from "@/constants/sessions";
import { Button } from "@/components/ui/button";

const LocationMapPicker = dynamic(
  () => import("./location-map-picker").then((mod) => mod.LocationMapPicker),
  { ssr: false, loading: () => <p className="text-sm text-foreground/60">Loading map…</p> },
);

const initialState: SessionActionState = {};

type StartSessionFormProps = {
  courseId: string;
  defaultTitle: string;
};

type LocationState =
  | { state: "empty" }
  | { state: "locating" }
  | { state: "ready"; lat: number; lng: number; accuracyM: number | null }
  | { state: "error"; message: string };

export function StartSessionForm({
  courseId,
  defaultTitle,
}: StartSessionFormProps) {
  const createSessionForCourse = createSession.bind(null, courseId);
  const [state, formAction, isPending] = useActionState(
    createSessionForCourse,
    initialState,
  );

  const [locationEnabled, setLocationEnabled] = useState(false);
  const [location, setLocation] = useState<LocationState>({ state: "empty" });

  function handleLocationToggle(checked: boolean) {
    setLocationEnabled(checked);
  }

  function handleMapPick(lat: number, lng: number) {
    setLocation({ state: "ready", lat, lng, accuracyM: null });
  }

  function requestCurrentLocation() {
    if (!navigator.geolocation) {
      setLocation({
        state: "error",
        message: "Location isn't supported in this browser.",
      });
      return;
    }
    setLocation({ state: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          state: "ready",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        });
      },
      () => {
        setLocation({
          state: "error",
          message: "Couldn't get your location. Check browser permissions and try again.",
        });
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const hasPosition = location.state === "ready";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Session title
        <input
          name="title"
          type="text"
          required
          defaultValue={defaultTitle}
          className="rounded-lg border border-foreground/20 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Session duration
        <select
          name="duration"
          defaultValue="unlimited"
          className="rounded-lg border border-foreground/20 px-3 py-2"
        >
          {SESSION_DURATION_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} {minutes === 1 ? "minute" : "minutes"}
            </option>
          ))}
          <option value="unlimited">Unlimited</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        QR code
        <select
          name="qrMode"
          defaultValue="static"
          className="rounded-lg border border-foreground/20 px-3 py-2"
        >
          <option value="static">Constant</option>
          <option value="rotating">Changing</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="locationEnabled"
          checked={locationEnabled}
          onChange={(e) => handleLocationToggle(e.target.checked)}
        />
        Require students to check in from this location
      </label>

      {locationEnabled && (
        <div className="flex flex-col gap-3 rounded-lg border border-foreground/10 bg-foreground/5 p-3">
          <LocationMapPicker
            lat={hasPosition ? location.lat : null}
            lng={hasPosition ? location.lng : null}
            onPick={handleMapPick}
          />

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={requestCurrentLocation}
              className="text-sm underline hover:no-underline"
            >
              {location.state === "locating" ? "Getting your location…" : "Use my current location instead"}
            </button>
          </div>

          {hasPosition && (
            <p className="text-sm text-foreground/70">
              Location set ({location.lat.toFixed(5)}, {location.lng.toFixed(5)})
              {location.accuracyM !== null && (
                <>
                  {" "}
                  — accurate to ~{Math.round(location.accuracyM)}m. Set the check-in radius
                  a bit larger than this for reliable scans.
                </>
              )}
            </p>
          )}
          {location.state === "error" && (
            <p className="text-sm text-red-600">{location.message}</p>
          )}

          <label className="flex flex-col gap-1 text-sm">
            Check-in radius (meters)
            <input
              name="locationRadiusM"
              type="number"
              min={1}
              step={1}
              required
              defaultValue={50}
              className="rounded-lg border border-foreground/20 px-3 py-2"
            />
          </label>

          {hasPosition && (
            <>
              <input type="hidden" name="locationLat" value={location.lat} />
              <input type="hidden" name="locationLng" value={location.lng} />
            </>
          )}
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div>
        <Button
          type="submit"
          disabled={isPending || (locationEnabled && !hasPosition)}
        >
          {isPending ? "Starting…" : "Start session"}
        </Button>
      </div>
    </form>
  );
}
