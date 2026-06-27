/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Intel8085 } from "./emulator";
import { LABORATORY_EXPERIMENTS } from "./experiments";
import TrainerKit3D from "./components/TrainerKit3D";
import AssemblyWorkspace from "./components/AssemblyWorkspace";
import RegisterDiagnostics from "./components/RegisterDiagnostics";
import RamViewer from "./components/RamViewer";
import { Activity, BookOpen, Layers, RotateCcw, Monitor, ChevronRight, CheckCircle, Info } from "lucide-react";

export default function App() {
  // Instantiate core 8085 emulator
  const emulatorRef = useRef(new Intel8085());
  const emulator = emulatorRef.current;

  // State triggers to sync state transitions across components
  const [syncTrigger, setSyncTrigger] = useState<number>(0);
  const forceUpdate = () => setSyncTrigger(prev => prev + 1);

  // General tab states: "workbench" | "experiments" | "ram"
  const [activeTab, setActiveTab] = useState<"workbench" | "experiments" | "ram">("workbench");

  // Load the first experiment as the default assembly source code
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>(LABORATORY_EXPERIMENTS[0].id);
  const [assemblyCode, setAssemblyCode] = useState<string>(LABORATORY_EXPERIMENTS[0].assemblyCode);

  // Set of memory addresses modified by assembly compile or manual cells editing
  const [highlightedAddresses, setHighlightedAddresses] = useState<Set<number>>(new Set());

  // Hardware telemetry indicators
  const [coreStatus, setCoreStatus] = useState<"IDLE" | "RUNNING" | "HALTED">("IDLE");

  useEffect(() => {
    if (emulator.state.running) {
      setCoreStatus("RUNNING");
    } else if (emulator.state.halted) {
      setCoreStatus("HALTED");
    } else {
      setCoreStatus("IDLE");
    }
  }, [syncTrigger, emulator.state.running, emulator.state.halted]);

  // Handle experiment changes
  const handleSelectExperiment = (expId: string) => {
    const exp = LABORATORY_EXPERIMENTS.find(e => e.id === expId);
    if (exp) {
      setSelectedExperimentId(expId);
      setAssemblyCode(exp.assemblyCode);
      // Reset modified addresses trackers on loaded code changes
      setHighlightedAddresses(new Set());
      forceUpdate();
    }
  };

  const handleAssembleSuccess = (hexMap: Record<number, number>) => {
    // Record all compiled target addresses
    const compiledAddrs = new Set<number>();
    Object.keys(hexMap).forEach(addr => compiledAddrs.add(Number(addr)));
    setHighlightedAddresses(compiledAddrs);
    forceUpdate();
  };


  return (
    <div className="min-h-screen bg-[#121212] text-neutral-100 flex flex-col font-sans select-none antialiased">
      {/* 1. TOP HEADER / CORE TELEMETRY STATUS BAR */}
      <header className="bg-[#0a0a0a] border-b border-[#2a2a2a] px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-4 select-none">
        <div className="flex items-center gap-3">
          {/* Red glowing power dot */}
          <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_#dc2626]"></div>
          <div>
            <h1 className="text-xs font-mono tracking-widest uppercase text-neutral-100 font-bold">
              INTEL 8085 MICROPROCESSOR TRAINER — SYSTEM v4.2.0
            </h1>
            <div className="flex items-center gap-2 mt-0.5 select-none">
              <span className="text-[10px] font-mono uppercase tracking-tighter text-neutral-500">
                CPU: 3.072 MHz
              </span>
              <span className="text-neutral-700 font-mono text-[9px]">•</span>
              <span className="text-[10px] font-mono uppercase tracking-tighter text-neutral-500">
                Stack: 0x{emulator.state.sp.toString(16).toUpperCase().padStart(4, "0")}
              </span>
              <span className="text-neutral-700 font-mono text-[9px]">•</span>
              <span className="text-[10px] font-mono uppercase tracking-tighter text-neutral-500">
                VCC: 4.98V
              </span>
              <span className="text-neutral-700 font-mono text-[9px]">•</span>
              <span className="text-[10px] font-mono uppercase tracking-tighter text-neutral-500">
                STATUS:{" "}
                <span className={coreStatus === "RUNNING" ? "text-emerald-500 font-bold" : coreStatus === "HALTED" ? "text-red-500 font-bold" : "text-neutral-500 font-medium"}>
                  {coreStatus}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Global tab navigation */}
        <nav className="flex items-center gap-1.5 bg-[#0a0a0a] p-1 border border-[#2a2a2a] select-none">
          <button
            onClick={() => setActiveTab("workbench")}
            className={`px-4 py-1.5 text-[10px] font-bold font-mono tracking-widest uppercase transition-all cursor-pointer ${activeTab === "workbench" ? "bg-[#1a1a1a] border-b-2 border-red-500 text-neutral-100" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            WORKBENCH
          </button>
          <button
            onClick={() => setActiveTab("experiments")}
            className={`px-4 py-1.5 text-[10px] font-bold font-mono tracking-widest uppercase transition-all cursor-pointer ${activeTab === "experiments" ? "bg-[#1a1a1a] border-b-2 border-red-500 text-neutral-100" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            LAB EXPERIMENTS
          </button>
          <button
            onClick={() => setActiveTab("ram")}
            className={`px-4 py-1.5 text-[10px] font-bold font-mono tracking-widest uppercase transition-all cursor-pointer ${activeTab === "ram" ? "bg-[#1a1a1a] border-b-2 border-red-500 text-neutral-100" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            RAM VIEWER
          </button>
        </nav>


      </header>

      {/* 2. DYNAMIC WORKSPACE BODY CONTAINER */}
      <main className="flex-1 min-h-0 flex flex-col select-none">
        {activeTab === "workbench" && (
          <div className="flex-1 grid grid-cols-12 gap-5 p-5 min-h-0">
            {/* Desktop workbench column 1: trainer kit 3d digital twin */}
            <section className="col-span-12 lg:col-span-6 xl:col-span-5 h-[460px] md:h-[580px] lg:h-[620px] xl:h-full min-h-0 flex flex-col bg-[#0d0d0d] rounded overflow-hidden border border-[#222] shadow-2xl">
              <div className="bg-[#0a0a0a] px-4 py-2.5 border-b border-[#222] text-[10px] font-bold font-mono text-neutral-500 tracking-wider flex justify-between select-none">
                <span>8085 TRAINER KIT</span>
                <span>DIGITAL TWIN PANEL</span>
              </div>
              <div className="flex-1 min-h-0">
                <TrainerKit3D
                  emulator={emulator}
                  onStateChange={forceUpdate}
                  syncTrigger={syncTrigger}
                />
              </div>
            </section>

            {/* Desktop workbench column 2: assembly editor */}
            <section className="col-span-12 lg:col-span-6 xl:col-span-4 h-[550px] md:h-[580px] lg:h-[620px] xl:h-full min-h-0">
              <AssemblyWorkspace
                emulator={emulator}
                code={assemblyCode}
                onChangeCode={setAssemblyCode}
                onStateChange={forceUpdate}
                onAssembleSuccess={handleAssembleSuccess}
                syncTrigger={syncTrigger}
              />
            </section>

            {/* Desktop workbench column 3: registers live diagnostics */}
            <section className="col-span-12 lg:col-span-12 xl:col-span-3 h-[500px] xl:h-full min-h-0">
              <RegisterDiagnostics
                emulator={emulator}
                syncTrigger={syncTrigger}
              />
            </section>
          </div>
        )}

        {/* Pre-loaded engineering labs catalog */}
        {activeTab === "experiments" && (
          <div className="flex-1 grid grid-cols-12 p-6 gap-6 min-h-0 overflow-y-auto">
            {/* Left selector menu list */}
            <div className="col-span-12 lg:col-span-4 space-y-3">
              <div className="text-[10px] font-bold font-mono text-neutral-500 tracking-wider select-none mb-1">
                AVAILABLE LABORATORY CODES
              </div>
              
              <div className="space-y-2">
                {LABORATORY_EXPERIMENTS.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => handleSelectExperiment(exp.id)}
                    className={`w-full text-left p-4 rounded border transition-all flex justify-between items-center cursor-pointer ${selectedExperimentId === exp.id ? "bg-red-950/10 border-red-500/50 text-neutral-100" : "bg-[#0d0d0d] border-[#222] text-neutral-500 hover:text-neutral-200"}`}
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold font-mono tracking-wide">{exp.title}</div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${exp.difficulty === "Beginner" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50" : exp.difficulty === "Intermediate" ? "bg-amber-950/40 text-amber-400 border border-amber-900/50" : "bg-red-950/40 text-red-400 border border-red-900/50"}`}>
                          {exp.difficulty}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Right details content box */}
            <div className="col-span-12 lg:col-span-8 bg-[#0d0d0d] border border-[#222] rounded p-6 space-y-6 flex flex-col justify-between">
              {(() => {
                const activeExp = LABORATORY_EXPERIMENTS.find(e => e.id === selectedExperimentId);
                if (!activeExp) return null;

                return (
                  <>
                    <div className="space-y-5">
                      {/* Title description */}
                      <div className="border-b border-[#222] pb-4">
                        <span className="text-[10px] font-bold text-red-500 font-mono tracking-widest block uppercase">
                          LAB EXPERIMENT SPECIFICATIONS
                        </span>
                        <h2 className="text-base font-bold font-mono mt-1 text-neutral-100">
                          {activeExp.title}
                        </h2>
                        <p className="text-xs text-neutral-400 leading-relaxed mt-2">
                          {activeExp.description}
                        </p>
                      </div>

                      {/* Objectives */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-neutral-500 font-mono tracking-widest block">
                          LEARNING OBJECTIVES
                        </span>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-neutral-300">
                          {activeExp.learningObjectives.map((obj, i) => (
                            <li key={i} className="flex gap-2 bg-[#050505] p-2.5 rounded border border-[#222] leading-relaxed">
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Setup Instructions */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-neutral-500 font-mono tracking-widest block">
                          STEP-BY-STEP LAB CHECKLIST
                        </span>
                        <div className="bg-[#050505] p-4 rounded border border-[#222] text-xs text-neutral-300 leading-relaxed whitespace-pre-line font-mono">
                          {activeExp.setupInstructions}
                        </div>
                      </div>

                      {/* Expected outcome */}
                      <div className="bg-emerald-950/10 border border-emerald-900/30 p-3 rounded flex gap-3 text-xs text-neutral-300 leading-relaxed">
                        <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-emerald-400 block font-semibold mb-0.5 uppercase tracking-wider text-[10px] font-mono">EXPECTED OUTCOME:</strong>
                          {activeExp.expectedResult}
                        </div>
                      </div>
                    </div>

                    {/* CTA button to load experiment */}
                    <div className="border-t border-[#222] pt-5 flex justify-end">
                      <button
                        onClick={() => {
                          setActiveTab("workbench");
                          handleSelectExperiment(activeExp.id);
                        }}
                        className="bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20 active:bg-emerald-600/30 font-bold font-mono text-[10px] px-5 py-3 rounded tracking-widest uppercase flex items-center gap-2 transition-all cursor-pointer shadow-md"
                      >
                        <BookOpen className="w-4 h-4 text-emerald-400" />
                        Load Code to Workspace
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Full screen RAM editor tab */}
        {activeTab === "ram" && (
          <div className="flex-1 p-5 min-h-0">
            <RamViewer
              emulator={emulator}
              onStateChange={forceUpdate}
              syncTrigger={syncTrigger}
              highlightedAddresses={highlightedAddresses}
            />
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0a0a0a] border-t border-[#2a2a2a] px-6 py-3 text-center select-none">
        <p className="text-[10px] font-mono tracking-widest uppercase text-neutral-500">
          Made by <a href="https://ankitkhatri.me/" target="_blank" rel="noopener noreferrer" className="text-red-400 font-bold hover:underline">Ankit Khatri KC</a>
        </p>
      </footer>
    </div>
  );
}
