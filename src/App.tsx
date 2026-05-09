/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  Scatter, 
  ComposedChart,
  ReferenceArea
} from "recharts";
import { 
  TrendingUp, 
  AlertCircle, 
  Upload, 
  Info, 
  Filter, 
  LayoutDashboard, 
  History, 
  MessageSquarePlus,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import Papa from "papaparse";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { SalesDataPoint, IncidentNote } from "./types";
import { cn } from "./lib/utils";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-lg backdrop-blur-md bg-opacity-95">
        <p className="text-xs font-mono text-slate-500 mb-1">{format(parseISO(label), 'MMM dd, yyyy')}</p>
        <div className="space-y-1">
          <p className="text-sm font-bold flex justify-between gap-4">
            <span>Sales:</span>
            <span>${data.sales.toLocaleString()}</span>
          </p>
          <p className="text-sm font-bold flex justify-between gap-4 text-slate-600">
            <span>Orders:</span>
            <span>{data.orders}</span>
          </p>
          {data.isAnomaly && (
            <div className="mt-2 pt-2 border-t border-red-100 flex items-center gap-2 text-red-600">
              <AlertCircle size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Anomaly Detected</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function App() {
  const [data, setData] = useState<SalesDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(0.65);
  const [notes, setNotes] = useState<IncidentNote[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<SalesDataPoint | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
    const savedNotes = localStorage.getItem('sales_incident_notes');
    if (savedNotes) setNotes(JSON.parse(savedNotes));
  }, []);

  useEffect(() => {
    localStorage.setItem('sales_incident_notes', JSON.stringify(notes));
  }, [notes]);

  // Re-run prediction when threshold changes
  useEffect(() => {
    if (data.length > 0) {
      predictAnomalies(data, threshold);
    }
  }, [threshold]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/historical-data");
      const json = await res.json();
      predictAnomalies(json, threshold);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const predictAnomalies = async (items: SalesDataPoint[], sensIdx: number) => {
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: items, threshold: sensIdx }),
      });
      const result = await res.json();
      setData(result.data);
    } catch (error) {
      console.error("Prediction error:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        const parsedData = results.data
          .filter((item: any) => item.date && (item.sales !== undefined || item.orders !== undefined))
          .map((item: any) => ({
            date: item.date,
            sales: Number(item.sales || 0),
            orders: Number(item.orders || 0)
          }));
        
        if (parsedData.length > 0) {
          predictAnomalies(parsedData, threshold);
        }
      },
    });
  };

  const addNote = () => {
    if (!selectedPoint || !noteInput.trim()) return;
    
    const newNote: IncidentNote = {
      id: Math.random().toString(36).substr(2, 9),
      date: selectedPoint.date,
      note: noteInput,
      createdAt: new Date().toISOString()
    };
    
    setNotes([newNote, ...notes]);
    setNoteInput("");
    setSelectedPoint(null);
  };

  const stats = useMemo(() => {
    if (data.length === 0) return { totalSales: 0, avgSales: 0, anomalyCount: 0 };
    const totalSales = data.reduce((acc, curr) => acc + curr.sales, 0);
    const anomalyCount = data.filter(d => d.isAnomaly).length;
    return {
      totalSales,
      avgSales: Math.round(totalSales / data.length),
      anomalyCount
    };
  }, [data]);

  const anomalies = useMemo(() => data.filter(d => d.isAnomaly), [data]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-lg">
              <TrendingUp className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Sales Anomaly Dashboard</h1>
              <p className="text-xs text-slate-500 font-mono">PRJ-100 ARCHITECTURE</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Upload size={16} />
              <span>Import CSV</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv" 
              className="hidden" 
            />
            <button 
              onClick={fetchData}
              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={cn(loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Metrics & Controls */}
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                <p className="text-sm font-medium text-slate-500 mb-1">Total Period Sales</p>
                <h2 className="text-3xl font-bold font-mono tracking-tight text-slate-900">
                  ${stats.totalSales.toLocaleString()}
                </h2>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600">
                  <ArrowUpRight size={14} />
                  <span>+12.5% vs previous period</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Detected Anomalies</p>
                    <h2 className="text-3xl font-bold font-mono tracking-tight text-red-600">
                      {stats.anomalyCount}
                    </h2>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg text-red-600">
                    <ShieldAlert size={20} />
                  </div>
                </div>
                <div className="mt-4 text-xs font-medium text-slate-500">
                  {stats.anomalyCount > 0 ? "Action required for investigation" : "All data points within normal range"}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Filter size={18} className="text-indigo-600" />
                <h3 className="font-bold text-slate-800">ML Sensitivity</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      Threshold
                      <div className="group relative">
                        <Info size={14} className="text-slate-300" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                          Adjust the isolation forest anomaly score threshold. Higher values flag only extreme deviations.
                        </div>
                      </div>
                    </span>
                    <span className="font-mono font-bold text-indigo-600">{threshold.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.3" 
                    max="0.95" 
                    step="0.01" 
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    <span>Permissive</span>
                    <span>Conservative</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Incident Notes Form */}
            <AnimatePresence>
              {selectedPoint && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-indigo-600 p-6 rounded-2xl shadow-xl shadow-indigo-100 text-white"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquarePlus size={20} />
                    <h3 className="font-bold">Add Incident Note</h3>
                  </div>
                  <p className="text-xs text-indigo-100 mb-4 font-mono">
                    Target: {format(parseISO(selectedPoint.date), 'MMM dd, yyyy')}
                  </p>
                  <textarea 
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Describe the cause of this anomaly..."
                    className="w-full bg-indigo-500/50 border border-indigo-400 rounded-xl p-3 text-sm placeholder:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[100px] mb-4"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={addNote}
                      className="flex-1 bg-white text-indigo-600 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
                    >
                      Save Note
                    </button>
                    <button 
                      onClick={() => setSelectedPoint(null)}
                      className="flex-1 bg-indigo-500/50 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Chart & History */}
          <div className="lg:col-span-2 space-y-8">
            {/* Chart Area */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Historical Sales Performance</h3>
                  <p className="text-sm text-slate-500">Anomaly flags marked in red icons</p>
                </div>
                <div className="flex items-center gap-6 text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-indigo-600" />
                    Daily Sales
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200" />
                    Anomaly Zone
                  </div>
                </div>
              </div>

              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={data} 
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        setSelectedPoint(e.activePayload[0].payload as SalesDataPoint);
                      }
                    }}
                  >
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(str) => format(parseISO(str), 'MMM dd')}
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* Background indicators for anomalies */}
                    {data.map((entry) => entry.isAnomaly ? (
                      <ReferenceArea 
                        key={entry.date}
                        x1={entry.date}
                        x2={entry.date}
                        fill="#fee2e2"
                        fillOpacity={0.5}
                      /> as any
                    ) : null)}

                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#4f46e5" 
                      strokeWidth={3} 
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (payload.isAnomaly) {
                          return (
                            <svg key={`dot-${payload.date}`} x={cx - 8} y={cy - 8} width={16} height={16} viewBox="0 0 24 24" fill="none" className="text-red-600">
                              <circle cx="12" cy="12" r="10" fill="#fee2e2" stroke="currentColor" strokeWidth="2" />
                              <circle cx="12" cy="12" r="4" fill="currentColor" />
                            </svg>
                          );
                        }
                        return <></>;
                      }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                    />
                    
                    {/* Secondary invisible layer for better click targeting */}
                    <Scatter dataKey="sales" fill="transparent" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
                  Click on any point to report an incident
                </p>
                <div className="text-xs text-slate-500 font-mono italic">
                  Algorithm: Isolation Forest · N=100
                </div>
              </div>
            </div>

            {/* List & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Recent Anomalies List */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-600" />
                    Critical Anomalies
                  </h4>
                  <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-full uppercase">
                    Last 60 Days
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[300px]">
                  {anomalies.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {anomalies.slice().reverse().map((item, idx) => (
                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedPoint(item)}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{format(parseISO(item.date), 'MMM dd, yyyy')}</p>
                              <p className="text-xs text-slate-500 mt-0.5">Sales: ${item.sales.toLocaleString()} · Orders: {item.orders}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                {Math.round(item.anomalyScore! * 100)}% Match
                              </div>
                              <ChevronRight size={14} className="ml-auto mt-2 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-sm text-slate-400 italic">No anomalies detected in current range</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Investigation Log */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="p-6 border-b border-slate-100">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <History size={16} className="text-indigo-600" />
                    Investigation Log
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[300px]">
                  {notes.length > 0 ? (
                    <div className="space-y-4 p-6">
                      {notes.map((note) => (
                        <div key={note.id} className="relative pl-6 pb-6 border-l-2 border-slate-100 last:pb-0">
                          <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 shadow-sm" />
                          <div className="text-[10px] font-mono text-slate-400 mb-1">
                            {format(parseISO(note.createdAt), 'MMM dd, HH:mm')} · REF: {format(parseISO(note.date), 'MMM dd')}
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-700 leading-relaxed">
                            {note.note}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      <p className="text-xs uppercase tracking-widest font-bold mb-1 opacity-50">Log Empty</p>
                      <p className="text-sm italic">Reports will appear here once saved</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Dev Note */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-1.5 rounded text-white font-mono text-[10px] font-bold">NODE.JS</div>
            <div className="bg-indigo-800 p-1.5 rounded text-white font-mono text-[10px] font-bold">EXPRESS</div>
            <div className="bg-cyan-800 p-1.5 rounded text-white font-mono text-[10px] font-bold">RECharts</div>
            <div className="bg-rose-800 p-1.5 rounded text-white font-mono text-[10px] font-bold">ML-ISO-FOREST</div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">PRJ-100 Architecture Migration</p>
            <p className="text-xs text-slate-400 mt-1">Modernized Web-Native Execution of Sales Anomaly Logic</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

