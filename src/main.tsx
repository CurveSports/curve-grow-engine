import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/bebas-neue/400.css";
import "@fontsource/oswald/400.css";
import "@fontsource/oswald/700.css";
import "@fontsource/anton/400.css";
import "@fontsource/archivo-black/400.css";

createRoot(document.getElementById("root")!).render(<App />);
