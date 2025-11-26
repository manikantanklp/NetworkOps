import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:8000/api",
});

// Centralized error handling
async function handleRequest(request) {
    try {
        const res = await request;
        return res.data;
    } catch (err) {
        console.error("API Error:", err);
        throw err;
    }
}

// Inventory / Devices
export const getInventory = () => API.get("/inventory");
export const addDevice = (device) => API.post("/device", device);
export const deleteDevice = (ip) => API.delete(`/device/${ip}`);
export const runDiscovery = (start_ip) => API.post("/discover", { start_ip });
export const getStatus = () => API.get("/status");
export const pushConfig = ({ ip, config }) => API.post("/push-config", { ip, config });
export const runCommand = ({ ip, command }) => API.post("/run-command", { ip, command });

// Generic handleRequest usage
export const getDevices = () => handleRequest(API.get("/devices"));
export const getHealth = () => handleRequest(API.get("/health"));
export const getAutomationSummary = () => handleRequest(API.get("/automation/summary"));
export const getConfigDiff = (deviceId) => handleRequest(API.get(`/config/${deviceId}`));
export const getCompliance = () => handleRequest(API.get("/compliance"));
export const getAlerts = () => handleRequest(API.get("/alerts"));
export const getTrends = (range = 7) => handleRequest(API.get(`/trends?range=${range}`));
export const getRecommendations = () => handleRequest(API.get("/recommendations"));

export default API;
