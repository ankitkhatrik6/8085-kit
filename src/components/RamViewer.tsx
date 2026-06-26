/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Intel8085 } from "../emulator";
import { parseNumber } from "../assembler";
import { Search, ChevronLeft, ChevronRight, Edit2, CornerDownLeft, Eye } from "lucide-react";

interface RamViewerProps {
  emulator: Intel8085;
  onStateChange: () => void;
  syncTrigger: number;
  highlightedAddresses: Set<number>; // Tracks modified memory addresses
}

export default function RamViewer({
  emulator,
  onStateChange,
  syncTrigger,
  highlightedAddresses
}: RamViewerProps) {
  // Page size is 256 bytes (16 rows x 16 columns)
  const [currentPage, setCurrentPage] = useState<number>(0x20); // Defaults to page 2000H - 20FFH
  const [jumpInput, setJumpInput] = useState<string>("");
  const [editingCell, setEditingCell] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Force update when syncTrigger triggers
  useEffect(() => {}, [syncTrigger, emulator.state.pc]);

  // Jumps to a specific page
  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseNumber(jumpInput.endsWith("H") ? jumpInput : jumpInput + "H");
    if (val !== null && val >= 0 && val <= 0xFFFF) {
      setCurrentPage((val >> 8) & 0xFF);
      setJumpInput("");
    }
  };

  const handleCellClick = (addr: number) => {
    setEditingCell(addr);
    setEditValue(emulator.readMem(addr).toString(16).toUpperCase().padStart(2, "0"));
  };

  const handleCellSave = (addr: number) => {
    const val = parseNumber(editValue + "H");
    if (val !== null && val >= 0 && val <= 255) {
      emulator.writeMem(addr, val);
      highlightedAddresses.add(addr);
      onStateChange();
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, addr: number) => {
    if (e.key === "Enter") {
      handleCellSave(addr);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  // Convert non-printable bytes to dots
  const getAsciiChar = (val: number): string => {
    if (val >= 32 && val <= 126) {
      return String.fromCharCode(val);
    }
    return ".";
  };

  // Generate 16 rows of data for the current 256-byte page
  const startAddress = currentPage << 8;
  const rows = [];
  for (let r = 0; r < 16; r++) {
    const rowAddr = startAddress + r * 16;
    const rowBytes = [];
    let asciiStr = "";
    
    for (let c = 0; c < 16; c++) {
      const addr = rowAddr + c;
      const byteVal = emulator.readMem(addr);
      rowBytes.push({ addr, byteVal });
      asciiStr += getAsciiChar(byteVal);
    }
    rows.push({ rowAddr, rowBytes, asciiStr });
  }

  // Quick jump presets
  const JUMP_PRESETS = [
    { label: "Vector Region (0000H)", addr: 0x0000 },
    { label: "Program Start (2000H)", addr: 0x2000 },
    { label: "Data Area (2050H)", addr: 0x2050 },
    { label: "Array Buffer (2060H)", addr: 0x2060 },
    { label: "Stack Pointer (EFFFH)", addr: 0xEFFF }
  ];

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border border-[#222] rounded overflow-hidden shadow-2xl select-none">
      {/* Search and Jump Controller bar */}
      <div className="bg-[#0a0a0a] p-4 border-b border-[#222] space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Jump to Address Form */}
          <form onSubmit={handleJump} className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-bold font-mono tracking-wider uppercase">JUMP:</span>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. 2000"
                value={jumpInput}
                onChange={e => setJumpInput(e.target.value)}
                className="bg-[#0d0d0d] border border-[#222] rounded py-1.5 px-3 text-xs font-mono text-red-500 w-28 uppercase placeholder-neutral-700 focus:outline-none focus:border-red-500"
              />
            </div>
            <button
              type="submit"
              className="bg-[#222] hover:bg-[#333] text-neutral-300 py-1.5 px-3 rounded text-xs font-bold font-mono tracking-widest uppercase border border-[#333] cursor-pointer transition-colors"
            >
              Go
            </button>
          </form>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5">
            {JUMP_PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage((p.addr >> 8) & 0xFF)}
                className={`text-[9px] font-mono font-bold px-2 py-1 rounded border transition-colors cursor-pointer ${currentPage === ((p.addr >> 8) & 0xFF) ? "bg-red-950/20 text-red-400 border-red-800/60" : "bg-[#0d0d0d] text-neutral-500 border border-[#222] hover:text-neutral-200"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pager & Hex Search Query Filters */}
        <div className="flex items-center justify-between border-t border-[#1a1a1a] pt-3">
          {/* Page paginator controls */}
          <div className="flex items-center gap-3">
            <button
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              className="p-1.5 bg-[#0d0d0d] rounded hover:bg-[#1a1a1a] disabled:opacity-20 disabled:cursor-not-allowed border border-[#222] cursor-pointer text-neutral-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="text-center font-mono text-xs font-bold text-neutral-300 select-none">
              PAGE: <span className="text-red-500">{startAddress.toString(16).toUpperCase().padStart(4, "0")}H</span> - <span className="text-red-500">{(startAddress + 255).toString(16).toUpperCase().padStart(4, "0")}H</span>
            </div>

            <button
              disabled={currentPage === 0xFF}
              onClick={() => setCurrentPage(prev => Math.min(0xFF, prev + 1))}
              className="p-1.5 bg-[#0d0d0d] rounded hover:bg-[#1a1a1a] disabled:opacity-20 disabled:cursor-not-allowed border border-[#222] cursor-pointer text-neutral-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-500 bg-[#0d0d0d]/60 border border-[#222] px-2.5 py-1 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            <span>Double-click hex cells to write directly to RAM</span>
          </div>
        </div>
      </div>

      {/* Main Grid RAM Viewport */}
      <div className="flex-1 overflow-auto p-4 min-h-0 bg-[#050505]">
        <div className="min-w-[640px] font-mono text-xs">
          {/* Table Header Row */}
          <div className="grid grid-cols-12 gap-1.5 text-[10px] font-bold text-neutral-500 border-b border-[#1c1c1c] pb-2 mb-2 px-2 select-none">
            <div className="col-span-2">ADDRESS</div>
            <div className="col-span-8 grid grid-cols-16 gap-1 text-center">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i}>{i.toString(16).toUpperCase()}</div>
              ))}
            </div>
            <div className="col-span-2 text-right">ASCII</div>
          </div>

          {/* Rows */}
          <div className="space-y-1">
            {rows.map((row, rIdx) => (
              <div
                key={rIdx}
                className="grid grid-cols-12 gap-1.5 items-center hover:bg-[#111] p-1.5 rounded transition-colors"
              >
                {/* Left side Address offset */}
                <div className="col-span-2 font-bold text-neutral-500 select-none">
                  {row.rowAddr.toString(16).toUpperCase().padStart(4, "0")}H
                </div>

                {/* 16 bytes grid */}
                <div className="col-span-8 grid grid-cols-16 gap-1">
                  {row.rowBytes.map((cell) => {
                    const isPc = emulator.state.pc === cell.addr;
                    const isModified = highlightedAddresses.has(cell.addr);
                    const isEditing = editingCell === cell.addr;

                    return (
                      <div
                        key={cell.addr}
                        onDoubleClick={() => handleCellClick(cell.addr)}
                        className={`aspect-square flex items-center justify-center rounded text-center text-[11px] font-medium transition-all relative border cursor-pointer select-none ${isPc ? "bg-red-500/15 border-red-500 text-red-400 font-bold scale-[1.04]" : isModified ? "bg-amber-950/20 border-amber-800/40 text-amber-300" : "bg-[#0d0d0d] border-[#1a1a1a] hover:bg-[#1a1a1a] text-neutral-400 hover:text-neutral-100"}`}
                        title={`Address: ${cell.addr.toString(16).toUpperCase().padStart(4, "0")}H\nValue: ${cell.byteVal.toString(16).toUpperCase().padStart(2, "0")}H`}
                      >
                        {isEditing ? (
                          <div className="absolute inset-0 bg-[#050505] z-20 flex items-center justify-center rounded">
                            <input
                              type="text"
                              value={editValue}
                              maxLength={2}
                              autoFocus
                              onChange={e => setEditValue(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ""))}
                              onBlur={() => handleCellSave(cell.addr)}
                              onKeyDown={e => handleKeyDown(e, cell.addr)}
                              className="w-full h-full text-center bg-transparent text-red-500 font-bold font-mono focus:outline-none p-0 text-[11px]"
                            />
                          </div>
                        ) : (
                          cell.byteVal.toString(16).toUpperCase().padStart(2, "0")
                        )}
                        
                        {/* active PC bullet */}
                        {isPc && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Right side ASCII translation column */}
                <div className="col-span-2 text-right text-[10px] text-neutral-600 font-semibold select-none">
                  {row.asciiStr}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
