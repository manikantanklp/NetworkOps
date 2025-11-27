///new code

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
  const d = Math.floor((hours || 0) / 24);
  const h = (hours || 0) % 24;
  return `${d}d ${h}h`;
};

// For left-side rule list – names match backend rules
const COMPLIANCE_RULES = [
  { id: "SSH enabled", name: "SSH enabled (no Telnet)", severity: "high" },
  {
    id: "SNMP community not 'public'",
    name: "SNMP community not 'public'",
    severity: "high",
  },
  { id: "NTP configured", name: "NTP configured", severity: "medium" },
  { id: "Banner configured", name: "Security login banner", severity: "low" },
];

/* ------------------------------------------------------------------
   DEVICE INVENTORY
   ------------------------------------------------------------------ */

function DeviceInventory({ devices }) {
  const counts = useMemo(() => {
    const routers = devices.filter((d) => d.role === "router").length;
    const dist = devices.filter((d) => d.role === "dist-switch").length;
    const access = devices.filter((d) => d.role === "access-switch").length;
    return { routers, dist, access };
  }, [devices]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Device Inventory
          </h2>
          <p className="text-sm text-gray-500">
            All core, distribution and access switches in this LAN.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <div className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700">
            Routers: <span className="font-semibold">{counts.routers}</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700">
            Distribution: <span className="font-semibold">{counts.dist}</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700">
            Access: <span className="font-semibold">{counts.access}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm bg-white">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="py-2.5 px-4">Device</th>
              <th className="py-2.5 px-4">Layer</th>
              <th className="py-2.5 px-4">IP</th>
              <th className="py-2.5 px-4">Model / OS</th>
              <th className="py-2.5 px-4">Health</th>
              <th className="py-2.5 px-4">Compliance</th>
              <th className="py-2.5 px-4">Last Backup</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d, idx) => (
              <tr
                key={d.id}
                className={
                  "border-t border-gray-100 hover:bg-blue-50/50 transition-colors " +
                  (idx % 2 === 1 ? "bg-gray-50/40" : "")
                }
              >
                <td className="py-2.5 px-4 font-medium text-gray-900">
                  {d.name}
                </td>
                <td className="py-2.5 px-4 capitalize text-gray-700">
                  {d.layer}
                </td>
                <td className="py-2.5 px-4 font-mono text-xs text-gray-700">
                  {d.ipAddress}
                </td>
                <td className="py-2.5 px-4 text-gray-700">
                  {d.model} ·{" "}
                  <span className="text-gray-500">{d.osVersion}</span>
                </td>
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800">{d.healthScore}%</span>
                    <div className="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500"
                        style={{ width: `${d.healthScore || 0}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-4">
                  <span
                    className={
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium " +
                      (d.complianceStatus === "compliant"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : d.complianceStatus === "warning"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200")
                    }
                  >
                    <span
                      className={
                        "w-1.5 h-1.5 rounded-full " +
                        (d.complianceStatus === "compliant"
                          ? "bg-emerald-500"
                          : d.complianceStatus === "warning"
                            ? "bg-amber-500"
                            : "bg-rose-500")
                      }
                    />
                    {d.complianceStatus}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-gray-500 text-xs">
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
   DEVICE HEALTH
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
      "access-switch": { name: "Access", count: 0, cpu: 0, mem: 0, health: 0 },
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

  if (!devices.length) return null;

  const cpuChartData = devices.map((d) => ({
    name: d.name,
    cpu: d.cpuUsage,
    health: d.healthScore,
  }));

  const longestUptime = [...devices].sort(
    (a, b) => (b.uptimeHours || 0) - (a.uptimeHours || 0)
  )[0];
  const shortestUptime = [...devices].sort(
    (a, b) => (a.uptimeHours || 0) - (b.uptimeHours || 0)
  )[0];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Device Health & Uptime
          </h2>
          <p className="text-sm text-gray-500">
            Layer-wise averages for health, CPU and memory usage.
          </p>
        </div>
        <div className="text-xs text-gray-600 text-right space-y-1">
          <div>
            <span className="font-medium text-gray-800">Longest uptime</span>:{" "}
            {longestUptime?.name} ({formatHours(longestUptime?.uptimeHours)})
          </div>
          <div>
            <span className="font-medium text-gray-800">Shortest uptime</span>:{" "}
            {shortestUptime?.name} ({formatHours(shortestUptime?.uptimeHours)})
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: "router", color: "text-blue-600", chip: "bg-blue-50" },
          { key: "dist-switch", color: "text-sky-600", chip: "bg-sky-50" },
          { key: "access-switch", color: "text-indigo-600", chip: "bg-indigo-50" },
        ].map(({ key, color, chip }) => {
          const b = byRole[key];
          return (
            <div
              key={key}
              className={`rounded-xl border border-gray-200 ${chip} px-4 py-3 flex flex-col gap-1`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {b.name}
                </p>
                <p className="text-[11px] text-gray-500">
                  {b.count} device{b.count !== 1 ? "s" : ""}
                </p>
              </div>
              <p className={`text-2xl font-semibold ${color}`}>
                {b.health || "--"}%
              </p>
              <div className="flex gap-4 text-xs text-gray-700 mt-1">
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
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                color: "#111827",
              }}
            />
            <Legend />
            <Bar
              dataKey="cpu"
              name="CPU %"
              fill="#3B82F6"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="health"
              name="Health %"
              fill="#10B981"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   AUTOMATION SUMMARY
   ------------------------------------------------------------------ */

function AutomationSummary({ summary }) {
  if (!summary) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Automation Task Summary
        </h2>
        <p className="text-sm text-gray-500">No automation data available.</p>
      </div>
    );
  }

  const { total, success, failed, byType = {}, recent = [] } = summary;

  const statusData = [
    { name: "Success", value: success, color: "#22C55E" },
    { name: "Failed", value: failed, color: "#EF4444" },
  ];

  const typeChartData = Object.entries(byType).map(([type, count]) => ({
    type,
    count,
  }));

  const recentTasks = [...recent].slice(0, 5);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Automation Task Summary
          </h2>
          <p className="text-sm text-gray-500">
            Success rate and recent automation activity.
          </p>
        </div>
        <div className="text-right text-sm">
          <div className="text-gray-800">
            Total Tasks: <span className="font-semibold">{total}</span>
          </div>
          <div className="text-gray-500 text-xs">
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
                  backgroundColor: "#ffffff",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  color: "#111827",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Task type bar chart */}
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="type" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  color: "#111827",
                }}
              />
              <Bar
                dataKey="count"
                fill="#6366F1"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent tasks */}
      <div className="mt-2">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Recent Tasks
        </h3>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-xs bg-white">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="py-2 px-3">Task ID</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Devices</th>
                <th className="py-2 px-3">Started</th>
                <th className="py-2 px-3">Duration</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTasks.map((t, idx) => {
                const durationSec =
                  (new Date(t.endedAt) - new Date(t.startedAt)) / 1000;
                return (
                  <tr
                    key={t.taskId}
                    className={
                      "border-t border-gray-100 hover:bg-blue-50/50 " +
                      (idx % 2 === 1 ? "bg-gray-50/40" : "")
                    }
                  >
                    <td className="py-2 px-3 font-medium text-gray-900">
                      {t.taskId}
                    </td>
                    <td className="py-2 px-3 capitalize text-gray-700">
                      {t.taskType}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {t.devicesInvolved?.length || 0} devices
                    </td>
                    <td className="py-2 px-3 text-gray-500">
                      {new Date(t.startedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 text-gray-700">
                      {isFinite(durationSec) ? durationSec.toFixed(1) : "-"}s
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={
                          "px-2.5 py-0.5 rounded-full text-xs font-medium " +
                          (t.status === "success"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200")
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
   BEFORE / AFTER CONFIG
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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Before / After Configuration
          </h2>
          <p className="text-sm text-gray-500">
            Last two config backups and high-level diff for a selected device.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Device:</span>
          <select
            value={selectedDeviceId || ""}
            onChange={(e) => onChangeDevice(e.target.value)}
            className="bg-white border border-gray-300 rounded-md px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <p className="text-sm text-gray-500">
          Not enough backup history for {device?.name || selectedDeviceId}. Run
          at least two backups to see diff.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-blue-700 uppercase mb-1">
                Before
              </p>
              <p className="text-gray-900 font-semibold mb-1">
                {before.configVersion}
              </p>
              <p className="text-gray-600 mb-3">
                Backup taken at{" "}
                {new Date(before.timestamp).toLocaleString()}
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                {(before.changeSummary || before.changes || []).map(
                  (line, idx) => (
                    <li key={idx}>{line}</li>
                  )
                )}
              </ul>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-emerald-700 uppercase mb-1">
                After
              </p>
              <p className="text-gray-900 font-semibold mb-1">
                {after.configVersion}
              </p>
              <p className="text-gray-600 mb-3">
                Config backup done{" "}
                {new Date(after.timestamp).toLocaleString()}
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                {(after.changeSummary || after.changes || []).map(
                  (line, idx) => (
                    <li key={idx}>{line}</li>
                  )
                )}
              </ul>
            </div>
          </div>

          <div className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">Summary:</span>{" "}
            Config updated from <strong>{before.configVersion}</strong> to{" "}
            <strong>{after.configVersion}</strong> on {device?.name}. Diff
            details come from your backup system.
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   COMPLIANCE OVERVIEW
   ------------------------------------------------------------------ */

function ComplianceOverview({ compliance }) {
  if (!compliance) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Compliance Overview
        </h2>
        <p className="text-sm text-gray-500">No compliance data available.</p>
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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Compliance Overview
          </h2>
          <p className="text-sm text-gray-500">
            Security baseline status across all devices.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-800">
            Overall Compliance:{" "}
            <span className="text-emerald-600 font-semibold">
              {overallCompliancePercent}%
            </span>
          </p>
          <p className="text-xs text-gray-500">
            Compliant: {compliant} · Warning: {warning} · Non-compliant:{" "}
            {nonCompliant}
          </p>
        </div>
      </div>

      <div className="h-40 mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="device" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                color: "#111827",
              }}
            />
            <Bar
              dataKey="failedRules"
              name="Failed rules"
              fill="#F97316"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <h3 className="font-semibold mb-2 text-gray-900">
            Compliance Rules
          </h3>
          <ul className="space-y-1 text-gray-800">
            {COMPLIANCE_RULES.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span
                  className={
                    "inline-block w-2 h-2 rounded-full " +
                    (r.severity === "high"
                      ? "bg-rose-500"
                      : r.severity === "medium"
                        ? "bg-amber-500"
                        : "bg-sky-500")
                  }
                />
                <span>{r.name}</span>
                <span className="text-[10px] uppercase text-gray-500">
                  {r.severity}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-2 text-gray-900">
            Non-compliant Devices
          </h3>
          {nonCompliantDevices.length === 0 ? (
            <p className="text-gray-500">All devices are compliant 🎉</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500">
                    <th className="py-2 px-3">Device</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Failed Rules</th>
                  </tr>
                </thead>
                <tbody>
                  {nonCompliantDevices.map((d, idx) => (
                    <tr
                      key={d.deviceId}
                      className={
                        "border-t border-gray-100 " +
                        (idx % 2 === 1 ? "bg-gray-50/40" : "")
                      }
                    >
                      <td className="py-2 px-3 text-gray-900">
                        {d.deviceName}
                      </td>
                      <td className="py-2 px-3 text-gray-700">{d.status}</td>
                      <td className="py-2 px-3 text-gray-800">
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
   ALERTS & INCIDENTS
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
    { severity: "critical", count: severityCounts.critical, color: "#EF4444" },
    { severity: "major", count: severityCounts.major, color: "#F97316" },
    { severity: "minor", count: severityCounts.minor, color: "#EAB308" },
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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Alerts & Incidents
          </h2>
          <p className="text-sm text-gray-500">
            Issues raised by health checks, compliance and automation.
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-gray-800">
            Total Alerts: <span className="font-semibold">{total}</span>
          </p>
          <p className="text-xs text-gray-500">
            Open: {open} · Closed: {closed}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity chart */}
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={severityChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="severity" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  color: "#111827",
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  color: "#111827",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#F97316"
                strokeWidth={2}
                dot={{ r: 3, fill: "#F97316" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Recent Alerts
        </h3>
        <div className="overflow-x-auto border border-gray-200 rounded-xl text-xs bg-white">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3">Device</th>
                <th className="py-2 px-3">Severity</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Opened</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.map((a, idx) => {
                const device = devices.find((d) => d.id === a.deviceId);
                return (
                  <tr
                    key={a.id}
                    className={
                      "border-t border-gray-100 hover:bg-blue-50/50 " +
                      (idx % 2 === 1 ? "bg-gray-50/40" : "")
                    }
                  >
                    <td className="py-2 px-3 font-medium text-gray-900">
                      {a.id}
                    </td>
                    <td className="py-2 px-3 text-gray-800">
                      {device?.name || a.deviceId}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={
                          "px-2.5 py-0.5 rounded-full text-xs font-medium capitalize " +
                          (a.severity === "critical"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : a.severity === "major"
                              ? "bg-orange-50 text-orange-700 border border-orange-200"
                              : "bg-yellow-50 text-yellow-700 border border-yellow-200")
                        }
                      >
                        {a.severity}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-700">{a.type}</td>
                    <td className="py-2 px-3 text-gray-500">
                      {new Date(a.openedAt).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-gray-700">{a.status}</td>
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
   TRENDS
   ------------------------------------------------------------------ */

function TrendsView({ range, setRange, data }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Trends</h2>
          <p className="text-sm text-gray-500">
            Device health and automation success over time.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            className={
              "px-3 py-1 rounded-full border text-sm " +
              (range === "7d"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50")
            }
            onClick={() => setRange("7d")}
          >
            Last 7 days
          </button>
          <button
            className={
              "px-3 py-1 rounded-full border text-sm " +
              (range === "30d"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50")
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
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                color: "#111827",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="avgHealthScore"
              name="Avg Health %"
              stroke="#22C55E"
              strokeWidth={2}
              dot={{ r: 3, fill: "#22C55E" }}
            />
            <Line
              type="monotone"
              dataKey="automationSuccessRate"
              name="Automation Success %"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 3, fill: "#3B82F6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   RECOMMENDATIONS
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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">
        Recommendations & Next Steps
      </h2>
      <p className="text-sm text-gray-500">
        Suggested actions based on current health, compliance, and alerts.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
        {/* Performance */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <h3 className="font-semibold text-blue-700 mb-2 text-xs uppercase">
            Performance
          </h3>
          <ul className="list-disc list-inside space-y-1 text-gray-800">
            {performance.length ? (
              performance.map((t, i) => <li key={i}>{t}</li>)
            ) : (
              <li>No performance-related insights.</li>
            )}
          </ul>
        </div>

        {/* Reliability */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
          <h3 className="font-semibold text-emerald-700 mb-2 text-xs uppercase">
            Reliability
          </h3>
          <ul className="list-disc list-inside space-y-1 text-gray-800">
            {reliability.length ? (
              reliability.map((t, i) => <li key={i}>{t}</li>)
            ) : (
              <li>No reliability-related insights.</li>
            )}
          </ul>
        </div>

        {/* Compliance */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
          <h3 className="font-semibold text-amber-700 mb-2 text-xs uppercase">
            Compliance
          </h3>
          <ul className="list-disc list-inside space-y-1 text-gray-800">
            {compliance.length ? (
              compliance.map((t, i) => <li key={i}>{t}</li>)
            ) : (
              <li>No compliance-related insights.</li>
            )}
          </ul>
        </div>

        {/* Automation */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <h3 className="font-semibold text-indigo-700 mb-2 text-xs uppercase">
            Automation
          </h3>
          <ul className="list-disc list-inside space-y-1 text-gray-800">
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
   MAIN DASHBOARD
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

  const linksCount = 10; // static count (same as previous)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm text-sm text-gray-700">
          Loading dashboard…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900 flex items-center justify-center">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-6 py-4 shadow-sm text-sm text-rose-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div class="w-full px-6 py-6 md:py-8 space-y-8">

        {/* Header - now white background, centered card look */}
        <header className="bg-white border border-gray-200 rounded-2xl px-5 py-4 md:px-6 md:py-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
              LAN Network Automation Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Real-time view of device health, automation, compliance and
              alerts for your campus LAN.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Topology: 2 Core Routers (R1/R2), 2 Distribution Switches
              (Switch-A/Switch-B), 4 Access Switches (ASW-1..ASW-4).
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2 text-xs">
              <button
                className={
                  "px-3 py-1 rounded-full border text-sm " +
                  (range === "7d"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50")
                }
                onClick={() => setRange("7d")}
              >
                Last 7 days
              </button>
              <button
                className={
                  "px-3 py-1 rounded-full border text-sm " +
                  (range === "30d"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50")
                }
                onClick={() => setRange("30d")}
              >
                Last 30 days
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {totalDevices} Devices · {routers} Routers · {dist} Distribution ·{" "}
              {access} Access
            </div>
          </div>
        </header>

        {/* Top summary row - KPIs */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Average Health
            </p>
            <p className="text-3xl font-semibold text-emerald-600 mt-1">
              {avgHealth}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Across all routers and switches
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Automation Success
            </p>
            <p className="text-3xl font-semibold text-blue-600 mt-1">
              {automationSuccessPct}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {automationSummary?.total || 0} tasks in selected period
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Open Alerts
            </p>
            <p className="text-3xl font-semibold text-rose-600 mt-1">
              {openAlertsCount}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              CPU, OSPF and interface error conditions
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Links & VLANs
            </p>
            <p className="text-3xl font-semibold text-indigo-600 mt-1">
              {linksCount}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Core↔Distribution, Distribution↔Access, VLAN10/20/30/40
            </p>
          </div>
        </section>

        {/* Main grid sections */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - inventory + health */}
          <div className="lg:col-span-2 space-y-6">
            <DeviceInventory devices={devices} />
            <DeviceHealth devices={devices} />
          </div>

          {/* Right column - automation + compliance */}
          <div className="space-y-6">
            <AutomationSummary summary={automationSummary} />
            <ComplianceOverview compliance={compliance} />
          </div>
        </section>

        {/* Before/after + alerts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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













