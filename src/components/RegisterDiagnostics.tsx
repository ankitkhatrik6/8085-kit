/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Intel8085 } from "../emulator";
import { CpuState } from "../types";
import { Activity, Clock, Layers, Zap } from "lucide-react";

interface RegisterDiagnosticsProps {
  emulator: Intel8085;
  syncTrigger: number;
}

export default function RegisterDiagnostics({
  emulator,
  syncTrigger
}: RegisterDiagnosticsProps) {
  const [state, setState] = useState<CpuState>({ ...emulator.state });
  const [fByte, setFByte] = useState<number>(emulator.getFByte());

  // Force component re-renders on syncTrigger changes
  useEffect(() => {
    setState({
      ...emulator.state,
      f: { ...emulator.state.f }
    });
    setFByte(emulator.getFByte());
  }, [syncTrigger, emulator.state.pc, emulator.state.a]);

  // Convert A register to formatted string helpers
  const getABin = () => {
    return state.a.toString(2).padStart(8, "0");
  };

  const getADec = () => {
    return state.a.toString(10);
  };

  const getHexStr = (val: number, len: number = 2) => {
    return val.toString(16).toUpperCase().padStart(len, "0") + "H";
  };

  // Stack pointer size / depth offset
  const stackOffset = 0xF000 - state.sp;

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border border-[#222] rounded overflow-hidden shadow-2xl select-none">
      {/* Header telemetry badge */}
      <div className="flex justify-between items-center bg-[#0a0a0a] border-b border-[#222] px-4 py-2.5 text-xs font-bold select-none text-neutral-400">
        <span className="flex items-center gap-1.5 font-bold font-mono tracking-wider uppercase">
          <Activity className="w-4 h-4 text-red-500 animate-pulse" />
          CPU Diagnostics
        </span>
        <span className="text-[10px] font-mono flex items-center gap-1 bg-red-950/30 text-red-400 border border-red-900/40 px-2 py-0.5 rounded">
          <Clock className="w-3 h-3" />
          {emulator.cycleCount} T-STATES
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs text-neutral-300">
        {/* SECTION 1: STATUS FLAGS */}
        <div className="bg-[#050505] p-3 border border-[#222] rounded space-y-2.5">
          <div className="flex justify-between text-[10px] font-bold font-mono tracking-wider text-neutral-500">
            <span>STATUS FLAGS (F REGISTER)</span>
            <span className="text-red-400">
              {Object.values(state.f).filter(Boolean).length} ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-center">
            {/* Sign Flag */}
            <div className={`p-1.5 rounded border transition-all ${state.f.s ? "bg-red-950/10 border-red-500/40" : "bg-[#0a0a0a] border-[#222]"}`}>
              <span className="text-[10px] font-bold block text-neutral-400">S</span>
              <div className={`w-2 h-2 rounded-full mx-auto my-1.5 border border-black/40 ${state.f.s ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" : "bg-red-950/40"}`} />
              <span className="text-[8px] text-neutral-500 block leading-none">{state.f.s ? "1 (NEG)" : "0"}</span>
            </div>

            {/* Zero Flag */}
            <div className={`p-1.5 rounded border transition-all ${state.f.z ? "bg-red-950/10 border-red-500/40" : "bg-[#0a0a0a] border-[#222]"}`}>
              <span className="text-[10px] font-bold block text-neutral-400">Z</span>
              <div className={`w-2 h-2 rounded-full mx-auto my-1.5 border border-black/40 ${state.f.z ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" : "bg-red-950/40"}`} />
              <span className="text-[8px] text-neutral-500 block leading-none">{state.f.z ? "1 (ZERO)" : "0"}</span>
            </div>

            {/* Auxiliary Carry Flag */}
            <div className={`p-1.5 rounded border transition-all ${state.f.ac ? "bg-red-950/10 border-red-500/40" : "bg-[#0a0a0a] border-[#222]"}`}>
              <span className="text-[10px] font-bold block text-neutral-400">AC</span>
              <div className={`w-2 h-2 rounded-full mx-auto my-1.5 border border-black/40 ${state.f.ac ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" : "bg-red-950/40"}`} />
              <span className="text-[8px] text-neutral-500 block leading-none">{state.f.ac ? "1" : "0"}</span>
            </div>

            {/* Parity Flag */}
            <div className={`p-1.5 rounded border transition-all ${state.f.p ? "bg-red-950/10 border-red-500/40" : "bg-[#0a0a0a] border-[#222]"}`}>
              <span className="text-[10px] font-bold block text-neutral-400">P</span>
              <div className={`w-2 h-2 rounded-full mx-auto my-1.5 border border-black/40 ${state.f.p ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" : "bg-red-950/40"}`} />
              <span className="text-[8px] text-neutral-500 block leading-none">{state.f.p ? "1 (EVEN)" : "0"}</span>
            </div>

            {/* Carry Flag */}
            <div className={`p-1.5 rounded border transition-all ${state.f.cy ? "bg-red-950/10 border-red-500/40" : "bg-[#0a0a0a] border-[#222]"}`}>
              <span className="text-[10px] font-bold block text-neutral-400">CY</span>
              <div className={`w-2 h-2 rounded-full mx-auto my-1.5 border border-black/40 ${state.f.cy ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" : "bg-red-950/40"}`} />
              <span className="text-[8px] text-neutral-500 block leading-none">{state.f.cy ? "1 (CARRY)" : "0"}</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: ACCUMULATOR */}
        <div className="bg-[#050505] p-3 border border-[#222] rounded space-y-2">
          <div className="flex justify-between text-[10px] font-bold font-mono tracking-wider text-neutral-500">
            <span>ACCUMULATOR (A REGISTER)</span>
            <span className="text-neutral-600">8-BIT PRIMARY</span>
          </div>
          
          <div className="flex justify-between items-center bg-black/40 p-2.5 rounded border border-[#1a1a1a]">
            {/* Glowing 7-segment hex style */}
            <div className="text-2xl font-black text-red-500 tracking-wide filter drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]">
              {state.a.toString(16).toUpperCase().padStart(2, "0")}H
            </div>
            
            {/* Binary / Decimal representations */}
            <div className="text-right text-[10px] text-neutral-400 space-y-0.5 select-none leading-relaxed">
              <div className="text-neutral-500">{getABin()} BIN</div>
              <div>{getADec()} DEC</div>
            </div>
          </div>
        </div>

        {/* SECTION 3: 8-BIT & 16-BIT REGISTERS GRID */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* 8-Bit Register Columns */}
          <div className="bg-[#050505] p-3 border border-[#222] rounded space-y-2.5">
            <span className="text-[10px] font-bold font-mono tracking-wider text-neutral-500 block">8-BIT REGISTERS</span>
            
            <div className="space-y-2">
              {/* Register B & C */}
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-neutral-400 font-bold">REG B</span>
                <span className="text-sm text-red-500 font-bold drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">{getHexStr(state.b)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#1c1c1c] pt-1.5">
                <span className="text-[10px] text-neutral-400 font-bold">REG C</span>
                <span className="text-sm text-red-500 font-bold drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">{getHexStr(state.c)}</span>
              </div>
              
              {/* Register D & E */}
              <div className="flex justify-between items-center border-t border-[#1c1c1c] pt-1.5">
                <span className="text-[10px] text-neutral-400 font-bold">REG D</span>
                <span className="text-sm text-red-500 font-bold drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">{getHexStr(state.d)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#1c1c1c] pt-1.5">
                <span className="text-[10px] text-neutral-400 font-bold">REG E</span>
                <span className="text-sm text-red-500 font-bold drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">{getHexStr(state.e)}</span>
              </div>

              {/* Register H & L */}
              <div className="flex justify-between items-center border-t border-[#1c1c1c] pt-1.5">
                <span className="text-[10px] text-neutral-400 font-bold">REG H</span>
                <span className="text-sm text-red-500 font-bold drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">{getHexStr(state.h)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#1c1c1c] pt-1.5">
                <span className="text-[10px] text-neutral-400 font-bold">REG L</span>
                <span className="text-sm text-red-500 font-bold drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">{getHexStr(state.l)}</span>
              </div>
            </div>
          </div>

          {/* 16-Bit Register Pairs */}
          <div className="bg-[#050505] p-3 border border-[#222] rounded space-y-2.5">
            <span className="text-[10px] font-bold font-mono tracking-wider text-neutral-500 block">16-BIT PAIRS</span>

            <div className="space-y-2.5">
              <div>
                <span className="text-[9px] text-neutral-500 block mb-0.5">B-C PAIR</span>
                <span className="text-sm text-neutral-100 font-bold">
                  {((state.b << 8) | state.c).toString(16).toUpperCase().padStart(4, "0")}H
                </span>
              </div>

              <div className="border-t border-[#1c1c1c] pt-1.5">
                <span className="text-[9px] text-neutral-500 block mb-0.5">D-E PAIR</span>
                <span className="text-sm text-neutral-100 font-bold">
                  {((state.d << 8) | state.e).toString(16).toUpperCase().padStart(4, "0")}H
                </span>
              </div>

              <div className="border-t border-[#1c1c1c] pt-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-emerald-400 font-semibold block">H-L PAIR (MEM POINTER)</span>
                </div>
                <span className="text-sm text-emerald-400 font-bold">
                  {((state.h << 8) | state.l).toString(16).toUpperCase().padStart(4, "0")}H
                </span>
                <span className="text-[8px] block text-neutral-600">
                  Points to: {getHexStr(emulator.readMem((state.h << 8) | state.l))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: PC & SP POINTERS */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Program Counter */}
          <div className="bg-[#050505] p-3 border border-[#222] rounded">
            <span className="text-[9px] text-neutral-500 block font-bold font-mono tracking-wider">PROGRAM COUNTER (PC)</span>
            <div className="text-base text-red-500 font-black tracking-wide my-1 filter drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">
              {state.pc.toString(16).toUpperCase().padStart(4, "0")}H
            </div>
            <span className="text-[9px] text-neutral-600 block">Instruction ptr: {state.pc}</span>
          </div>

          {/* Stack Pointer */}
          <div className="bg-[#050505] p-3 border border-[#222] rounded">
            <span className="text-[9px] text-neutral-500 block font-bold font-mono tracking-wider">STACK POINTER (SP)</span>
            <div className="text-base text-neutral-100 font-bold tracking-wide my-1">
              {state.sp.toString(16).toUpperCase().padStart(4, "0")}H
            </div>
            <span className="text-[9px] text-neutral-600 block">Stack offset: {61440 - state.sp}</span>
          </div>
        </div>

        {/* SECTION 5: LIVE HARDWARE INSTRUCTIONS BUS TELEMETRY FEED */}
        <div className="bg-[#050505] p-3 border border-[#222] rounded space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold font-mono tracking-wider text-neutral-500 select-none">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-red-500" />
              INSTRUCTION BUS TELEMETRY
            </span>
            <span>LIVE</span>
          </div>

          <div className="h-28 overflow-y-auto border border-[#1a1a1a] bg-black/40 p-2 font-mono text-[10px] leading-relaxed space-y-1">
            {emulator.history.map((log, index) => (
              <div
                key={index}
                className={`flex justify-between items-center border-b border-neutral-900/40 pb-1 ${index === 0 ? "text-red-400 font-bold" : "text-neutral-500"}`}
              >
                <div className="flex gap-2">
                  <span className="text-[9px] opacity-70">[{log.timestamp}]</span>
                  <span className="font-semibold">{log.pc.toString(16).toUpperCase().padStart(4, "0")}:</span>
                  <span className="text-neutral-100">{log.mnemonic}</span>
                </div>
                <div className="flex gap-2 text-[9px]">
                  <span className="text-emerald-400 font-semibold">{log.bytes.join(" ")}</span>
                  <span className="text-neutral-600">({log.cycles}T)</span>
                </div>
              </div>
            ))}
            {emulator.history.length === 0 && (
              <div className="h-full flex items-center justify-center text-center text-neutral-600 py-6">
                Waiting for processor instruction cycles...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
