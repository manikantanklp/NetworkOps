import { useState } from "react";
import { pushConfig } from "../api";
import "./ConfigPush.css";

export default function ConfigPush() {
    const [ip, setIp] = useState("");
    const [config, setConfig] = useState("");
    const [result, setResult] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        const res = await pushConfig({ ip, config });
        setResult(res.data);
    };

    return (
        <div className="page">
            <h2>Push Configuration</h2>

            <form onSubmit={submit} className="form">
                <input
                    placeholder="Device IP"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                />
                <textarea
                    placeholder="Enter config"
                    value={config}
                    onChange={(e) => setConfig(e.target.value)}
                />
                <button>Push</button>
            </form>

            {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
        </div>
    );
}
