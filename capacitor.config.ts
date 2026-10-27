import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.github.itokichi0000.zappybitty",
  appName: "Zappy Bitty",
  webDir: "dist",
  backgroundColor: "#0e1a33",
  plugins: {
    // Edge to edge: the page already keeps its UI clear of the notch with env(safe-area-inset-*).
    SystemBars: {
      insetsHandling: "native",
      initialViewportFitValueHint: "cover",
      style: "DARK",
    },
  },
};

export default config;
