import { useState, useEffect } from "react";
import { getInventory, pushConfig, runCommand } from "../api";
import "./ConfigPush.css";

export default function ConfigPush() {
    const [devices, setDevices] = useState([]);
    const [selectedIp, setSelectedIp] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [config, setConfig] = useState("");
    const [result, setResult] = useState(null);
    const [sshStatus, setSshStatus] = useState(null);
    const [loadingSSH, setLoadingSSH] = useState(false);
    const [loadingPush, setLoadingPush] = useState(false);

    // Load devices (dropdown)
    useEffect(() => {
        async function loadInventory() {
            try {
                const res = await getInventory();
                setDevices(res);
            } catch (err) {
                console.error("Failed to load inventory", err);
            }
        }
        loadInventory();
    }, []);

    // Test SSH connection to device
    const testSSH = async () => {
        if (!selectedIp) {
            setSshStatus("Please choose a device first.");
            return;
        }
        if (!username || !password) {
            setSshStatus("Enter username and password.");
            return;
        }

        setLoadingSSH(true);
        setSshStatus("Testing SSH connection...");

        try {
            const res = await runCommand({
                ip: selectedIp,
                username,
                password,
                command: "show ip int br"
            });

            setSshStatus("SSH Connection Successful ✔️");
        } catch (err) {
            setSshStatus("SSH Failed ❌ Check device connectivity.");
        } finally {
            setLoadingSSH(false);
        }
    };

    // Push configuration
    const submit = async (e) => {
        e.preventDefault();

        if (!selectedIp) {
            setResult("Please choose a device.");
            return;
        }
        if (!username || !password) {
            setResult("Username/password required.");
            return;
        }
        if (!config.trim()) {
            setResult("Please enter configuration.");
            return;
        }

        setLoadingPush(true);
        setResult("Pushing configuration...");

        try {
            const res = await pushConfig({
                ip: selectedIp,
                username,
                password,
                config
            });

            setResult(res);
        } catch (err) {
            setResult("Push failed. Check API/device.");
        } finally {
            setLoadingPush(false);
        }
    };

    return (
        <div className="page">
            <h2>Push Configuration</h2>

            {/* Device selector */}
            <div className="form">
                <label>Select Device</label>

                <select
                    className="select"
                    value={selectedIp}
                    onChange={(e) => setSelectedIp(e.target.value)}
                >
                    <option value="">-- Select Device --</option>

                    {devices.map((d, idx) => (
                        <option key={idx} value={d.interfaces[0]}>
                            {d.hostname} ({d.interfaces[0]})
                        </option>
                    ))}
                </select>

                {/* Username */}
                <label>Username</label>
                <input
                    className="input"
                    placeholder="Enter SSH username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                {/* Password */}
                <label>Password</label>
                <input
                    className="input"
                    type="password"
                    placeholder="Enter SSH password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    type="button"
                    className="connect-btn"
                    onClick={testSSH}
                    disabled={loadingSSH}
                >
                    {loadingSSH ? "Testing..." : "Test SSH Connection"}
                </button>

                {sshStatus && <p className="ssh-status">{sshStatus}</p>}
            </div>

            {/* Config form */}
            <form onSubmit={submit} className="form">
                <label>Configuration Commands</label>
                <textarea
                    className="textarea"
                    placeholder="Enter configuration commands..."
                    value={config}
                    onChange={(e) => setConfig(e.target.value)}
                />

                <button className="push-btn" type="submit" disabled={loadingPush}>
                    {loadingPush ? "Pushing..." : "Push Config"}
                </button>
            </form>

            {/* Result Box */}
            {result && (
                <pre className="result-box">
                    {typeof result === "string"
                        ? result
                        : JSON.stringify(result, null, 2)}
                </pre>
            )}
        </div>
    );
}
