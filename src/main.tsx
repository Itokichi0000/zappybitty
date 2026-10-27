/**
 * Entry point: the game canvas with the React overlays on top. No server, no network.
 */
import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import GameCanvas from "@/components/GameCanvas";
import GameFrame from "@/components/GameFrame";

const host = document.getElementById("root");
if (host) {
  createRoot(host).render(
    <GameFrame>
      <GameCanvas />
    </GameFrame>,
  );
}
