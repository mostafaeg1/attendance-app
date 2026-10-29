"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// TODO: for rotating sessions, refetch a fresh token from the server every 2s
export function QrDisplay({
  token,
  path,
}: {
  token: string | null;
  /** Overrides the default `/scan/{token}` URL — used for the fixed,
   * per-course QR code, which encodes `/scan/fixed/{courseId}` instead. */
  path?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const hasTarget = Boolean(token || path);

  useEffect(() => {
    if (!hasTarget) return;

    let cancelled = false;
    const scanUrl = `${window.location.origin}${path ?? `/scan/${token}`}`;

    QRCode.toDataURL(scanUrl, { width: 256, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [token, path, hasTarget]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-foreground/10 p-8">
      <div className="flex h-64 w-64 items-center justify-center rounded-lg bg-foreground/5">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="Session QR code" className="h-64 w-64" />
        ) : (
          <span className="px-4 text-center text-sm text-foreground/50">
            {hasTarget ? "Generating QR code…" : "No QR code available"}
          </span>
        )}
      </div>
      <p className="text-sm text-foreground/60">Scan to mark attendance</p>
    </div>
  );
}
