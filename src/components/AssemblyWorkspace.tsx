/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Intel8085 } from "../emulator";
import { assemble, parseNumber } from "../assembler";
import { AssemblerResult, AssemblyLine } from "../types";
import { Play, Pause, StepForward, RotateCcw, AlertCircle, FileCode, CheckCircle, Search, HelpCircle } from "lucide-react";
import { OPCODES_DATABASE } from "../opcodes_data";

interface AssemblyWorkspaceProps {
  emulator: Intel8085;
  code: string;
  onChangeCode: (val: string) => void;
  onStateChange: () => void;
  onAssembleSuccess: (hexMap: Record<number, number>) => void;
  syncTrigger: number;
}

export default function AssemblyWorkspace({
  emulator,
  code,
  onChangeCode,
  onStateChange,
  onAssembleSuccess,
  syncTrigger
}: AssemblyWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"code" | "opcodes">("code");
  const [searchQuery, setSearchQuery] = useState("");
  const [compileReport, setCompileReport] = useState<AssemblerResult | null>(null);
  const [clockSpeed, setClockSpeed] = useState<number>(5); // Steps per second (5Hz default)
  const [autoRunInterval, setAutoRunInterval] = useState<NodeJS.Timeout | null>(null);
  const [activeInstructionLine, setActiveInstructionLine] = useState<number | null>(null);

  // References for custom line-height mirroring code highlighter
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Keep track of cursor selection range to prevent cursor jumping
  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    selectionRef.current = {
      start: target.selectionStart,
      end: target.selectionEnd,
    };
    onChangeCode(target.value);
  };

  useEffect(() => {
    if (selectionRef.current && textareaRef.current) {
      const { start, end } = selectionRef.current;
      textareaRef.current.setSelectionRange(start, end);
    }
  }, [code]);

  // Sync current instruction line from Emulator PC register
  useEffect(() => {
    if (!compileReport || !compileReport.success) {
      setActiveInstructionLine(null);
      return;
    }
    const pc = emulator.state.pc;
    const match = compileReport.lines.find(l => l.address === pc);
    if (match) {
      setActiveInstructionLine(match.lineNumber);
    } else {
      setActiveInstructionLine(null);
    }
  }, [syncTrigger, emulator.state.pc, compileReport]);

  // Synchronized scrolling for custom syntax highlighter pre and textarea
  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Run/Pause loops matching the selected clockSpeed
  useEffect(() => {
    if (emulator.state.running && clockSpeed > 0) {
      // Clear any previous execution loop
      if (autoRunInterval) clearInterval(autoRunInterval);

      const delay = clockSpeed === 100 ? 5 : 1000 / clockSpeed;
      
      const interval = setInterval(() => {
        if (emulator.state.halted || !emulator.state.running) {
          clearInterval(interval);
          setAutoRunInterval(null);
          onStateChange();
          return;
        }

        // Run batch sizes for near-instant full-speed executions
        const batchSize = clockSpeed === 100 ? 50 : 1;
        for (let i = 0; i < batchSize; i++) {
          if (emulator.state.halted || !emulator.state.running) break;
          emulator.step();
        }
        
        onStateChange();
      }, delay);

      setAutoRunInterval(interval);
    } else {
      if (autoRunInterval) {
        clearInterval(autoRunInterval);
        setAutoRunInterval(null);
      }
    }
    return () => {
      if (autoRunInterval) clearInterval(autoRunInterval);
    };
  }, [emulator.state.running, clockSpeed]);

  // Keyboard shortcut listener (e.g. F1 to Single Step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        handleSingleStep();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [compileReport]);

  // --- ACTIONS ---
  const handleAssembleAndLoad = () => {
    const report = assemble(code);
    setCompileReport(report);

    if (report.success) {
      // Clear CPU registers & state but keep RAM filled
      emulator.reset();

      // Write compiled program map to CPU memory space
      Object.entries(report.hexMap).forEach(([addr, val]) => {
        emulator.writeMem(Number(addr), val);
      });

      // Point PC to the start of the assembled program ORG
      const startLine = report.lines.find(l => l.address !== undefined);
      if (startLine && startLine.address !== undefined) {
        emulator.state.pc = startLine.address;
      } else {
        emulator.state.pc = 0x2000;
      }

      onAssembleSuccess(report.hexMap);
      onStateChange();
    } else {
      // Stop execution on failures
      emulator.state.running = false;
      onStateChange();
    }
  };

  const handleSingleStep = () => {
    if (emulator.state.halted) return;
    
    // Auto compile if never compiled before
    if (!compileReport) {
      handleAssembleAndLoad();
      return;
    }

    emulator.step();
    onStateChange();
  };

  const handleRunAll = () => {
    if (emulator.state.halted) {
      emulator.state.halted = false;
    }
    emulator.state.running = true;
    onStateChange();
  };

  const handleHaltRun = () => {
    emulator.state.running = false;
    onStateChange();
  };

  const handleResetCore = () => {
    if (autoRunInterval) {
      clearInterval(autoRunInterval);
      setAutoRunInterval(null);
    }
    emulator.reset();
    
    // Set PC to start of compiled program if exists
    if (compileReport && compileReport.success) {
      const startLine = compileReport.lines.find(l => l.address !== undefined);
      if (startLine && startLine.address !== undefined) {
        emulator.state.pc = startLine.address;
      }
    }
    onStateChange();
  };

  // --- Dynamic IDE Syntax Highlighter render helper ---
  const renderHighlightedCode = () => {
    return code.split("\n").map((line, i) => {
      const lineNumber = i + 1;
      
      // Highlight current executing address line matching the program counter
      const isExecuting = activeInstructionLine === lineNumber;

      if (!line.trim()) {
        return (
          <div key={i} className={`h-6 leading-6 ${isExecuting ? "bg-emerald-950/40" : ""}`}>
            {"\n"}
          </div>
        );
      }

      // Check comments
      let commentPart = "";
      let codePart = line;
      const commentIdx = line.indexOf(";");
      if (commentIdx !== -1) {
        codePart = line.slice(0, commentIdx);
        commentPart = line.slice(commentIdx);
      }

      // Format code elements
      let elements: React.ReactNode[] = [];
      
      // Parse Labels ending with colon
      const labelMatch = codePart.match(/^([A-Za-z_][A-Za-z0-9_]*:)/);
      let labelStr = "";
      let remainingCode = codePart;
      
      if (labelMatch) {
        labelStr = labelMatch[1];
        remainingCode = codePart.slice(labelStr.length);
        elements.push(
          <span key="label" className="text-amber-500 font-semibold font-mono">
            {labelStr}
          </span>
        );
      }

      // Highlight standard mnemonic instructions and immediate hex operands
      const words = remainingCode.trim().split(/\s+/);
      const mnemonic = words[0]?.toUpperCase() || "";
      const operands = words.slice(1).join(" ") || "";

      if (mnemonic) {
        // Leading space offset
        const matchSpace = remainingCode.match(/^\s+/);
        if (matchSpace) {
          elements.push(matchSpace[0]);
        }

        // Directives get sky-blue highlights, core instructions pink
        const isDirective = ["ORG", "DB", "DW", "END"].includes(mnemonic);
        elements.push(
          <span key="mnemonic" className={isDirective ? "text-blue-400 font-medium" : "text-pink-400 font-bold"}>
            {mnemonic}
          </span>
        );

        if (operands) {
          // Space after mnemonic
          const spaceAfter = remainingCode.slice(labelStr.length + (matchSpace ? matchSpace[0].length : 0) + mnemonic.length).match(/^\s+/);
          if (spaceAfter) {
            elements.push(spaceAfter[0]);
          }

          // Format numeric values e.g. 2050H or 05H
          const formattedOperands = operands.split(",").map((op, opIdx) => {
            const cleanOp = op.trim();
            const numMatch = cleanOp.match(/^([0-9A-Fa-f]+H?|[0-9]+)$/);
            
            return (
              <React.Fragment key={`op-${opIdx}`}>
                {opIdx > 0 && ", "}
                {numMatch ? (
                  <span className="text-emerald-400 font-medium">{cleanOp}</span>
                ) : (
                  <span className="text-neutral-300">{cleanOp}</span>
                )}
              </React.Fragment>
            );
          });
          
          elements.push(formattedOperands);
        }
      } else {
        elements.push(remainingCode);
      }

      if (commentPart) {
        elements.push(
          <span key="comment" className="text-gray-500 italic">
            {commentPart}
          </span>
        );
      }

      return (
        <div
          key={i}
          className={`h-6 leading-6 select-none relative ${isExecuting ? "bg-red-500/10" : ""}`}
        >
          {isExecuting && (
            <div className="absolute left-[-16px] top-0 bottom-0 w-1 bg-red-500" />
          )}
          {elements}
        </div>
      );
    });
  };

  // Generate line numbers column
  const totalLines = code.split("\n").length;

  // Filter opcodes based on query
  const filteredOpcodes = OPCODES_DATABASE.filter(
    op =>
      op.mnemonic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.opcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border border-[#222] rounded overflow-hidden shadow-2xl">
      {/* Workspace Sub-Tabs */}
      <div className="flex justify-between items-center bg-[#0a0a0a] border-b border-[#222] px-4 py-1.5">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("code")}
            className={`px-3 py-1.5 text-[10px] font-bold font-mono tracking-widest uppercase flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === "code" ? "bg-[#1a1a1a] border-b-2 border-red-500 text-neutral-100" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            <FileCode className="w-3 h-3 text-red-500" />
            Editor
          </button>
          <button
            onClick={() => setActiveTab("opcodes")}
            className={`px-3 py-1.5 text-[10px] font-bold font-mono tracking-widest uppercase flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === "opcodes" ? "bg-[#1a1a1a] border-b-2 border-red-500 text-neutral-100" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            <HelpCircle className="w-3 h-3 text-red-500" />
            Opcodes
          </button>
        </div>
        
        {/* Memory range status badge */}
        <span className="text-[9px] font-mono bg-black/40 text-neutral-500 border border-[#222] px-2 py-0.5 rounded select-none">
          RAM BUFFER: 2000H - 3FFFH
        </span>
      </div>

      {activeTab === "code" ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Main Code Editor Block */}
          <div className="flex-1 grid grid-cols-12 min-h-0">
            {/* Syntax IDE Workspace */}
            <div className="col-span-8 flex relative min-h-0 border-r border-[#222] bg-[#080808]">
              {/* Line Numbers Column */}
              <div className="w-10 bg-[#050505] border-r border-[#222]/80 flex flex-col items-center py-4 text-neutral-600 font-mono text-xs select-none leading-6 text-right pr-2">
                {Array.from({ length: totalLines }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-6 flex items-center justify-end w-full ${activeInstructionLine === i + 1 ? "text-red-500 font-extrabold" : ""}`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Stacked Code Textarea and Pre-highlighted Backdrop */}
              <div className="flex-1 relative font-mono text-xs overflow-hidden">
                {/* Backdrop syntax rendering layers */}
                <div
                  ref={backdropRef}
                  className="absolute inset-0 p-4 pointer-events-none overflow-auto whitespace-pre leading-6 select-none bg-transparent"
                  style={{ scrollbarWidth: "none" }}
                >
                  {renderHighlightedCode()}
                </div>

                {/* Standard interactable textarea */}
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={handleTextareaChange}
                  onScroll={handleScroll}
                  className="absolute inset-0 p-4 w-full h-full bg-transparent text-transparent caret-neutral-100 font-mono text-xs focus:outline-none resize-none overflow-auto whitespace-pre leading-6"
                  placeholder="; Write Intel 8085 Assembly here..."
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* Live Compilation Machine Code Table Output */}
            <div className="col-span-4 flex flex-col min-h-0 bg-[#0c0c0c] overflow-y-auto">
              <div className="sticky top-0 bg-[#060606] border-b border-[#222] px-4 py-2 text-[10px] font-bold font-mono text-neutral-500 tracking-wider flex justify-between select-none z-10">
                <span>MACHINE CODE DECODING</span>
                <span>OPCODES</span>
              </div>

              {compileReport ? (
                compileReport.success ? (
                  <div className="p-3 space-y-2 select-none text-[10px]">
                    <div className="flex items-center gap-2 bg-[#0a1f10] border border-[#1b4324] p-2 rounded text-emerald-400">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="font-bold">Assembly Successful!</p>
                        <p className="text-[9px] opacity-80">Loaded {Object.keys(compileReport.hexMap).length} bytes into virtual trainer kit RAM.</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 font-mono">
                      {compileReport.lines
                        .filter(l => l.address !== undefined && l.size !== 0)
                        .map((line, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col p-1.5 rounded border transition-colors ${emulator.state.pc === line.address ? "bg-red-500/10 border-red-500/40 text-red-400" : "bg-[#0d0d0d] border-[#222] text-neutral-400"}`}
                          >
                            <div className="flex justify-between font-bold">
                              <span>{line.address?.toString(16).toUpperCase().padStart(4, "0")}H :</span>
                              <span className="text-emerald-400 font-semibold">{line.opcodes?.join(" ")}</span>
                            </div>
                            <div className="flex justify-between text-[9px] mt-0.5 opacity-85">
                              <span>{line.cleanText}</span>
                              <span className="text-neutral-500">({line.cycles} cycles, {line.size}B)</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 select-none">
                    <div className="flex items-start gap-2 bg-[#240a0a] border border-[#5c1a1a] p-2.5 rounded text-red-400 text-[10px]">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Compilation Failed</p>
                        <ul className="list-disc pl-4 mt-1 space-y-1 text-[9px] opacity-90">
                          {compileReport.errors.map((err, i) => (
                            <li key={i}>
                              Line {err.lineNumber}: {err.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center text-neutral-500 p-6 select-none">
                  <FileCode className="w-10 h-10 stroke-1 mb-2 text-neutral-600 animate-pulse" />
                  <p className="text-xs font-semibold">No compiled program loaded yet.</p>
                  <p className="text-[10px] mt-1 max-w-[180px] opacity-75">Write or load an experiment, then click Assemble!</p>
                </div>
              )}
            </div>
          </div>

          {/* ASSEMBLE ACTION TRIGGER BAR */}
          <div className="bg-[#050505] border-t border-[#222] p-3 select-none">
            <button
              onClick={handleAssembleAndLoad}
              className="w-full bg-emerald-600/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-600/20 active:bg-emerald-600/30 py-2.5 px-4 rounded text-xs font-bold font-mono tracking-widest uppercase shadow-[0_0_12px_rgba(16,185,129,0.05)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-emerald-500 stroke-emerald-500" />
              Assemble & Load to Trainer
            </button>
          </div>

          {/* HARDWARE RUN CONTROL STATION */}
          <div className="bg-[#0a0a0a] border-t border-[#222] p-3 select-none flex flex-wrap items-center justify-between gap-3">
            {/* Control buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSingleStep}
                disabled={emulator.state.halted}
                title="Single Step Execute (F1)"
                className="bg-[#222] hover:bg-[#333] border border-[#3c3c3c] disabled:opacity-20 disabled:cursor-not-allowed text-neutral-200 p-2 rounded text-[10px] font-bold font-mono tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-1"
              >
                <StepForward className="w-3.5 h-3.5" />
                Step
              </button>
              <button
                onClick={handleRunAll}
                className="bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-700/50 text-emerald-400 p-2 rounded text-[10px] font-bold font-mono tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5 fill-emerald-400 stroke-emerald-400" />
                Run All
              </button>
              <button
                onClick={handleHaltRun}
                className="bg-red-950/40 hover:bg-red-900/40 border border-red-700/50 text-red-400 p-2 rounded text-[10px] font-bold font-mono tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-1"
              >
                <Pause className="w-3.5 h-3.5 fill-red-400 stroke-red-400" />
                Halt
              </button>
              <button
                onClick={handleResetCore}
                className="bg-[#222] hover:bg-[#333] border border-[#3c3c3c] text-neutral-300 p-2 rounded text-[10px] font-bold font-mono tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Core
              </button>
            </div>

            {/* Stepper Delay clock Speed Slider */}
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded border border-[#222]">
              <span className="text-[10px] text-neutral-500 font-bold font-mono tracking-wider">SPEED:</span>
              <input
                type="range"
                min="1"
                max="100"
                value={clockSpeed === 100 ? 100 : clockSpeed}
                onChange={e => setClockSpeed(Number(e.target.value))}
                className="w-20 accent-red-600 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-red-500 font-bold w-12 text-right">
                {clockSpeed === 100 ? "Max/Inst" : `${clockSpeed} Hz`}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* searchable interactive Opcodes Reference Manual */
        <div className="flex-1 flex flex-col min-h-0 bg-neutral-950 p-4 select-none">
          <div className="relative w-full mb-3">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search by opcode (e.g. 3E), mnemonic, or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 pl-9 pr-4 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors font-sans"
            />
          </div>

          <div className="flex-1 overflow-y-auto border border-neutral-800/80 rounded-lg bg-neutral-900/40 font-mono text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-950 sticky top-0 text-neutral-400 text-[10px] border-b border-neutral-800">
                <tr>
                  <th className="p-2.5">OPCODE</th>
                  <th className="p-2.5">MNEMONIC</th>
                  <th className="p-2.5">BYTES</th>
                  <th className="p-2.5">CYCLES</th>
                  <th className="p-2.5">DESCRIPTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-[11px]">
                {filteredOpcodes.map((op, idx) => (
                  <tr key={idx} className="hover:bg-neutral-800/40 text-neutral-300">
                    <td className="p-2.5 font-bold text-amber-400">{op.opcode}</td>
                    <td className="p-2.5 font-bold text-neutral-100">{op.mnemonic}</td>
                    <td className="p-2.5 text-neutral-400">{op.bytes}</td>
                    <td className="p-2.5 text-emerald-400">{op.cycles}</td>
                    <td className="p-2.5 text-neutral-400 text-[10px] leading-relaxed">{op.desc}</td>
                  </tr>
                ))}
                {filteredOpcodes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-neutral-500 text-[10px]">
                      No opcodes match your search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
