import { Capacitor } from "@capacitor/core";

/**
 * Opens a link outside the game: a web page in the browser, a `lightning:` link in the
 * wallet app. Inside the Android app, navigating away hands the link to the system.
 */
export function openExternal(url: string): void {
  if (Capacitor.isNativePlatform()) {
    window.location.href = url;
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
