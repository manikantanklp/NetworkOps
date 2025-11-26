
/////////////final
// src/Analytics.jsx
import { useEffect, useMemo, useState } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Cell,
} from "recharts";

import {
    getDevices,
    getAutomationSummary,
    getConfigDiff,
    getCompliance,
    getAlerts,
    getTrends,
    getRecommendations,
} from "../api";

/* ------------------------------------------------------------------
   Helper utilities
   ------------------------------------------------------------------ */

const formatHours = (hours) => {
    const d = Math.floor(hours / 24);
    const h = hours % 24;
    return `${d}d ${h}h`;
};

// Just for left-side rule list UI – names match backend rules
const COMPLIANCE_RULES = [
    { id: "SSH enabled", name: "SSH enabled (no Telnet)", severity: "high" },
    { id: "SNMP community not 'public'", name: "SNMP community not 'public'", severity: "high" },
    { id: "NTP configured", name: "NTP configured", severity: "medium" },
    { id: "Banner configured", name: "Security login banner present", severity: "low" },
];

/* ------------------------------------------------------------------
   Device Inventory Component
   ------------------------------------------------------------------ */

function DeviceInventory({ devices }) {
    const counts = useMemo(() => {
        const routers = devices.filter((d) => d.role === "router").length;
        const dist = devices.filter((d) => d.role === "dist-switch").length;
        const access = devices.filter((d) => d.role === "access-switch").length;
        return { routers, dist, access };
    }, [devices]);

    return (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Device Inventory</h2>
                    <p className="text-sm text-slate-400">
                        All routers, distribution, and access switches in this LAN.
                    </p>
                </div>
                <div className="flex gap-3 text-sm">
                    <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                        Routers: <span className="font-semibold">{counts.routers}</span>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                        Dist: <span className="font-semibold">{counts.dist}</span>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                        Access: <span className="font-semibold">{counts.access}</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-800">
                            <th className="py-2 pr-4">Device</th>
                            <th className="py-2 pr-4">Role</th>
                            <th className="py-2 pr-4">IP</th>
                            <th className="py-2 pr-4">Model / OS</th>
                            <th className="py-2 pr-4">Health</th>
                            <th className="py-2 pr-4">Compliance</th>
                            <th className="py-2 pr-4">Last Backup</th>
                        </tr>
                    </thead>
                    <tbody>
                        {devices.map((d) => (
                            <tr
                                key={d.id}
                                className="border-b border-slate-800/70 hover:bg-slate-800/60"
                            >
                                <td className="py-2 pr-4 font-medium">{d.name}</td>
                                <td className="py-2 pr-4 capitalize">{d.layer}</td>
                                <td className="py-2 pr-4">{d.ipAddress}</td>
                                <td className="py-2 pr-4">
                                    {d.model} ·{" "}
                                    <span className="text-slate-400">{d.osVersion}</span>
                                </td>
                                <td className="py-2 pr-4">
                                    <span className="inline-flex items-center gap-2">
                                        <span>{d.healthScore}%</span>
                                        <span className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                            <span
                                                className="block h-1.5 rounded-full bg-emerald-500"
                                                style={{ width: `${d.healthScore}%` }}
                                            />
                                        </span>
                                    </span>
                                </td>
                                <td className="py-2 pr-4">
                                    <span
                                        className={
                                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium " +
                                            (d.complianceStatus === "compliant"
                                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                                                : d.complianceStatus === "warning"
                                                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/40"
                                                    : "bg-rose-500/15 text-rose-400 border border-rose-500/40")
                                        }
                                    >
                                        {d.complianceStatus}
                                    </span>
                                </td>
                                <td className="py-2 pr-4 text-slate-400">
                                    {d.lastConfigBackup
                                        ? new Date(d.lastConfigBackup).toLocaleString()
                                        : "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------
   Device Health Component
   ------------------------------------------------------------------ */

function DeviceHealth({ devices }) {
    const byRole = useMemo(() => {
        const roles = {
            router: { name: "Routers", count: 0, cpu: 0, mem: 0, health: 0 },
            "dist-switch": {
                name: "Distribution",
                count: 0,
                cpu: 0,
                mem: 0,
                health: 0,
            },
            "access-switch": {
                name: "Access",
                count: 0,
                cpu: 0,
                mem: 0,
                health: 0,
            },
        };
        devices.forEach((d) => {
            const bucket = roles[d.role];
            if (!bucket) return;
            bucket.count++;
            bucket.cpu += d.cpuUsage || 0;
            bucket.mem += d.memoryUsage || 0;
            bucket.health += d.healthScore || 0;
        });
        Object.values(roles).forEach((b) => {
            if (b.count) {
                b.cpu = Math.round(b.cpu / b.count);
                b.mem = Math.round(b.mem / b.count);
                b.health = Math.round(b.health / b.count);
            }
        });
        return roles;
    }, [devices]);

    const cpuChartData = devices.map((d) => ({
        name: d.name,
        cpu: d.cpuUsage,
        health: d.healthScore,
    }));

    if (!devices.length) {
        return null;
    }

    const longestUptime = [...devices].sort(
        (a, b) => (b.uptimeHours || 0) - (a.uptimeHours || 0)
    )[0];
    const shortestUptime = [...devices].sort(
        (a, b) => (a.uptimeHours || 0) - (b.uptimeHours || 0)
    )[0];

    return (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Device Health & Uptime</h2>
                    <p className="text-sm text-slate-400">
                        Average health, CPU, and memory usage by network layer.
                    </p>
                </div>
                <div className="text-xs text-slate-400 text-right">
                    <div>
                        Longest uptime:{" "}
                        <span className="text-slate-100 font-semibold">
                            {longestUptime.name}
                        </span>{" "}
                        ({formatHours(longestUptime.uptimeHours || 0)})
                    </div>
                    <div>
                        Shortest uptime:{" "}
                        <span className="text-slate-100 font-semibold">
                            {shortestUptime.name}
                        </span>{" "}
                        ({formatHours(shortestUptime.uptimeHours || 0)})
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { key: "router", color: "text-cyan-400" },
                    { key: "dist-switch", color: "text-emerald-400" },
                    { key: "access-switch", color: "text-amber-400" },
                ].map(({ key, color }) => {
                    const b = byRole[key];
                    return (
                        <div
                            key={key}
                            className="bg-slate-950/40 border border-slate-800 rounded-lg p-4 flex flex-col gap-1"
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-xs uppercase tracking-wide text-slate-400">
                                    {b.name}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    {b.count} device{b.count !== 1 ? "s" : ""}
                                </p>
                            </div>
                            <p className={`text-2xl font-semibold ${color}`}>
                                {b.health || "--"}%
                            </p>
                            <div className="flex gap-4 text-xs text-slate-300 mt-1">
                                <span>CPU: {b.cpu || "--"}%</span>
                                <span>Memory: {b.mem || "--"}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cpuChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="name" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#020617",
                                border: "1px solid #1f2937",
                                borderRadius: 8,
                                color: "#e5e7eb",
                            }}
                        />
                        <Legend />
                        <Bar dataKey="cpu" name="CPU %" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                        <Bar
                            dataKey="health"
                            name="Health %"
                            fill="#22c55e"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------
   Automation Summary Component
   ------------------------------------------------------------------ */

function AutomationSummary({ summary }) {
    if (!summary) {
        return (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-2">Automation Task Summary</h2>
                <p className="text-sm text-slate-400">No automation data available.</p>
            </div>
        );
    }

    const { total, success, failed, byType = {}, recent = [] } = summary;

    const statusData = [
        { name: "Success", value: success, color: "#22c55e" },
        { name: "Failed", value: failed, color: "#ef4444" },
    ];

    const typeChartData = Object.entries(byType).map(([type, count]) => ({
        type,
        count,
    }));

    const recentTasks = [...recent].slice(0, 5);

    return (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Automation Task Summary</h2>
                    <p className="text-sm text-slate-400">
                        Success rate and recent automation activity.
                    </p>
                </div>
                <div className="text-right text-sm">
                    <div className="text-slate-300">
                        Total Tasks: <span className="font-semibold">{total}</span>
                    </div>
                    <div className="text-slate-400 text-xs">
                        Success: {success} · Failed: {failed}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pie chart */}
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={3}
                                label={(entry) => `${entry.name}: ${entry.value}`}
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#020617",
                                    border: "1px solid #1f2937",
                                    borderRadius: 8,
                                    color: "#e5e7eb",
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Task type bar chart */}
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={typeChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="type" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#020617",
                                    border: "1px solid #1f2937",
                                    borderRadius: 8,
                                    color: "#e5e7eb",
                                }}
                            />
                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent tasks */}
            <div className="mt-2">
                <h3 className="text-sm font-semibold mb-2">Recent Tasks</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="text-left text-slate-400 border-b border-slate-800">
                                <th className="py-2 pr-3">Task ID</th>
                                <th className="py-2 pr-3">Type</th>
                                <th className="py-2 pr-3">Devices</th>
                                <th className="py-2 pr-3">Started</th>
                                <th className="py-2 pr-3">Duration</th>
                                <th className="py-2 pr-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTasks.map((t) => {
                                const durationSec =
                                    (new Date(t.endedAt) - new Date(t.startedAt)) / 1000;
                                return (
                                    <tr
                                        key={t.taskId}
                                        className="border-b border-slate-800/70 hover:bg-slate-800/60"
                                    >
                                        <td className="py-2 pr-3 font-medium">{t.taskId}</td>
                                        <td className="py-2 pr-3 capitalize">{t.taskType}</td>
                                        <td className="py-2 pr-3 text-slate-300">
                                            {t.devicesInvolved?.length || 0} devices
                                        </td>
                                        <td className="py-2 pr-3 text-slate-400">
                                            {new Date(t.startedAt).toLocaleTimeString()}
                                        </td>
                                        <td className="py-2 pr-3 text-slate-300">
                                            {isFinite(durationSec) ? durationSec.toFixed(1) : "-"}s
                                        </td>
                                        <td className="py-2 pr-3">
                                            <span
                                                className={
                                                    "px-2 py-0.5 rounded-full font-medium " +
                                                    (t.status === "success"
                                                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                                                        : "bg-rose-500/15 text-rose-400 border border-rose-500/40")
                                                }
                                            >
                                                {t.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------
   Before / After Config Component
   ------------------------------------------------------------------ */

function BeforeAfterConfig({
    devices,
    selectedDeviceId,
    onChangeDevice,
    configDiff,
}) {
    const device = devices.find((d) => d.id === selectedDeviceId);
    const before = configDiff?.before;
    const after = configDiff?.after;

    return (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Before / After Configuration</h2>
                    <p className="text-sm text-slate-400">
                        Last two config backups and high-level diff for a selected device.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">Device:</span>
                    <select
                        value={selectedDeviceId || ""}
                        onChange={(e) => onChangeDevice(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs"
                    >
                        {devices.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name} ({d.layer})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!before || !after ? (
                <p className="text-sm text-slate-400">
                    Not enough backup history for {device?.name || selectedDeviceId}. Run
                    at least two backups to see diff.
                </p>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4">
                            <p className="text-slate-400 mb-1 text-[11px] uppercase">Before</p>
                            <p className="text-slate-200 font-semibold mb-1">
                                {before.configVersion}
                            </p>
                            <p className="text-slate-400 mb-3">
                                Backup taken at {new Date(before.timestamp).toLocaleString()}
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-slate-200">
                                {(before.changeSummary || before.changes || []).map(
                                    (line, idx) => (
                                        <li key={idx}>{line}</li>
                                    )
                                )}
                            </ul>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4">
                            <p className="text-slate-400 mb-1 text-[11px] uppercase">After</p>
                            <p className="text-slate-200 font-semibold mb-1">
                                {after.configVersion}
                            </p>
                            <p className="text-slate-400 mb-3">
                                Config backup done {new Date(after.timestamp).toLocaleString()}
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-slate-200">
                                {(after.changeSummary || after.changes || []).map((line, idx) => (
                                    <li key={idx}>{line}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="text-xs text-slate-400">
                        <span className="font-semibold text-slate-200">Summary:</span>{" "}
                        Config updated from <strong>{before.configVersion}</strong> to{" "}
                        <strong>{after.configVersion}</strong> on {device?.name}. Diff
                        details come from the backup system.
                    </div>
                </>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------
   Compliance Overview Component
   ------------------------------------------------------------------ */

function ComplianceOverview({ compliance }) {
    if (!compliance) {
        return (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold">Compliance Overview</h2>
                <p className="text-sm text-slate-400">No compliance data available.</p>
            </div>
        );
    }

    const {
        overallCompliancePercent,
        compliant,
        warning,
        nonCompliant,
        devices: complianceDevices = [],
    } = compliance;

    const nonCompliantDevices = complianceDevices.filter(
        (d) => d.status !== "compliant"
    );

    const barData = nonCompliantDevices.map((d) => ({
        device: d.deviceName,
        failedRules: d.failedRules.length,
    }));

    return (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Compliance Overview</h2>
                    <p className="text-sm text-slate-400">
                        Security baseline status across all devices.
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-slate-300">
                        Overall Compliance:{" "}
                        <span className="text-emerald-400 font-semibold">
                            {overallCompliancePercent}%
                        </span>
                    </p>
                    <p className="text-xs text-slate-400">
                        Compliant: {compliant} · Warning: {warning} · Non-compliant:{" "}
                        {nonCompliant}
                    </p>
                </div>
            </div>

            <div className="h-40 mb-2">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="device" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#020617",
                                border: "1px solid #1f2937",
                                borderRadius: 8,
                                color: "#e5e7eb",
                            }}
                        />
                        <Bar
                            dataKey="failedRules"
                            name="Failed rules"
                            fill="#f97316"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                    <h3 className="font-semibold mb-1">Compliance Rules</h3>
                    <ul className="space-y-1 text-slate-300">
                        {COMPLIANCE_RULES.map((r) => (
                            <li key={r.id} className="flex items-center gap-2">
                                <span
                                    className={
                                        "inline-block w-2 h-2 rounded-full " +
                                        (r.severity === "high"
                                            ? "bg-rose-400"
                                            : r.severity === "medium"
                                                ? "bg-amber-400"
                                                : "bg-sky-400")
                                    }
                                />
                                <span>{r.name}</span>
                                <span className="text-[10px] uppercase text-slate-500">
                                    {r.severity}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="font-semibold mb-1">Non-compliant Devices</h3>
                    {nonCompliantDevices.length === 0 ? (
                        <p className="text-slate-400">All devices are compliant 🎉</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="text-left text-slate-400 border-b border-slate-800">
                                        <th className="py-2 pr-3">Device</th>
                                        <th className="py-2 pr-3">Status</th>
                                        <th className="py-2 pr-3">Failed Rules</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {nonCompliantDevices.map((d) => (
                                        <tr
                                            key={d.deviceId}
                                            className="border-b border-slate-800/60 hover:bg-slate-800/60"
                                        >
                                            <td className="py-2 pr-3 text-slate-200">
                                                {d.deviceName}
                                            </td>
                                            <td className="py-2 pr-3 text-slate-300">{d.status}</td>
                                            <td className="py-2 pr-3 text-slate-200">
                                                {d.failedRules.join(", ")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------
   Alerts & Incidents Component
   ------------------------------------------------------------------ */

function AlertsIncidents({ alertsSummary, devices }) {
    if (!alertsSummary) return null;

    const { total, open, closed, recent = [] } = alertsSummary;
    const alerts = recent;

    const severityCounts = alerts.reduce(
        (acc, a) => {
            acc[a.severity] = (acc[a.severity] || 0) + 1;
            return acc;
        },
        { critical: 0, major: 0, minor: 0 }
    );

    const severityChartData = [
        { severity: "critical", count: severityCounts.critical, color: "#ef4444" },
        { severity: "major", count: severityCounts.major, color: "#f97316" },
        { severity: "minor", count: severityCounts.minor, color: "#eab308" },
    ];

    // Alerts per day
    const perDayMap = {};
    alerts.forEach((a) => {
        const date = new Date(a.openedAt).toISOString().slice(0, 10);
        perDayMap[date] = (perDayMap[date] || 0) + 1;
    });
    const perDayData = Object.entries(perDayMap)
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([date, count]) => ({ date, count }));

    const recentAlerts = [...alerts].slice(0, 6);

    return (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Alerts & Incidents</h2>
                    <p className="text-sm text-slate-400">
                        Real-time issues raised by health, compliance, and automation.
                    </p>
                </div>
                <div className="text-right text-sm">
                    <p className="text-slate-300">
                        Total Alerts: <span className="font-semibold">{total}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                        Open: {open} · Closed: {closed}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Severity chart */}
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={severityChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="severity" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#020617",
                                    border: "1px solid #1f2937",
                                    borderRadius: 8,
                                    color: "#e5e7eb",
                                }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {severityChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Alerts per day */}
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={perDayData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="date" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#020617",
                                    border: "1px solid #1f2937",
                                    borderRadius: 8,
                                    color: "#e5e7eb",
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#f97316"
                                strokeWidth={2}
                                dot={{ r: 3, fill: "#f97316" }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold mb-2">Recent Alerts</h3>
                <div className="overflow-x-auto text-xs">
                    <table className="min-w-full">
                        <thead>
                            <tr className="text-left text-slate-400 border-b border-slate-800">
                                <th className="py-2 pr-3">ID</th>
                                <th className="py-2 pr-3">Device</th>
                                <th className="py-2 pr-3">Severity</th>
                                <th className="py-2 pr-3">Type</th>
                                <th className="py-2 pr-3">Opened</th>
                                <th className="py-2 pr-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentAlerts.map((a) => {
                                const device = devices.find((d) => d.id === a.deviceId);
                                return (
                                    <tr
                                        key={a.id}
                                        className="border-b border-slate-800/70 hover:bg-slate-800/60"
                                    >
                                        <td className="py-2 pr-3 font-medium">{a.id}</td>
                                        <td className="py-2 pr-3 text-slate-200">
                                            {device?.name || a.deviceId}
                                        </td>
                                        <td className="py-2 pr-3 capitalize">
                                            <span
                                                className={
                                                    "px-2 py-0.5 rounded-full font-medium " +
                                                    (a.severity === "critical"
                                                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/40"
                                                        : a.severity === "major"
                                                            ? "bg-orange-500/15 text-orange-400 border border-orange-500/40"
                                                            : "bg-yellow-500/15 text-yellow-300 border border-yellow-500/40")
                                                }
                                            >
                                                {a.severity}
                                            </span>
                                        </td>
                                        <td className="py-2 pr-3">{a.type}</td>
                                        <td className="py-2 pr-3 text-slate-400">
                                            {new Date(a.openedAt).toLocaleString()}
                                        </td>
                                        <td className="py-2 pr-3 text-slate-300">
                                            {a.status}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------
   Trends Component
   ------------------------------------------------------------------ */

function TrendsView({ range, setRange, data }) {
    return (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Trends</h2>
                    <p className="text-sm text-slate-400">
                        Device health and automation success over time.
                    </p>
                </div>
                <div className="flex gap-2 text-xs">
                    <button
                        className={
                            "px-3 py-1 rounded-full border " +
                            (range === "7d"
                                ? "bg-slate-100 text-slate-900 border-slate-100"
                                : "bg-slate-900 text-slate-300 border-slate-700")
                        }
                        onClick={() => setRange("7d")}
                    >
                        Last 7 days
                    </button>
                    <button
                        className={
                            "px-3 py-1 rounded-full border " +
                            (range === "30d"
                                ? "bg-slate-100 text-slate-900 border-slate-100"
                                : "bg-slate-900 text-slate-300 border-slate-700")
                        }
                        onClick={() => setRange("30d")}
                    >
                        Last 30 days
                    </button>
                </div>
            </div>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="date" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#020617",
                                border: "1px solid #1f2937",
                                borderRadius: 8,
                                color: "#e5e7eb",
                            }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="avgHealthScore"
                            name="Avg Health %"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={{ r: 3, fill: "#22c55e" }}
                        />
                        <Line
                            type="monotone"
                            dataKey="automationSuccessRate"
                            name="Automation Success %"
                            stroke="#38bdf8"
                            strokeWidth={2}
                            dot={{ r: 3, fill: "#38bdf8" }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------
   Recommendations Component
   ------------------------------------------------------------------ */

function RecommendationsPanel({ recommendations }) {
    if (!recommendations) return null;

    const {
        performance = [],
        reliability = [],
        compliance = [],
        automation = [],
    } = recommendations;

    return (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Recommendations & Next Steps</h2>
            <p className="text-sm text-slate-400">
                Suggested actions based on current health, compliance, and alerts.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
                {/* Performance */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4">
                    <h3 className="font-semibold text-sky-400 mb-2">PERFORMANCE</h3>
                    <ul className="list-disc list-inside space-y-1 text-slate-200">
                        {performance.length ? (
                            performance.map((t, i) => <li key={i}>{t}</li>)
                        ) : (
                            <li>No performance-related insights.</li>
                        )}
                    </ul>
                </div>

                {/* Reliability */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4">
                    <h3 className="font-semibold text-emerald-400 mb-2">RELIABILITY</h3>
                    <ul className="list-disc list-inside space-y-1 text-slate-200">
                        {reliability.length ? (
                            reliability.map((t, i) => <li key={i}>{t}</li>)
                        ) : (
                            <li>No reliability-related insights.</li>
                        )}
                    </ul>
                </div>

                {/* Compliance */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-400 mb-2">COMPLIANCE</h3>
                    <ul className="list-disc list-inside space-y-1 text-slate-200">
                        {compliance.length ? (
                            compliance.map((t, i) => <li key={i}>{t}</li>)
                        ) : (
                            <li>No compliance-related insights.</li>
                        )}
                    </ul>
                </div>

                {/* Automation */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4">
                    <h3 className="font-semibold text-fuchsia-400 mb-2">AUTOMATION</h3>
                    <ul className="list-disc list-inside space-y-1 text-slate-200">
                        {automation.length ? (
                            automation.map((t, i) => <li key={i}>{t}</li>)
                        ) : (
                            <li>No automation-related insights.</li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------
   MAIN DASHBOARD COMPONENT
   ------------------------------------------------------------------ */

function Analytics() {
    const [range, setRange] = useState("7d");

    const [devices, setDevices] = useState([]);
    const [automationSummary, setAutomationSummary] = useState(null);
    const [compliance, setCompliance] = useState(null);
    const [alertsSummary, setAlertsSummary] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [recommendations, setRecommendations] = useState(null);

    const [selectedDeviceId, setSelectedDeviceId] = useState(null);
    const [configDiff, setConfigDiff] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load all data whenever range changes
    useEffect(() => {
        async function loadAll() {
            try {
                setLoading(true);
                setError(null);

                const rangeValue = range === "7d" ? 7 : 30;

                const [
                    devicesRes,
                    autoRes,
                    compRes,
                    alertsRes,
                    trendsRes,
                    recRes,
                ] = await Promise.all([
                    getDevices(),
                    getAutomationSummary(),
                    getCompliance(),
                    getAlerts(),
                    getTrends(rangeValue),
                    getRecommendations(),
                ]);

                const devs = devicesRes.devices || devicesRes;
                setDevices(devs);
                setAutomationSummary(autoRes);
                setCompliance(compRes);
                setAlertsSummary(alertsRes);
                setTrendData(trendsRes.data || []);
                setRecommendations(recRes.insights || recRes);

                // default device for config diff
                if (devs.length && !selectedDeviceId) {
                    const firstId = devs[0].id;
                    setSelectedDeviceId(firstId);
                    const diff = await getConfigDiff(firstId);
                    setConfigDiff(diff);
                }
            } catch (e) {
                console.error(e);
                setError("Failed to load dashboard data from backend.");
            } finally {
                setLoading(false);
            }
        }

        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range]);

    const handleDeviceChange = async (id) => {
        setSelectedDeviceId(id);
        try {
            const diff = await getConfigDiff(id);
            setConfigDiff(diff);
        } catch (e) {
            console.error("Failed to load config diff", e);
        }
    };

    const totalDevices = devices.length;
    const routers = devices.filter((d) => d.role === "router").length;
    const dist = devices.filter((d) => d.role === "dist-switch").length;
    const access = devices.filter((d) => d.role === "access-switch").length;

    const avgHealth =
        devices.length > 0
            ? Math.round(
                devices.reduce((acc, d) => acc + (d.healthScore || 0), 0) /
                devices.length
            )
            : 0;

    const automationSuccessPct =
        automationSummary && automationSummary.total
            ? Math.round(
                (automationSummary.success / automationSummary.total) * 100
            )
            : 0;

    const openAlertsCount =
        alertsSummary?.open != null ? alertsSummary.open : 0;

    const linksCount = 10; // same info text as before

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
                Loading dashboard…
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
                {error}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50">
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">
                            LAN Network Automation Dashboard
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Real-time view of device health, automation status, compliance,
                            and alerts for your campus LAN.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Topology: 2 Core Routers (R1/R2), 2 Distribution Switches
                            (Switch-A/Switch-B), 4 Access Switches (ASW-1..ASW-4).
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2 text-xs">
                            <button
                                className={
                                    "px-3 py-1 rounded-full border " +
                                    (range === "7d"
                                        ? "bg-slate-100 text-slate-900 border-slate-100"
                                        : "bg-slate-900 text-slate-300 border-slate-700")
                                }
                                onClick={() => setRange("7d")}
                            >
                                Last 7 days
                            </button>
                            <button
                                className={
                                    "px-3 py-1 rounded-full border " +
                                    (range === "30d"
                                        ? "bg-slate-100 text-slate-900 border-slate-100"
                                        : "bg-slate-900 text-slate-300 border-slate-700")
                                }
                                onClick={() => setRange("30d")}
                            >
                                Last 30 days
                            </button>
                        </div>
                        <div className="text-xs text-slate-400">
                            {totalDevices} Devices · {routers} Routers · {dist} Distribution ·{" "}
                            {access} Access
                        </div>
                    </div>
                </header>

                {/* Top summary row - quick KPIs */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                            Average Health
                        </p>
                        <p className="text-3xl font-semibold text-emerald-400 mt-1">
                            {avgHealth}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Across all routers and switches
                        </p>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                            Automation Success
                        </p>
                        <p className="text-3xl font-semibold text-sky-400 mt-1">
                            {automationSuccessPct}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {automationSummary?.total || 0} tasks in selected period
                        </p>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                            Open Alerts
                        </p>
                        <p className="text-3xl font-semibold text-rose-400 mt-1">
                            {openAlertsCount}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Critical focus: CPU, OSPF, and interface errors
                        </p>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                            Links & VLANs
                        </p>
                        <p className="text-3xl font-semibold text-amber-400 mt-1">
                            {linksCount}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Core↔Distribution, Distribution↔Access, VLAN10/20/30/40
                        </p>
                    </div>
                </section>

                {/* Main grid sections */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left column - inventory + health */}
                    <div className="lg:col-span-2 space-y-4">
                        <DeviceInventory devices={devices} />
                        <DeviceHealth devices={devices} />
                    </div>

                    {/* Right column - automation + compliance */}
                    <div className="space-y-4">
                        <AutomationSummary summary={automationSummary} />
                        <ComplianceOverview compliance={compliance} />
                    </div>
                </section>

                {/* Next row - before/after + alerts */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <BeforeAfterConfig
                        devices={devices}
                        selectedDeviceId={selectedDeviceId}
                        onChangeDevice={handleDeviceChange}
                        configDiff={configDiff}
                    />
                    <AlertsIncidents alertsSummary={alertsSummary} devices={devices} />
                </section>

                {/* Trends */}
                <section>
                    <TrendsView range={range} setRange={setRange} data={trendData} />
                </section>

                {/* Recommendations */}
                <section>
                    <RecommendationsPanel recommendations={recommendations} />
                </section>
            </div>
        </div>
    );
}

export default Analytics;