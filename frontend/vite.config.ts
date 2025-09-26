import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: keep base at "/" so /public assets resolve like "/bgm.mp3"
export default defineConfig({
  plugins: [react()],
  base: "/",
  assetsInclude: ["**/*.mp3", "**/*.wav", "**/*.ogg"]
});
