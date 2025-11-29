import { useEffect, useState } from "react";
import { getStatus } from "../api";
import "./Dashboard.css";

export default function Dashboard() {
    const [status, setStatus] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await getStatus();
                setStatus(data);
                setLoading(false);
            } catch (err) {
                setError("Failed to load device status");
                setLoading(false);
            }
        };

        fetchStatus();
    }, []);

    if (loading) return <p className="loading">Loading...</p>;
    if (error) return <p className="error">{error}</p>;

    const totalDevices = Object.keys(status).length;
    const onlineDevices = Object.values(status).filter(v => v === "ON").length;
    const offlineDevices = totalDevices - onlineDevices;

    return (
        <div className="dashboard-container">
            <h1 className="dashboard-title">Dashboard</h1>

            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <h2>Total Devices</h2>
                    <p className="total">{totalDevices}</p>
                </div>

                <div className="dashboard-card">
                    <h2>Online Devices</h2>
                    <p className="online">{onlineDevices}</p>
                </div>

                <div className="dashboard-card">
                    <h2>Offline Devices</h2>
                    <p className="offline">{offlineDevices}</p>
                </div>
            </div>
        </div>
    );
}
