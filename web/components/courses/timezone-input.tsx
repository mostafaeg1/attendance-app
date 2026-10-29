"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getBrowserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const getServerTimezone = () => "UTC";

export function TimezoneInput() {
  const timezone = useSyncExternalStore(subscribe, getBrowserTimezone, getServerTimezone);
  return <input type="hidden" name="timezone" value={timezone} />;
}
