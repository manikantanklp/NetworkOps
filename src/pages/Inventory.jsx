import { useState, useEffect } from "react";
import { getInventory } from "../api";
import { FaNetworkWired, FaServer } from "react-icons/fa";
import "./Inventory.css";

export default function Inventory() {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState(""); // 🔍 SEARCH STATE

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const res = await getInventory();
            setDevices(res.data);
            setLoading(false);
        } catch (err) {
            setError("Failed to fetch inventory");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const getDeviceIcon = (hostname) => {
        if (!hostname) return <FaServer size={24} />;

        const lower = hostname.toLowerCase();
        if (lower.startsWith("r")) return <FaNetworkWired size={24} color="#2563eb" />;
        if (lower.startsWith("switch")) return <FaServer size={24} color="#16a34a" />;

        return <FaServer size={24} />;
    };

    // 🔍 FILTER DEVICES BY IP SEARCH
    const filteredDevices = devices.filter((device) =>
        device.interfaces?.some((ip) =>
            ip.toLowerCase().includes(search.toLowerCase())
        )
    );

    if (loading) return <p className="status">Loading inventory...</p>;
    if (error) return <p className="status error">Error: {error}</p>;

    return (
        <div className="inventory-container">
            <h2 className="inventory-title">Network Inventory</h2>

            {/* 🔍 SEARCH FIELD */}
            <input
                type="text"
                placeholder="Search by IP address..."
                className="search-box"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <button className="refresh-btn" onClick={fetchInventory}>
                Refresh
            </button>

            <div className="devices-grid">
                {filteredDevices.map((device, idx) => (
                    <div className="device-card" key={idx}>
                        <span className="device-vendor">{device.vendor}</span>

                        <div className="device-header">
                            {getDeviceIcon(device.hostname)}
                            <h3 className="device-name">{device.hostname}</h3>
                        </div>

                        <div className="device-section">
                            <strong>Interfaces</strong>
                            <ul className="no-bullets">
                                {device.interfaces?.map((ip, i) => (
                                    <li key={i}>{ip}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="device-section">
                            <strong>Neighbors</strong>
                            <ul className="no-bullets">
                                {device.neighbors?.map((nb, i) => (
                                    <li key={i}>
                                        {nb.replace(/(network\.local|netkode\.local)/g, "")}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
