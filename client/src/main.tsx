import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "FicNest - Web Novel Platform";

// Add meta description
const metaDescription = document.createElement("meta");
metaDescription.name = "description";
metaDescription.content = "FicNest is a community-driven platform for web novel enthusiasts to read, write, and connect.";
document.head.appendChild(metaDescription);

// Open Graph tags
const ogTitle = document.createElement("meta");
ogTitle.setAttribute("property", "og:title");
ogTitle.content = "FicNest - Web Novel Platform";
document.head.appendChild(ogTitle);

const ogDescription = document.createElement("meta");
ogDescription.setAttribute("property", "og:description");
ogDescription.content = "Discover and share captivating web novels in our growing community of readers and authors.";
document.head.appendChild(ogDescription);

const ogType = document.createElement("meta");
ogType.setAttribute("property", "og:type");
ogType.content = "website";
document.head.appendChild(ogType);

createRoot(document.getElementById("root")!).render(<App />);