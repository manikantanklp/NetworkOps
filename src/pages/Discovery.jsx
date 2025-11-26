import { useState } from "react";
import { runDiscovery } from "../api"; // Make sure this calls /api/discover
import "./Discovery.css";

export default function Discovery() {
    const [ip, setIp] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        if (!ip.trim()) {
            setError("Please enter a valid IP address");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await runDiscovery(ip.trim());
            setResult(res.data);
        } catch (err) {
            setError(
                err.response?.data?.error || "Failed to start discovery. Check IP/API."
            );
        } finally {
            setLoading(false);
        }
    };

    const renderDeviceTable = (devices) => {
        if (!devices || devices.length === 0) return <p>No devices found.</p>;

        return (
            <table className="discover-table">
                <thead>
                    <tr>
                        <th>IP Address</th>
                        <th>Hostname</th>
                        <th>Vendor</th>
                        <th>Neighbor Count</th>
                    </tr>
                </thead>
                <tbody>
                    {devices.map((d, idx) => (
                        <tr key={idx}>
                            <td>{d.interfaces[0]}</td>
                            <td>{d.hostname || "Unknown"}</td>
                            <td>{d.vendor || "Unknown"}</td>
                            <td>{d.neighbors?.length ?? 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    return (
        <div className="page">
            <h2>Network Discovery</h2>

            <form onSubmit={submit} className="form">
                <input
                    placeholder="Start IP (e.g. 192.168.1.1)"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                />
                <button type="submit">Run Discovery</button>
            </form>

            {loading && <p className="loading">Discovering... Please wait</p>}
            {error && <p className="error">{error}</p>}

            {result && (
                <div className="result">
                    <h3>Discovery Results</h3>

                    <p>
                        <b>Total Devices Found:</b> {result.devices_found ?? 0}
                    </p>

                    <h4>New Devices</h4>
                    {renderDeviceTable(result.new_devices)}

                    <h4>All Devices</h4>
                    {renderDeviceTable(result.inventory)}
                </div>
            )}
        </div>
    );
}
