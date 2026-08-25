const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://suzuki-parts-vision-ai-production.up.railway.app";

export default API_URL;