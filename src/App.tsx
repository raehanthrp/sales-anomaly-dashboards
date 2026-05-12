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
  ArrowDownRight,
  Pencil,
  Trash2,
  Check,
  X
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
      <div className="bg-white/95 p-4 border border-slate-200 shadow-xl rounded-2xl backdrop-blur-md">
        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">
          Event_Seq: {format(parseISO(label), 'MMM dd, yyyy')}
        </p>
        <div className="space-y-2">
          <p className="text-sm font-display font-black flex justify-between gap-6 text-slate-900">
            <span className="text-slate-400 uppercase text-[10px] self-center">Sales:</span>
            <span className="text-indigo-600 font-mono tracking-tighter">${data.sales.toLocaleString()}</span>
          </p>
          <p className="text-sm font-display font-black flex justify-between gap-6 text-slate-900 border-t border-slate-50 pt-2">
            <span className="text-slate-400 uppercase text-[10px] self-center">Orders:</span>
            <span className="font-mono tracking-tighter text-slate-700">{data.orders}</span>
          </p>
          {data.isAnomaly && (
            <div className="mt-3 pt-3 border-t border-rose-100 flex items-center gap-2 text-rose-500">
              <AlertCircle size={14} />
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] animate-pulse">Isolation_Triggered</span>
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
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [dashboardGoal, setDashboardGoal] = useState("Analyze current Q2 sales volatility and identify supply chain disruption impacts.");
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
    const savedNotes = localStorage.getItem('sales_incident_notes');
    if (savedNotes) setNotes(JSON.parse(savedNotes));
    const savedGoal = localStorage.getItem('sales_dashboard_goal');
    if (savedGoal) setDashboardGoal(savedGoal);
  }, []);

  useEffect(() => {
    localStorage.setItem('sales_incident_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('sales_dashboard_goal', dashboardGoal);
  }, [dashboardGoal]);

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
      if (result && result.data) {
        setData(result.data);
      }
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

  const updateNote = (id: string) => {
    if (!editNoteContent.trim()) return;
    setNotes(notes.map(n => n.id === id ? { ...n, note: editNoteContent, updatedAt: new Date().toISOString() } : n));
    setEditingNoteId(null);
    setEditNoteContent("");
  };

  const deleteNote = (id: string) => {
    if (window.confirm("Are you sure you want to delete this incident note?")) {
      setNotes(notes.filter(n => n.id !== id));
    }
  };

  const startEditing = (note: IncidentNote) => {
    setEditingNoteId(note.id);
    setEditNoteContent(note.note);
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-700 selection:bg-slate-200 relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-5"
          >
            <div className="w-14 h-14 bg-indigo-950 rounded-lg shadow-lg flex items-center justify-center -rotate-2 hover:rotate-0 transition-transform duration-500">
              <TrendingUp className="text-indigo-100" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900 leading-none mb-1">
                Aether <span className="text-indigo-600 italic">Financial</span>
              </h1>
              <p className="text-[10px] font-sans font-bold tracking-[0.2em] text-slate-400 uppercase">
                System Intelligence Unit
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              <Upload size={14} className="text-indigo-600" />
              <span>Import Ledger</span>
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
              className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
              title="Refresh Analytics"
            >
              <RefreshCw size={18} className={cn(loading && "animate-spin")} />
            </button>
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Stats & Controls (Span 4) */}
          <div className="lg:col-span-4 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 gap-5"
            >
              {/* Metric Card 1 */}
              <div className="classic-card p-8 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 transition-transform duration-700 rounded-bl-full -mr-8 -mt-8 opacity-0 group-hover:opacity-100" />
                <p className="section-label mb-3">Consolidated Revenue</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-display font-bold tracking-tight text-slate-900">
                    ${stats.totalSales.toLocaleString()}
                  </h2>
                </div>
                <div className="mt-8 flex items-center gap-3">
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-[10px] font-bold border border-green-100">
                    <ArrowUpRight size={12} />
                    +12.5%
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans font-medium uppercase tracking-widest">v. Previous Quarter</span>
                </div>
              </div>

              {/* Metric Card 2 */}
              <div className="classic-card p-8 group transition-all hover:bg-rose-50/10 border-rose-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="section-label text-rose-800/40 mb-3">Identified Irregularities</p>
                    <h2 className="text-5xl font-display font-bold tracking-tight text-rose-600 italic">
                      {stats.anomalyCount}
                    </h2>
                  </div>
                  <div className="w-12 h-12 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 border border-rose-100 shadow-sm">
                    <ShieldAlert size={24} />
                  </div>
                </div>
                <div className="mt-8 flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    stats.anomalyCount > 0 ? "bg-rose-500" : "bg-green-500"
                  )} />
                  <span className="text-[10px] text-slate-400 font-sans font-medium uppercase tracking-widest">
                    {stats.anomalyCount > 0 ? "Action Required" : "System Health Nominal"}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Threshold Control */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="classic-card p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-600 border border-slate-100">
                    <Filter size={18} />
                  </div>
                  <h3 className="font-display font-bold text-slate-900 text-sm">Detection Sensitivity</h3>
                </div>
                <div className="px-3 py-1.5 bg-indigo-900 rounded font-mono text-[10px] font-bold text-indigo-50 uppercase tracking-widest">
                  Index: {threshold.toFixed(2)}
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="relative group px-1">
                  <input 
                    type="range" 
                    min="0.3" 
                    max="0.95" 
                    step="0.01" 
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between mt-5 text-[9px] text-slate-400 font-sans font-bold uppercase tracking-widest">
                    <span>Balanced</span>
                    <span>Exclusive</span>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 rounded-lg flex gap-4 items-start border border-slate-100">
                  <Info size={14} className="text-indigo-600 mt-1 shrink-0" />
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium uppercase tracking-widest">
                    Refining the <span className="text-slate-900 font-bold italic">Isolation Index</span>. This adjusts the recursive depth parameters for statistical deviation analysis.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Target Editor Widget */}
            <AnimatePresence>
              {selectedPoint && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="classic-card p-8 shadow-xl border-indigo-100"
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                        <MessageSquarePlus size={18} className="text-indigo-600" />
                      </div>
                      <h3 className="font-display font-bold text-slate-900 text-sm italic">Documentation Log</h3>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg mb-6">
                      <p className="section-label mb-1">Fiscal Reference Date</p>
                      <p className="text-sm font-display font-bold text-slate-900">{format(parseISO(selectedPoint.date), 'MMMM dd, yyyy')}</p>
                    </div>
 
                    <textarea 
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Enter detailed observations..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-4 text-sm font-sans text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 min-h-[120px] mb-6 resize-none shadow-sm"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={addNote}
                        className="bg-indigo-950 text-white py-3 rounded-lg text-[11px] font-bold hover:bg-slate-900 transition-all shadow-md active:scale-95 uppercase tracking-[0.2em]"
                      >
                        Submit Entry
                      </button>
                      <button 
                        onClick={() => setSelectedPoint(null)}
                        className="bg-white text-slate-500 py-3 rounded-lg text-[11px] font-bold hover:bg-slate-50 transition-all active:scale-95 border border-slate-200 uppercase tracking-[0.2em]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Chart & Workspace (Span 8) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Analysis Context Panel */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="classic-card p-8 group border-indigo-50"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-800 border border-slate-100">
                    <LayoutDashboard size={18} />
                  </div>
                  <h3 className="font-display font-bold text-slate-900 text-sm">Strategic Oversight</h3>
                </div>
                {!isEditingGoal ? (
                  <button 
                    onClick={() => {
                      setTempGoal(dashboardGoal);
                      setIsEditingGoal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 rounded transition-all uppercase tracking-widest"
                  >
                    <Pencil size={12} />
                    Edit Objective
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setDashboardGoal(tempGoal);
                        setIsEditingGoal(false);
                      }}
                      className="text-green-600 hover:bg-green-50 p-2 rounded-lg"
                    >
                      <Check size={18} />
                    </button>
                    <button 
                      onClick={() => setIsEditingGoal(false)}
                      className="text-slate-400 hover:bg-slate-50 p-2 rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
              
              {isEditingGoal ? (
                <textarea 
                  value={tempGoal}
                  onChange={(e) => setTempGoal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-5 text-sm font-sans text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600 min-h-[80px] resize-none"
                  placeholder="Define Strategic Objective..."
                  autoFocus
                />
              ) : (
                <div className="relative">
                  <p className="text-lg font-display text-slate-700 leading-relaxed font-semibold italic border-l-2 border-indigo-600 pl-6 py-2 bg-indigo-50/30 rounded-r">
                    "{dashboardGoal}"
                  </p>
                </div>
              )}
            </motion.div>

            {/* Main Visualizer Panel */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="classic-card p-8"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
                <div>
                  <h3 className="text-2xl font-display font-bold tracking-tight text-slate-900 mb-1">Performance Analytics</h3>
                  <p className="text-[11px] text-slate-400 font-sans font-bold uppercase tracking-widest">Revenue Streams & Identified Deviations</p>
                </div>
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-1 rounded-full bg-indigo-900" />
                    <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">Normal Yield</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-1 rounded-full bg-rose-500 opacity-20" />
                    <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">Statistical Outlier</span>
                  </div>
                </div>
              </div>

              <div className="h-[450px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={data} 
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        setSelectedPoint(e.activePayload[0].payload as SalesDataPoint);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(str) => format(parseISO(str), 'MMM dd')}
                      stroke="#cbd5e1"
                      fontSize={10}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      dy={20}
                    />
                    <YAxis 
                      stroke="#cbd5e1"
                      fontSize={10}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                      tickFormatter={(val) => `$${val > 999 ? (val/1000) + 'k' : val}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {data.filter(d => d.isAnomaly).map((entry) => {
                      const RefArea = ReferenceArea as any;
                      return (
                        <RefArea 
                          key={`ref-${entry.date}`}
                          x1={entry.date}
                          x2={entry.date}
                          fill="rgba(244,63,94,0.03)"
                          stroke="rgba(244,63,94,0.1)"
                          strokeWidth={1}
                        />
                      );
                    })}

                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#1e1b4b" 
                      strokeWidth={2} 
                      dot={false}
                      activeDot={{ 
                        r: 6, 
                        strokeWidth: 2, 
                        stroke: '#fff', 
                        fill: '#1e1b4b',
                      }}
                    />
                    
                    <Scatter dataKey="sales" fill="transparent" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 px-3 py-1.5 rounded border border-slate-100 uppercase tracking-widest font-bold text-[9px] text-slate-400">
                    Archives 01A
                  </div>
                  <div className="bg-slate-50 px-3 py-1.5 rounded border border-slate-100 uppercase tracking-widest font-bold text-[9px] text-slate-400">
                    Engine V-64
                  </div>
                </div>
                
                <div className="group relative">
                  <div className="flex items-center gap-2 cursor-help text-slate-400 hover:text-slate-600 transition-colors">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Weighted Isolation Kernel</span>
                    <Info size={14} />
                  </div>
                  <div className="absolute bottom-full right-0 mb-4 w-72 p-5 bg-white text-slate-600 text-[11px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-2xl z-50 border border-slate-200 leading-relaxed italic">
                    Statistical deviation analysis utilizes a recursive partitioning strategy to isolate observations with low expected frequency.
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Inventory Bottom Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Event Stack */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="classic-card flex flex-col h-[480px]"
              >
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white">
                      <AlertCircle size={18} />
                    </div>
                    <h4 className="font-display font-bold text-slate-900 text-sm tracking-tight">Activity Ledger</h4>
                  </div>
                  <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded text-[9px] font-bold text-slate-400 tracking-widest uppercase">
                    Live Stream
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {anomalies.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {anomalies.slice().reverse().map((item, idx) => (
                        <div 
                          key={idx} 
                          className="p-6 hover:bg-slate-50 transition-all cursor-pointer group flex items-center justify-between border-l-4 border-transparent hover:border-indigo-600" 
                          onClick={() => setSelectedPoint(item)}
                        >
                          <div className="flex gap-4 items-center">
                            <div className="w-10 h-10 rounded bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                              <History size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-display font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{format(parseISO(item.date), 'MMMM dd, yyyy')}</p>
                              <p className="text-[10px] font-sans font-bold text-slate-400 mt-0.5 tracking-widest uppercase">VAL: ${item.sales.toLocaleString()} // ORD: {item.orders}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                             <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                {Math.round(item.anomalyScore! * 100)}% Dev
                             </span>
                             <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-50">
                      <p className="text-sm font-display font-medium italic text-slate-400">Numerical stability maintained.</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Resolution Log */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="classic-card flex flex-col h-[480px]"
              >
                <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 rounded flex items-center justify-center text-indigo-700 border border-indigo-100">
                      <MessageSquarePlus size={18} />
                    </div>
                    <h4 className="font-display font-bold text-slate-900 text-sm tracking-tight">Intelligence Journal</h4>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {notes.length > 0 ? (
                    <div className="p-8 space-y-8">
                      {notes.map((note) => (
                        <div key={note.id} className="relative pl-8 pb-4 border-l border-slate-200 last:border-l-0 last:pb-0 group/note">
                          <div className="absolute left-[-4.5px] top-0 w-2 h-2 rounded-full bg-slate-900" />
                          
                          <div className="flex justify-between items-start mb-3">
                            <div>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                {format(parseISO(note.createdAt), 'MMM dd | HH:mm')}
                               </p>
                               <p className="text-xs font-display font-bold text-indigo-700 italic">
                                  Ref: {format(parseISO(note.date), 'MMMM dd')}
                               </p>
                            </div>
                            
                            <div className="flex items-center gap-2 opacity-0 group-hover/note:opacity-100 transition-opacity">
                              {editingNoteId !== note.id && (
                                <>
                                  <button 
                                    onClick={() => startEditing(note)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded transition-all"
                                    title="Modify Note"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button 
                                    onClick={() => deleteNote(note.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                                    title="Delete Entry"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {editingNoteId === note.id ? (
                            <div className="space-y-4 bg-slate-50 p-5 rounded-lg border border-slate-100 shadow-inner">
                              <textarea
                                value={editNoteContent}
                                onChange={(e) => setEditNoteContent(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded p-4 text-xs font-sans text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600 min-h-[100px] resize-none"
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <button 
                                  onClick={() => updateNote(note.id)}
                                  className="px-4 py-2 bg-indigo-950 text-white rounded text-[10px] font-bold hover:bg-slate-900 transition-all uppercase tracking-widest"
                                >
                                  Update
                                </button>
                                <button 
                                  onClick={() => setEditingNoteId(null)}
                                  className="px-4 py-2 bg-white text-slate-500 border border-slate-200 rounded text-[10px] font-bold hover:bg-slate-50 transition-all uppercase tracking-widest"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-5 bg-white rounded-lg border border-slate-100 group-hover/note:border-indigo-100 group-hover/note:shadow-sm transition-all">
                              <p className="text-[13px] font-sans text-slate-700 leading-relaxed italic">
                                "{note.note}"
                              </p>
                              {note.updatedAt && (
                                <p className="text-[9px] text-slate-400 mt-3 font-sans font-medium border-t border-slate-50 pt-2 uppercase tracking-widest">
                                  Revised: {format(parseISO(note.updatedAt), 'MMM dd, HH:mm')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-50">
                      <div className="w-12 h-12 bg-slate-50 rounded flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                        <MessageSquarePlus size={24} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Journal Empty</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 pt-24 pb-16 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'Cloud Architecture', sub: 'Node.js Core' },
              { label: 'UI Framework', sub: 'React L18' },
              { label: 'Tailwind Engine', sub: 'v4 Premium' }
            ].map((tag) => (
              <div key={tag.label} className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{tag.label}</span>
                <span className="text-xs font-display font-bold text-slate-900">{tag.sub}</span>
              </div>
            ))}
          </div>
          <div className="text-left md:text-right max-w-sm">
            <p className="text-xs font-display font-bold text-indigo-900 mb-2 italic">Aether System v4.0.2</p>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed uppercase tracking-wider">
              High-precision anomaly detection and fiscal oversight matrices. Optimized for institutional-grade reliability.
            </p>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-slate-100 flex justify-center">
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em]">Proprietary Intelligence Environment // Restricted Access</p>
        </div>
      </footer>
    </div>

  );
}

