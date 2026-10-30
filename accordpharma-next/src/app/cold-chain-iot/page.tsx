'use client';

import React, { useState } from 'react';
import { db } from '@/lib/store';
import { ColdChainSensorReading } from '@/lib/types';
import { Bilingual } from '@/components/Bilingual';
import {
  Cpu,
  ThermometerSnowflake,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Battery,
  Wifi,
  Radio,
  Lock,
} from 'lucide-react';

export default function ColdChainIotPage() {
  const [sensors, setSensors] = useState<ColdChainSensorReading[]>(() => db.getColdChainSensors());

  const handleQuarantine = (id: string) => {
    db.quarantineColdChainUnit(id);
    setSensors([...db.getColdChainSensors()]);
  };

  const optimalCount = sensors.filter((s) => s.status === 'OPTIMAL_2_8C').length;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">
            <Cpu className="w-3.5 h-3.5" /> Fleet Cold-Chain IoT Telemetry
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Cold-Chain IoT &amp; Trunk Stock Monitoring
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Continuous 2°C–8°C Bluetooth IoT temperature telemetry for biologics in rep trunk refrigerators with excursion quarantine protocols.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black border border-emerald-300/40">
          <Radio className="w-4 h-4 animate-pulse text-emerald-500" />
          <span>BLE Gateway Live (3 Sensors Syncing)</span>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Active IoT Telemetry Units</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{sensors.length} Units</div>
          <span className="text-[11px] text-slate-400">Mobile trunk refrigerators</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Fleet Thermal Integrity</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {Math.round((optimalCount / sensors.length) * 100)}%
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">Strict 2.0°C - 8.0°C range</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Fleet Avg. Temperature</span>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">5.5°C</div>
          <span className="text-[11px] text-cyan-600 font-semibold">Safe storage envelope</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Quarantine Risk</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">0 Excursions</div>
          <span className="text-[11px] text-emerald-600 font-semibold">100% Sample viability</span>
        </div>
      </div>

      {/* SENSORS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sensors.map((s) => {
          const isQuarantined = s.status === 'QUARANTINED';
          const isOptimal = s.status === 'OPTIMAL_2_8C';

          return (
            <div
              key={s.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm space-y-5 transition-all ${
                isQuarantined
                  ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-cyan-400/60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    {s.sensor_uuid}
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {s.trunk_unit_id}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.rep_name}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                    <Battery className="w-3.5 h-3.5" /> {s.battery_pct}%
                  </span>
                </div>
              </div>

              {/* LIVE TEMP DISPLAY */}
              <div className="p-5 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                  Current Internal Sensor Temp
                </span>
                <div className="text-4xl font-black text-cyan-900 dark:text-cyan-100 tracking-tight">
                  {s.current_temp_celsius.toFixed(1)}°C
                </div>
                <div className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
                  24h Envelope: {s.min_temp_24h}°C (Min) — {s.max_temp_24h}°C (Max)
                </div>
              </div>

              <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cold-Chain Cargo:</span>
                  <strong className="text-slate-900 dark:text-white truncate max-w-[180px]">
                    {s.monitored_product}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Telemetry Ping:</span>
                  <span>{new Date(s.last_ping_at).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* ACTION / STATUS */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {isQuarantined ? (
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Unit Quarantined
                  </span>
                ) : (
                  <>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 2°C–8°C Compliant
                    </span>
                    <button
                      onClick={() => handleQuarantine(s.id)}
                      className="text-[11px] font-bold text-rose-500 hover:text-rose-700 underline"
                    >
                      Quarantine Unit
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
