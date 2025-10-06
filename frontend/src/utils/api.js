// frontend/src/utils/api.js
const API_URL = "http://127.0.0.1:5000/api"; // Flask base URL

export async function helloFlask() {
  try {
    const response = await fetch(`${API_URL}/hello`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error connecting to Flask:", error);
    return null;
  }
}
