/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Intel8085 } from "../emulator";
import { KeypadKey, KitMode } from "../types";

interface TrainerKit3DProps {
  emulator: Intel8085;
  onStateChange: () => void;
  syncTrigger: number;
}

// 7-segment digit mapping
const segmentsMap: Record<string, boolean[]> = {
  // [a, b, c, d, e, f, g]
  "0": [true, true, true, true, true, true, false],
  "1": [false, true, true, false, false, false, false],
  "2": [true, true, false, true, true, false, true],
  "3": [true, true, true, true, false, false, true],
  "4": [false, true, true, false, false, true, true],
  "5": [true, false, true, true, false, true, true],
  "6": [true, false, true, true, true, true, true],
  "7": [true, true, true, false, false, false, false],
  "8": [true, true, true, true, true, true, true],
  "9": [true, true, true, true, false, true, true],
  "A": [true, true, true, false, true, true, true],
  "b": [false, false, true, true, true, true, true],
  "B": [false, false, true, true, true, true, true],
  "c": [false, false, false, true, true, false, true],
  "C": [true, false, false, true, true, true, false],
  "d": [false, true, true, true, true, false, true],
  "D": [false, true, true, true, true, false, true],
  "e": [true, false, false, true, true, true, true],
  "E": [true, false, false, true, true, true, true],
  "f": [true, false, false, false, true, true, true],
  "F": [true, false, false, false, true, true, true],
  "H": [false, true, true, false, true, true, true],
  "L": [false, false, false, true, true, true, false],
  "P": [true, true, false, false, true, true, true],
  "G": [true, false, true, true, true, true, false],
  "r": [false, false, false, false, true, false, true],
  "o": [false, false, true, true, true, false, true],
  "n": [false, false, true, false, true, false, true],
  "S": [true, false, true, true, false, true, true],
  "t": [false, false, false, true, true, true, true],
  "V": [false, true, true, true, true, true, false],
  "v": [false, false, true, true, true, false, false],
  "U": [false, true, true, true, true, true, false],
  "u": [false, false, true, true, true, false, false],
  "M": [true, true, true, false, true, true, false], // Looks like inverted U with double columns
  "y": [false, true, true, true, false, true, true],
  "J": [false, true, true, true, true, false, false],
  "-": [false, false, false, false, false, false, true],
  "_": [false, false, false, true, false, false, false],
  " ": [false, false, false, false, false, false, false],
};

// --- Beautiful SVG 7-Segment Digit Component ---
function SevenSegmentDigit({ char, className = "" }: { char: string; className?: string; key?: React.Key }) {
  const activeSegments = segmentsMap[char] || segmentsMap[char.toLowerCase()] || segmentsMap[" "];

  // Segment paths: a, b, c, d, e, f, g
  const segments = [
    { id: "a", path: "M 3 2 L 17 2 L 15 5 L 5 5 Z" },
    { id: "b", path: "M 17.5 3.5 L 17.5 15.5 L 15.5 14.5 L 15.5 5.5 Z" },
    { id: "c", path: "M 16.5 17.5 L 16.5 29.5 L 14.5 27.5 L 14.5 18.5 Z" },
    { id: "d", path: "M 5 29 L 15 29 L 17 32 L 3 32 Z" },
    { id: "e", path: "M 1.5 17.5 L 3.5 18.5 L 3.5 27.5 L 1.5 29.5 Z" },
    { id: "f", path: "M 2.5 3.5 L 4.5 5.5 L 4.5 14.5 L 2.5 15.5 Z" },
    { id: "g", path: "M 4.5 16.5 L 6.5 15 L 13.5 15 L 15.5 16.5 L 13.5 18 L 6.5 18 Z" },
  ];

  return (
    <div className={`relative w-7 h-10 flex items-center justify-center bg-[#150202] border border-red-950/30 rounded-sm overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] ${className}`}>
      {/* Background unlit "8" */}
      <svg viewBox="0 0 20 34" className="absolute w-full h-full opacity-0.05 scale-[0.82] select-none pointer-events-none" style={{ overflow: "visible" }}>
        <g transform="skewX(-8)" style={{ transformOrigin: "10px 17px" }}>
          {segments.map((seg) => (
            <path key={`bg-${seg.id}`} d={seg.path} fill="#ef4444" />
          ))}
        </g>
      </svg>
      {/* Glowing lit digits */}
      <svg viewBox="0 0 20 34" className="w-full h-full scale-[0.82] select-none z-10" style={{ overflow: "visible" }}>
        <g transform="skewX(-8)" style={{ transformOrigin: "10px 17px" }}>
          {segments.map((seg, idx) => {
            const isLit = activeSegments[idx];
            return (
              <path
                key={`lit-${seg.id}`}
                d={seg.path}
                fill={isLit ? "#ff2222" : "#1a0404"}
                className="transition-all duration-150"
                style={{
                  filter: isLit ? "drop-shadow(0 0 3px rgba(239, 68, 68, 0.95)) drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))" : "none",
                }}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// --- Visual Sub-components for PCB detail ---

function Screw({ x }: { x: string }) {
  return (
    <div className={`absolute ${x} w-5 h-5 rounded-full bg-gradient-to-br from-neutral-300 via-neutral-500 to-neutral-700 shadow border border-neutral-600/30 flex items-center justify-center z-10`}>
      <div className="w-3.5 h-0.5 bg-neutral-850 rotate-45 absolute" />
      <div className="w-3.5 h-0.5 bg-neutral-850 -rotate-45 absolute" />
    </div>
  );
}

interface DipChipProps {
  label: string;
  sublabel?: string;
  pinsCount: number;
  orientation: "horizontal" | "vertical";
  className?: string;
}

function DipChip({ label, sublabel, pinsCount, orientation, className = "" }: DipChipProps) {
  const pinsHalf = pinsCount / 2;
  const pinsArray = Array.from({ length: pinsHalf });

  return (
    <div className={`relative bg-gradient-to-b from-neutral-850 to-neutral-950 border border-neutral-800 rounded shadow-[0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center select-none font-mono ${orientation === "vertical" ? "flex-col py-3 px-1.5" : "px-3 py-1.5"} ${className}`}>
      {/* Pins on the side */}
      {orientation === "vertical" ? (
        <>
          {/* Left Pins */}
          <div className="absolute left-[-4px] top-2.5 bottom-2.5 flex flex-col justify-between z-[-1]">
            {pinsArray.map((_, i) => (
              <div key={`pin-l-${i}`} className="w-1.5 h-[3px] bg-gradient-to-r from-neutral-400 to-neutral-200 rounded-l shadow-sm" />
            ))}
          </div>
          {/* Right Pins */}
          <div className="absolute right-[-4px] top-2.5 bottom-2.5 flex flex-col justify-between z-[-1]">
            {pinsArray.map((_, i) => (
              <div key={`pin-r-${i}`} className="w-1.5 h-[3px] bg-gradient-to-l from-neutral-400 to-neutral-200 rounded-r shadow-sm" />
            ))}
          </div>
          {/* Notch on top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-1.5 bg-[#0d0d0d] rounded-b-full border-b border-neutral-850" />
        </>
      ) : (
        <>
          {/* Top Pins */}
          <div className="absolute top-[-4px] left-2.5 right-2.5 flex justify-between z-[-1]">
            {pinsArray.map((_, i) => (
              <div key={`pin-t-${i}`} className="w-[3px] h-1.5 bg-gradient-to-b from-neutral-400 to-neutral-200 rounded-t shadow-sm" />
            ))}
          </div>
          {/* Bottom Pins */}
          <div className="absolute bottom-[-4px] left-2.5 right-2.5 flex justify-between z-[-1]">
            {pinsArray.map((_, i) => (
              <div key={`pin-b-${i}`} className="w-[3px] h-1.5 bg-gradient-to-t from-neutral-400 to-neutral-200 rounded-b shadow-sm" />
            ))}
          </div>
          {/* Notch on left */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-3.5 bg-[#0d0d0d] rounded-r-full border-r border-neutral-850" />
        </>
      )}

      {/* Chip Labeling */}
      <div className="text-center font-bold tracking-tight scale-[0.82] leading-tight flex flex-col items-center">
        <span className="text-[7px] text-neutral-500 font-medium uppercase">{sublabel || "IC"}</span>
        <span className="text-[8.5px] text-neutral-100 font-extrabold tracking-wider font-mono">{label}</span>
      </div>
    </div>
  );
}

function HorizontalCapacitor({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div className="absolute left-[-16px] w-[18px] h-0.5 bg-gradient-to-r from-neutral-400 to-neutral-300 shadow-sm" />
      <div className="w-16 h-6 rounded bg-gradient-to-b from-sky-400 via-sky-500 to-sky-700 shadow-[0_3px_6px_rgba(0,0,0,0.4)] border border-sky-400/30 relative flex items-center overflow-hidden">
        <div className="absolute left-2 top-0 bottom-0 w-2.5 bg-sky-900/60 flex flex-col justify-between py-0.5 text-[5px] text-sky-200 font-bold select-none text-center">
          <span>-</span>
          <span>-</span>
          <span>-</span>
        </div>
        <div className="text-[6px] font-bold text-sky-100 font-mono scale-[0.9] absolute left-6 leading-tight select-none">
          <div>470µF</div>
          <div>25V</div>
        </div>
      </div>
      <div className="absolute right-[-16px] w-[18px] h-0.5 bg-gradient-to-l from-neutral-400 to-neutral-300 shadow-sm" />
    </div>
  );
}

function ResistorHorizontal({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div className="absolute w-[32px] h-[1px] bg-neutral-400/80" />
      <div className="w-6 h-2 bg-[#d7c49e] rounded shadow-sm relative flex justify-around items-center px-0.5 z-10 border border-amber-800/10">
        <div className="w-0.5 h-full bg-red-600" />
        <div className="w-0.5 h-full bg-red-600" />
        <div className="w-0.5 h-full bg-amber-600" />
        <div className="w-0.5 h-full bg-yellow-500" />
      </div>
    </div>
  );
}

function PinHeader({ count, orientation, className = "" }: { count: number; orientation: "h" | "v"; className?: string }) {
  return (
    <div className={`flex bg-neutral-900 border border-neutral-700/50 p-0.5 gap-0.5 rounded shadow-inner ${orientation === "v" ? "flex-col" : "flex-row"} ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-1.5 h-1.5 bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-500 rounded-sm shadow-sm" />
      ))}
    </div>
  );
}

function DB9Connector({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-8 h-16 bg-neutral-400 border border-neutral-500 rounded flex flex-col items-center justify-between py-1.5 shadow-[0_4px_8px_rgba(0,0,0,0.4)] z-10 ${className}`}>
      <div className="w-5 h-11 bg-gradient-to-b from-neutral-300 via-neutral-100 to-neutral-400 rounded-sm border border-neutral-500 flex flex-col justify-around py-1 px-0.5">
        <div className="w-full h-full bg-[#2a62a6] rounded border border-neutral-600 grid grid-cols-2 gap-x-1 gap-y-0.5 p-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-200 border border-neutral-500 shadow-sm mx-auto" />
          ))}
        </div>
      </div>
      <div className="absolute top-[-4px] w-2.5 h-2.5 bg-gradient-to-br from-neutral-400 via-neutral-200 to-neutral-600 border border-neutral-500 rounded shadow-sm flex items-center justify-center text-[4px] text-neutral-800 font-bold font-sans">
        ⬡
      </div>
      <div className="absolute bottom-[-4px] w-2.5 h-2.5 bg-gradient-to-br from-neutral-400 via-neutral-200 to-neutral-600 border border-neutral-500 rounded shadow-sm flex items-center justify-center text-[4px] text-neutral-800 font-bold font-sans">
        ⬡
      </div>
    </div>
  );
}

export default function TrainerKit3D({
  emulator,
  onStateChange,
  syncTrigger
}: TrainerKit3DProps) {
  // --- UI Layout Scale ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const designWidth = 852;
        const designHeight = 572; // height of layout (560 + small vertical buffer)
        
        const scaleX = width / designWidth;
        const scaleY = height / designHeight;
        
        // Scale to fit both dimensions perfectly, allowing up to 1.15 scaling on large screens
        const calculatedScale = Math.min(1.15, scaleX, scaleY);
        setScale(calculatedScale);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // --- Physical Button Interaction State ---
  const [depressedKey, setDepressedKey] = useState<KeypadKey | null>(null);

  // --- Keyboard & System State ---
  const [kitMode, setKitMode] = useState<KitMode>(KitMode.IDLE);
  const [addrDisplay, setAddrDisplay] = useState<string[]>([" ", "M", "P", " "]);
  const [dataDisplay, setDataDisplay] = useState<string[]>([" ", " "]);

  // Hardware status indicators
  const [isHalted, setIsHalted] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  // Keyboard machine buffers
  const [currentAddress, setCurrentAddress] = useState<number>(0x2000);
  const [inputBuffer, setInputBuffer] = useState<string>("");
  const [registerIndex, setRegisterIndex] = useState<number>(0);
  const [isShiftActive, setIsShiftActive] = useState<boolean>(false);

  // Block Move State
  const [bmSrcStart, setBmSrcStart] = useState<number>(0);
  const [bmSrcEnd, setBmSrcEnd] = useState<number>(0);

  // Memory Fill State
  const [fillStart, setFillStart] = useState<number>(0);
  const [fillEnd, setFillEnd] = useState<number>(0);

  const registersList = ["A", "B", "C", "D", "E", "H", "L", "PC", "SP"];

  // --- Sync Hardware Displays ---
  useEffect(() => {
    setIsHalted(emulator.state.halted);
    setIsRunning(emulator.state.running);

    if (emulator.state.running) {
      setKitMode(KitMode.RUNNING_KIT);
      updateDisplayFromAddr(emulator.state.pc);
    } else if (emulator.state.halted) {
      setKitMode(KitMode.IDLE);
      setAddrDisplay(["H", "A", "L", "t"]);
      const lastByte = emulator.readMem(emulator.state.pc);
      setDataDisplay([
        ((lastByte >> 4) & 0xF).toString(16).toUpperCase(),
        (lastByte & 0xF).toString(16).toUpperCase()
      ]);
    } else {
      // Check if we are currently inputting in a special mode
      const isInputtingSpecial = [
        KitMode.BLOCK_MOVE_SRC_START,
        KitMode.BLOCK_MOVE_SRC_END,
        KitMode.BLOCK_MOVE_DEST,
        KitMode.FILL_START,
        KitMode.FILL_END,
        KitMode.FILL_VAL
      ].includes(kitMode);

      if (!isInputtingSpecial) {
        if (kitMode === KitMode.EX_MEM_DATA) {
          updateDisplayFromAddrAndMem(currentAddress);
        }
      }
    }
  }, [syncTrigger, emulator.state.pc, emulator.state.halted, emulator.state.running]);

  // Helpers to set displays
  const updateDisplayFromAddr = (addr: number) => {
    const hex = addr.toString(16).toUpperCase().padStart(4, "0");
    setAddrDisplay([hex[0], hex[1], hex[2], hex[3]]);
  };

  const updateDisplayFromAddrAndMem = (addr: number) => {
    const addrHex = addr.toString(16).toUpperCase().padStart(4, "0");
    setAddrDisplay([addrHex[0], addrHex[1], addrHex[2], addrHex[3]]);
    const val = emulator.readMem(addr);
    const valHex = val.toString(16).toUpperCase().padStart(2, "0");
    setDataDisplay([valHex[0], valHex[1]]);
  };

  const handleRegisterEdit = (key: string, idx: number) => {
    const reg = registersList[idx];
    if (reg === "PC" || reg === "SP") {
      // 16-bit register editing
      const nextBuffer = (inputBuffer + key).slice(-4);
      setInputBuffer(nextBuffer);
      const val = parseInt(nextBuffer, 16);

      if (reg === "PC") {
        emulator.state.pc = val;
      } else {
        emulator.state.sp = val;
      }

      const hex16 = val.toString(16).toUpperCase().padStart(4, "0");
      setAddrDisplay([reg[0], reg[1] || " ", hex16[0], hex16[1]]);
      setDataDisplay([hex16[2], hex16[3]]);
      onStateChange();
    } else {
      // 8-bit register editing
      const nextBuffer = (inputBuffer + key).slice(-2);
      setInputBuffer(nextBuffer);
      const val = parseInt(nextBuffer, 16);

      if (reg === "A") emulator.state.a = val;
      else if (reg === "B") emulator.state.b = val;
      else if (reg === "C") emulator.state.c = val;
      else if (reg === "D") emulator.state.d = val;
      else if (reg === "E") emulator.state.e = val;
      else if (reg === "H") emulator.state.h = val;
      else if (reg === "L") emulator.state.l = val;

      const hex8 = val.toString(16).toUpperCase().padStart(2, "0");
      setDataDisplay([hex8[0], hex8[1]]);
      onStateChange();
    }
  };

  const handleKeyPress = (key: KeypadKey) => {
    setDepressedKey(key);
    setTimeout(() => setDepressedKey(null), 140);

    // Audio click feedback
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(key === "RESET" ? 180 : 750, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {}

    // RESET Button
    if (key === "RESET") {
      emulator.reset();
      setKitMode(KitMode.IDLE);
      setAddrDisplay([" ", "M", "P", " "]);
      setDataDisplay([" ", " "]);
      setCurrentAddress(0x2000);
      setInputBuffer("");
      setIsShiftActive(false);
      onStateChange();
      return;
    }

    // SHIFT Button
    if (key === "SHIFT") {
      setIsShiftActive(prev => !prev);
      return;
    }

    // State machine logic
    switch (kitMode) {
      case KitMode.IDLE:
        if (key === "REL_EXMEM") {
          setKitMode(KitMode.EX_MEM_ADDR);
          setAddrDisplay(["_", "_", "_", "_"]);
          setDataDisplay([" ", " "]);
          setInputBuffer("");
        } else if (key === "EXREG") {
          setKitMode(KitMode.EX_REG);
          setRegisterIndex(0);
          setInputBuffer("");
          showRegisterOnDisplay(0);
        } else if (key === "GO") {
          setKitMode(KitMode.RUNNING_KIT);
          setAddrDisplay(["G", "2", "0", "0"]);
          setDataDisplay([" ", " "]);
          setInputBuffer("2000");
        } else if (key === "BM") {
          setKitMode(KitMode.BLOCK_MOVE_SRC_START);
          setAddrDisplay(["S", "S", " ", " "]);
          setDataDisplay([" ", " "]);
          setInputBuffer("");
        } else if (key === "FILL") {
          setKitMode(KitMode.FILL_START);
          setAddrDisplay(["F", "S", " ", " "]);
          setDataDisplay([" ", " "]);
          setInputBuffer("");
        }
        break;

      case KitMode.EX_MEM_ADDR:
        if (isHexKey(key)) {
          const nextBuffer = (inputBuffer + key).slice(-4);
          setInputBuffer(nextBuffer);

          const displayDigits = [" ", " ", " ", " "];
          for (let i = 0; i < nextBuffer.length; i++) {
            displayDigits[3 - (nextBuffer.length - 1 - i)] = nextBuffer[i];
          }
          setAddrDisplay(displayDigits);

          if (nextBuffer.length === 4) {
            const parsedAddr = parseInt(nextBuffer, 16);
            setCurrentAddress(parsedAddr);
          }
        } else if (key === "MEMC_NEXT") {
          setKitMode(KitMode.EX_MEM_DATA);
          updateDisplayFromAddrAndMem(currentAddress);
          setInputBuffer("");
        } else if (key === "REL_EXMEM") {
          setInputBuffer("");
          setAddrDisplay(["_", "_", "_", "_"]);
        }
        break;

      case KitMode.EX_MEM_DATA:
        if (isHexKey(key)) {
          const nextBuffer = (inputBuffer + key).slice(-2);
          setInputBuffer(nextBuffer);

          const displayDigits = [" ", " "];
          for (let i = 0; i < nextBuffer.length; i++) {
            displayDigits[1 - (nextBuffer.length - 1 - i)] = nextBuffer[i];
          }
          setDataDisplay(displayDigits);

          const val = parseInt(nextBuffer, 16);
          emulator.writeMem(currentAddress, val);
          onStateChange();
        } else if (key === "MEMC_NEXT") {
          const nextAddr = (currentAddress + 1) & 0xFFFF;
          setCurrentAddress(nextAddr);
          updateDisplayFromAddrAndMem(nextAddr);
          setInputBuffer("");
        } else if (key === "STRING_PRE") {
          const prevAddr = (currentAddress - 1) & 0xFFFF;
          setCurrentAddress(prevAddr);
          updateDisplayFromAddrAndMem(prevAddr);
          setInputBuffer("");
        } else if (key === "REL_EXMEM") {
          setKitMode(KitMode.EX_MEM_ADDR);
          updateDisplayFromAddr(currentAddress);
          setInputBuffer(currentAddress.toString(16).toUpperCase());
          setDataDisplay([" ", " "]);
        } else if (key === "DEL_DATA") {
          for (let a = currentAddress; a < 0xFFFF; a++) {
            emulator.writeMem(a, emulator.readMem(a + 1));
          }
          emulator.writeMem(0xFFFF, 0);
          updateDisplayFromAddrAndMem(currentAddress);
          onStateChange();
        } else if (key === "INS_DATA") {
          for (let a = 0xFFFF; a > currentAddress; a--) {
            emulator.writeMem(a, emulator.readMem(a - 1));
          }
          emulator.writeMem(currentAddress, 0);
          updateDisplayFromAddrAndMem(currentAddress);
          onStateChange();
        }
        break;

      case KitMode.EX_REG:
        if (key === "MEMC_NEXT") {
          const nextIdx = (registerIndex + 1) % registersList.length;
          setRegisterIndex(nextIdx);
          setInputBuffer("");
          showRegisterOnDisplay(nextIdx);
        } else if (key === "STRING_PRE") {
          const prevIdx = (registerIndex - 1 + registersList.length) % registersList.length;
          setRegisterIndex(prevIdx);
          setInputBuffer("");
          showRegisterOnDisplay(prevIdx);
        } else if (isHexKey(key)) {
          handleRegisterEdit(key, registerIndex);
        } else if (key === "REL_EXMEM") {
          setKitMode(KitMode.IDLE);
          setAddrDisplay([" ", "M", "P", " "]);
          setDataDisplay([" ", " "]);
          setInputBuffer("");
        }
        break;

      case KitMode.RUNNING_KIT:
        if (isHexKey(key)) {
          const nextBuffer = (inputBuffer + key).slice(-4);
          setInputBuffer(nextBuffer);

          const displayDigits = ["G", "2", "0", "0"];
          for (let i = 0; i < nextBuffer.length; i++) {
            displayDigits[3 - (nextBuffer.length - 1 - i)] = nextBuffer[i];
          }
          setAddrDisplay(displayDigits);
        } else if (key === "MEMC_NEXT" || key === "GO" || key === "FILL") {
          const startAddr = parseInt(inputBuffer || "2000", 16);
          emulator.state.pc = startAddr;
          emulator.state.running = true;
          emulator.state.halted = false;

          // Run the program synchronously until HLT or maximum steps (safety)
          let steps = 0;
          const maxSteps = 50000;
          while (emulator.state.running && !emulator.state.halted && steps < maxSteps) {
            emulator.step();
            steps++;
          }

          setAddrDisplay(["E", " ", " ", " "]);
          setDataDisplay([" ", " "]);
          setKitMode(KitMode.IDLE);
          onStateChange();
        }
        break;

      // --- BLOCK MOVE FLOW ---
      case KitMode.BLOCK_MOVE_SRC_START:
        if (isHexKey(key)) {
          const nextBuffer = (inputBuffer + key).slice(-4);
          setInputBuffer(nextBuffer);
          setAddrDisplay(nextBuffer.padStart(4, " ").split(""));
        } else if (key === "MEMC_NEXT") {
          const addr = parseInt(inputBuffer || "2000", 16);
          setBmSrcStart(addr);
          setKitMode(KitMode.BLOCK_MOVE_SRC_END);
          setAddrDisplay(["S", "E", " ", " "]);
          setDataDisplay([" ", " "]);
          setInputBuffer("");
        }
        break;

      case KitMode.BLOCK_MOVE_SRC_END:
        if (isHexKey(key)) {
          const nextBuffer = (inputBuffer + key).slice(-4);
          setInputBuffer(nextBuffer);
          setAddrDisplay(nextBuffer.padStart(4, " ").split(""));
        } else if (key === "MEMC_NEXT") {
          const addr = parseInt(inputBuffer || "2000", 16);
          setBmSrcEnd(addr);
          setKitMode(KitMode.BLOCK_MOVE_DEST);
          setAddrDisplay(["d", "S", "t", " "]);
          setDataDisplay([" ", " "]);
          setInputBuffer("");
        }
        break;

      case KitMode.BLOCK_MOVE_DEST:
        if (isHexKey(key)) {
          const nextBuffer = (inputBuffer + key).slice(-4);
          setInputBuffer(nextBuffer);
          setAddrDisplay(nextBuffer.padStart(4, " ").split(""));
        } else if (key === "MEMC_NEXT") {
          const destAddr = parseInt(inputBuffer || "3000", 16);
          let d = destAddr;
          for (let s = bmSrcStart; s <= bmSrcEnd; s++) {
            emulator.writeMem(d, emulator.readMem(s));
            d = (d + 1) & 0xFFFF;
          }
          setAddrDisplay(["d", "o", "n", "E"]);
          setDataDisplay([" ", " "]);
          onStateChange();
          setTimeout(() => {
            setKitMode(KitMode.IDLE);
            setAddrDisplay([" ", "M", "P", " "]);
            setDataDisplay([" ", " "]);
          }, 1500);
        }
        break;

      // --- MEMORY FILL FLOW ---
      case KitMode.FILL_START:
        if (isHexKey(key)) {
          const nextBuffer = (inputBuffer + key).slice(-4);
          setInputBuffer(nextBuffer);
          setAddrDisplay(nextBuffer.padStart(4, " ").split(""));
        } else if (key === "MEMC_NEXT") {
          const addr = parseInt(inputBuffer || "2000", 16);
          setFillStart(addr);
          setKitMode(KitMode.FILL_END);
          setAddrDisplay(["F", "E", " ", " "]);
          setDataDisplay([" ", " "]);
          setInputBuffer("");
        }
        break;

      case KitMode.FILL_END:
        if (isHexKey(key)) {
          const nextBuffer = (inputBuffer + key).slice(-4);
          setInputBuffer(nextBuffer);
          setAddrDisplay(nextBuffer.padStart(4, " ").split(""));
        } else if (key === "MEMC_NEXT") {
          const addr = parseInt(inputBuffer || "2000", 16);
          setFillEnd(addr);
          setKitMode(KitMode.FILL_VAL);
          setAddrDisplay(["F", "v", "A", "L"]);
          setDataDisplay(["-", "-"]);
          setInputBuffer("");
        }
        break;

      case KitMode.FILL_VAL:
        if (isHexKey(key)) {
          const nextBuffer = (inputBuffer + key).slice(-2);
          setInputBuffer(nextBuffer);
          setDataDisplay(nextBuffer.padStart(2, "-").split(""));
        } else if (key === "MEMC_NEXT") {
          const val = parseInt(inputBuffer || "00", 16);
          if (fillStart > fillEnd) {
            setAddrDisplay(["E", "r", "r", " "]);
            setDataDisplay([" ", " "]);
          } else {
            for (let s = fillStart; s <= fillEnd; s++) {
              emulator.writeMem(s, val);
            }
            setAddrDisplay(["E", " ", " ", " "]);
            setDataDisplay([" ", " "]);
          }
          onStateChange();
        }
        break;
    }
  };

  const isHexKey = (key: KeypadKey): boolean => {
    return /^[0-9A-F]$/.test(key);
  };

  const showRegisterOnDisplay = (idx: number) => {
    const reg = registersList[idx];
    let val = 0;

    let label = ["-", "-", "-", "-"];
    if (reg === "A") { label = ["r", "E", "G", "A"]; val = emulator.state.a; }
    else if (reg === "B") { label = ["r", "E", "G", "b"]; val = emulator.state.b; }
    else if (reg === "C") { label = ["r", "E", "G", "C"]; val = emulator.state.c; }
    else if (reg === "D") { label = ["r", "E", "G", "d"]; val = emulator.state.d; }
    else if (reg === "E") { label = ["r", "E", "G", "E"]; val = emulator.state.e; }
    else if (reg === "H") { label = ["r", "E", "G", "H"]; val = emulator.state.h; }
    else if (reg === "L") { label = ["r", "E", "G", "L"]; val = emulator.state.l; }
    else if (reg === "PC") { label = ["P", "C", "H", "L"]; val = emulator.state.pc; }
    else if (reg === "SP") { label = ["S", "P", "H", "L"]; val = emulator.state.sp; }

    setAddrDisplay(label);

    if (reg === "PC" || reg === "SP") {
      const hex16 = val.toString(16).toUpperCase().padStart(4, "0");
      setDataDisplay([hex16[2], hex16[3]]);
      setAddrDisplay([reg[0], reg[1] || " ", hex16[0], hex16[1]]);
    } else {
      const hex8 = val.toString(16).toUpperCase().padStart(2, "0");
      setDataDisplay([hex8[0], hex8[1]]);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[460px] flex items-center justify-center bg-[#070707] p-2 overflow-hidden"
    >
      {/* Board wrapper for scale */}
      <div
        className="relative flex items-center justify-center select-none"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          width: "840px",
          height: "560px",
          margin: `${(scale - 1) * 280}px ${(scale - 1) * 420}px`,
        }}
      >
        {/* PCB Board */}
        <div
          id="trainer-pcb-board"
          className="w-[840px] h-[560px] relative bg-[#0f3d24] border-4 border-[#071d11] rounded-2xl shadow-[inset_0_4px_12px_rgba(255,255,255,0.15),0_20px_40px_rgba(0,0,0,0.85)] p-5 overflow-hidden"
        >
          {/* PCB tracks background */}
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1.5px,transparent_1.5px)] bg-[size:16px_16px] opacity-20 pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.04)_1px,transparent_1px)] bg-[size:8px_8px] pointer-events-none" />
          <svg className="absolute inset-0 w-full h-full stroke-[#10b981]/10 stroke-[1.2] fill-none pointer-events-none">
            <path d="M 50 100 L 200 100 L 250 150 L 250 300 L 300 350 L 500 350" />
            <path d="M 100 200 L 100 400 L 150 450 L 350 450" />
            <path d="M 600 50 L 700 50 L 750 100 L 750 200" />
            <path d="M 400 100 L 450 50 L 580 50" />
            <path d="M 300 120 L 350 120 L 380 150 L 380 280" />
            <path d="M 390 100 L 390 200 L 410 220" />
          </svg>

          {/* Corner Screws */}
          <Screw x="top-2.5 left-2.5" />
          <Screw x="top-2.5 right-2.5" />
          <Screw x="bottom-2.5 left-2.5" />
          <Screw x="bottom-2.5 right-2.5" />

          {/* Silkscreen text and guidelines */}
          <div className="absolute top-3 left-12 text-[#2ecc71]/40 font-mono text-[7px] select-none uppercase tracking-widest">
            ST8085-01 MICROPROCESSOR LABtwin BOARD
          </div>
          <div className="absolute bottom-3 left-12 text-[#2ecc71]/30 font-mono text-[6.5px] select-none">
            MICROPROCESSOR TRAINER BOARD • SERIAL No: 85-ST420-B
          </div>

          {/* ----------------- COLUMN 1: LEFT AREA (IC COMPONENTS) ----------------- */}

          {/* Pin Header JP1 */}
          <PinHeader count={14} orientation="h" className="absolute left-10 top-12" />
          <span className="absolute left-10 top-8 text-[#2ecc71]/50 font-mono text-[6px]">CN2</span>

          {/* NEC D8253 Timer */}
          <DipChip
            label="NEC D8253C-2"
            sublabel="TIMER COUNTER"
            pinsCount={24}
            orientation="vertical"
            className="absolute left-10 top-20 w-[54px] h-[105px]"
          />

          {/* Crystal Oscillator Section */}
          <div className="absolute left-10 top-[280px] flex flex-col items-center gap-1">
            <div className="w-5 h-7 rounded bg-gradient-to-br from-neutral-200 to-neutral-400 border border-neutral-500 flex items-center justify-center font-mono text-[5.5px] font-bold text-neutral-700 shadow shadow-black/40">
              <div className="text-center select-none scale-[0.85] leading-none">
                X-TAL<br />6.144<br />MHz
              </div>
            </div>
            <span className="text-[#2ecc71]/50 font-mono text-[5.5px]">X-1</span>
          </div>

          {/* Main Intel 8085 CPU */}
          <DipChip
            label="NEC D8085AH-2"
            sublabel="8085 CPU"
            pinsCount={40}
            orientation="vertical"
            className="absolute left-[78px] top-[280px] w-[62px] h-[210px]"
          />
          <span className="absolute left-[78px] top-[500px] text-[#2ecc71]/50 font-mono text-[6px]">8085 CPU BOARD</span>

          {/* Vertical connector header JP2 */}
          <PinHeader count={20} orientation="v" className="absolute left-20 top-40" />

          {/* ----------------- COLUMN 2: MIDDLE AREA ----------------- */}

          {/* NEC D8255 PPI */}
          <DipChip
            label="NEC D8255AC-2"
            sublabel="PPI INTERFACE"
            pinsCount={40}
            orientation="vertical"
            className="absolute left-[165px] top-[80px] w-[62px] h-[210px]"
          />
          <span className="absolute left-[165px] top-[295px] text-[#2ecc71]/50 font-mono text-[6px]">8255 PPI PORT</span>

          {/* Horizontal Blue Capacitor */}
          <HorizontalCapacitor className="absolute left-[165px] top-[340px]" />

          {/* Resistors Network Area */}
          <ResistorHorizontal className="absolute left-[105px] top-[245px]" />
          <ResistorHorizontal className="absolute left-[105px] top-[260px]" />
          <div className="absolute left-[165px] top-[380px] flex flex-col gap-1.5">
            <ResistorHorizontal />
            <ResistorHorizontal />
            <ResistorHorizontal />
          </div>

          {/* Memory Chips Side-by-Side */}
          <DipChip
            label="HY6264A LP-70"
            sublabel="8KB SRAM"
            pinsCount={28}
            orientation="vertical"
            className="absolute left-[245px] top-[365px] w-[56px] h-[145px]"
          />
          <span className="absolute left-[245px] top-[515px] text-[#2ecc71]/50 font-mono text-[6px]">MEM 2 (RAM)</span>

          <DipChip
            label="W27C512-45Z"
            sublabel="8KB ROM"
            pinsCount={28}
            orientation="vertical"
            className="absolute left-[315px] top-[365px] w-[56px] h-[145px]"
          />
          <span className="absolute left-[315px] top-[515px] text-[#2ecc71]/50 font-mono text-[6px]">MEM 1 (ROM)</span>

          {/* ----------------- COLUMN 3: RIGHT / DISPLAY & CONTROL ----------------- */}

          {/* Branding Title */}
          <div className="absolute left-[400px] top-[30px] select-none">
            <span className="text-[#2ecc71]/60 font-mono text-[7px] block uppercase tracking-widest leading-none">INTEL 8085 EMULATOR</span>
            <span className="text-white font-extrabold font-display text-[19px] tracking-wider block uppercase mt-1 leading-none">ST8085-01 KIT</span>
            <span className="text-[#2ecc71] font-mono text-[8px] tracking-tight block uppercase mt-1.5">INTEL 8085A TRAINER BOARD</span>
          </div>

          {/* Status LEDs: RUN & HALT */}
          <div className="absolute left-[645px] top-[36px] flex gap-4 bg-black/40 border border-[#0d4d28] px-3 py-1.5 rounded-lg">
            <div className="flex flex-col items-center select-none">
              <span className="text-[7px] text-neutral-400 font-mono font-bold leading-none mb-1 uppercase tracking-wide">RUN</span>
              <div className={`w-2 h-2 rounded-full border border-black/50 transition-all duration-300 ${isRunning ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-emerald-950"}`} />
            </div>
            <div className="flex flex-col items-center select-none">
              <span className="text-[7px] text-neutral-400 font-mono font-bold leading-none mb-1 uppercase tracking-wide">HALT</span>
              <div className={`w-2 h-2 rounded-full border border-black/50 transition-all duration-300 ${isHalted ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : "bg-red-950"}`} />
            </div>
          </div>

          {/* 6-Digit 7-Segment LED Display Module */}
          <div className="absolute left-[400px] top-[90px] w-[345px] h-[85px] bg-[#220404] border-2 border-red-950 rounded-xl p-3 flex flex-col justify-between shadow-[inset_0_4px_10px_rgba(0,0,0,0.95),0_6px_12px_rgba(0,0,0,0.5)]">
            {/* LED Display row */}
            <div className="flex justify-between items-center bg-black/90 border border-red-950/60 px-3 py-1.5 rounded-lg gap-2">
              {/* ADDRESS - 4 Digits */}
              <div className="flex gap-1.5">
                {addrDisplay.map((char, index) => (
                  <SevenSegmentDigit key={`addr-${index}`} char={char} />
                ))}
              </div>

              {/* Separator block */}
              <div className="w-2" />

              {/* DATA - 2 Digits */}
              <div className="flex gap-1.5">
                {dataDisplay.map((char, index) => (
                  <SevenSegmentDigit key={`data-${index}`} char={char} />
                ))}
              </div>
            </div>

            {/* Labels beneath displays */}
            <div className="flex justify-between items-center text-[7.5px] text-red-500/80 font-mono tracking-widest font-bold px-3 select-none uppercase">
              <span>ADDRESS DISPLAY</span>
              <span>DATA DISPLAY</span>
            </div>
          </div>

          {/* Serial COM Port Connector */}
          <DB9Connector className="absolute left-[770px] top-[95px]" />
          <span className="absolute left-[762px] top-[75px] text-[#2ecc71]/50 font-mono text-[6px]">COM SERIAL</span>

          {/* ----------------- PHYSICAL TACTILE KEYPAD ----------------- */}

          <div className="absolute left-[380px] top-[195px] w-[425px] h-[260px] bg-neutral-950/90 border-2 border-[#093c1f]/60 rounded-xl p-2.5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.8)] grid grid-cols-12 gap-2">
            
            {/* SYSTEM COMMAND KEYS (12 BLUE KEYS - 4x3 Grid) */}
            <div className="col-span-5 grid grid-cols-3 gap-1.5 text-[6px] font-bold font-mono">
              {/* Row 1 */}
              <button
                onClick={() => handleKeyPress("RESET")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center text-white text-[7px] border transition-all cursor-pointer ${depressedKey === "RESET" ? "translate-y-0.5 scale-[0.95] bg-red-800 border-red-950 shadow-inner" : "bg-red-600 hover:bg-red-500 border-red-500 shadow-[0_3px_0_#7f1d1d]"}`}
              >
                <span className="font-extrabold tracking-wide">RESET</span>
              </button>
              <button
                onClick={() => handleKeyPress("VCT_INT")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center text-white border transition-all cursor-pointer ${depressedKey === "VCT_INT" ? "translate-y-0.5 scale-[0.95] bg-sky-800 border-sky-950 shadow-inner" : "bg-sky-600 hover:bg-sky-500 border-sky-400 shadow-[0_3px_0_#0369a1]"}`}
              >
                <span className="tracking-tighter">VCT INT</span>
              </button>
              <button
                onClick={() => handleKeyPress("SHIFT")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center text-white border transition-all cursor-pointer ${depressedKey === "SHIFT" ? "translate-y-0.5 scale-[0.95] bg-neutral-800 border-neutral-950 shadow-inner" : isShiftActive ? "bg-amber-600 border-amber-500 shadow-[0_1px_0_rgba(0,0,0,0.8)] translate-y-[2px]" : "bg-neutral-600 hover:bg-neutral-500 border-neutral-500 shadow-[0_3px_0_#262626]"}`}
              >
                <span className="tracking-tight">SHIFT</span>
              </button>

              {/* Row 2 */}
              <button
                onClick={() => handleKeyPress("EXREG")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center text-white border transition-all cursor-pointer ${depressedKey === "EXREG" ? "translate-y-0.5 scale-[0.95] bg-sky-800 border-sky-950 shadow-inner" : "bg-sky-600 hover:bg-sky-500 border-sky-400 shadow-[0_3px_0_#0369a1]"}`}
              >
                <span className="leading-tight">EXREG</span>
                <span className="text-[5px] opacity-85 font-semibold text-sky-100">SI</span>
              </button>
              <button
                onClick={() => handleKeyPress("INS_DATA")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center text-white border transition-all cursor-pointer ${depressedKey === "INS_DATA" ? "translate-y-0.5 scale-[0.95] bg-sky-800 border-sky-950 shadow-inner" : "bg-sky-600 hover:bg-sky-500 border-sky-400 shadow-[0_3px_0_#0369a1]"}`}
              >
                <span className="leading-tight">INS</span>
                <span className="text-[5px] opacity-85 font-semibold text-sky-100">DATA</span>
              </button>
              <button
                onClick={() => handleKeyPress("DEL_DATA")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center text-white border transition-all cursor-pointer ${depressedKey === "DEL_DATA" ? "translate-y-0.5 scale-[0.95] bg-sky-800 border-sky-950 shadow-inner" : "bg-sky-600 hover:bg-sky-500 border-sky-400 shadow-[0_3px_0_#0369a1]"}`}
              >
                <span className="leading-tight">DEL</span>
                <span className="text-[5px] opacity-85 font-semibold text-sky-100">DATA</span>
              </button>

              {/* Row 3 */}
              <button
                onClick={() => handleKeyPress("GO")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center text-white border transition-all cursor-pointer ${depressedKey === "GO" ? "translate-y-0.5 scale-[0.95] bg-sky-800 border-sky-950 shadow-inner" : "bg-sky-600 hover:bg-sky-500 border-sky-400 shadow-[0_3px_0_#0369a1]"}`}
              >
                <span className="tracking-wider font-extrabold text-[7.5px]">GO</span>
              </button>
              <button
                onClick={() => handleKeyPress("BM")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center text-white border transition-all cursor-pointer ${depressedKey === "BM" ? "translate-y-0.5 scale-[0.95] bg-sky-800 border-sky-950 shadow-inner" : "bg-sky-600 hover:bg-sky-500 border-sky-400 shadow-[0_3px_0_#0369a1]"}`}
              >
                <span>B.M</span>
              </button>
              <button
                onClick={() => handleKeyPress("REL_EXMEM")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center text-white border transition-all cursor-pointer ${depressedKey === "REL_EXMEM" ? "translate-y-0.5 scale-[0.95] bg-sky-800 border-sky-950 shadow-inner" : "bg-sky-600 hover:bg-sky-500 border-sky-400 shadow-[0_3px_0_#0369a1]"}`}
              >
                <span className="leading-none text-[5px] tracking-tighter">REL</span>
                <span className="text-[5px] opacity-85 font-semibold text-sky-100">EXMEM</span>
              </button>

              {/* Row 4 */}
              <button
                onClick={() => handleKeyPress("STRING_PRE")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center text-white border transition-all cursor-pointer ${depressedKey === "STRING_PRE" ? "translate-y-0.5 scale-[0.95] bg-sky-800 border-sky-950 shadow-inner" : "bg-sky-600 hover:bg-sky-500 border-sky-400 shadow-[0_3px_0_#0369a1]"}`}
              >
                <span className="leading-tight">STRING</span>
                <span className="text-[5px] opacity-85 font-semibold text-sky-100">PREV</span>
              </button>
              <button
                onClick={() => handleKeyPress("MEMC_NEXT")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center text-white border transition-all cursor-pointer ${depressedKey === "MEMC_NEXT" ? "translate-y-0.5 scale-[0.95] bg-sky-800 border-sky-950 shadow-inner" : "bg-sky-600 hover:bg-sky-500 border-sky-400 shadow-[0_3px_0_#0369a1]"}`}
              >
                <span className="leading-tight">MEMC</span>
                <span className="text-[5px] opacity-85 font-semibold text-sky-100">NEXT</span>
              </button>
              <button
                onClick={() => handleKeyPress("FILL")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center text-white border transition-all cursor-pointer ${depressedKey === "FILL" ? "translate-y-0.5 scale-[0.95] bg-emerald-800 border-emerald-950 shadow-inner" : "bg-emerald-600 hover:bg-emerald-500 border-emerald-500 shadow-[0_3px_0_#065f46]"}`}
              >
                <span>FILL</span>
                <span className="text-[5px] opacity-80">■</span>
              </button>
            </div>

            {/* HEX DATA & REGISTER KEYS (16 BLACK KEYS - 4x4 Grid) */}
            <div className="col-span-7 grid grid-cols-4 gap-1.5 text-[6.5px] font-bold font-mono text-neutral-300">
              {/* Row 1: C, D, E, F */}
              <button
                onClick={() => handleKeyPress("C")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "C" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">C</span>
                <span className="text-[5px] text-emerald-400 font-semibold opacity-80 mt-0.5">REG C</span>
              </button>
              <button
                onClick={() => handleKeyPress("D")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "D" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">D</span>
                <span className="text-[5px] text-emerald-400 font-semibold opacity-80 mt-0.5">REG D</span>
              </button>
              <button
                onClick={() => handleKeyPress("E")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "E" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">E</span>
                <span className="text-[5px] text-emerald-400 font-semibold opacity-80 mt-0.5">REG E</span>
              </button>
              <button
                onClick={() => handleKeyPress("F")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "F" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">F</span>
                <span className="text-[5px] text-neutral-500 font-semibold opacity-60 mt-0.5">-</span>
              </button>

              {/* Row 2: 8, 9, A, B */}
              <button
                onClick={() => handleKeyPress("8")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "8" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">8</span>
                <span className="text-[5px] text-emerald-400 font-semibold opacity-80 mt-0.5">REG H</span>
              </button>
              <button
                onClick={() => handleKeyPress("9")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "9" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">9</span>
                <span className="text-[5px] text-emerald-400 font-semibold opacity-80 mt-0.5">REG L</span>
              </button>
              <button
                onClick={() => handleKeyPress("A")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "A" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">A</span>
                <span className="text-[5px] text-neutral-500 font-semibold opacity-60 mt-0.5">-</span>
              </button>
              <button
                onClick={() => handleKeyPress("B")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "B" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">B</span>
                <span className="text-[5px] text-neutral-500 font-semibold opacity-60 mt-0.5">-</span>
              </button>

              {/* Row 3: 4, 5, 6, 7 */}
              <button
                onClick={() => handleKeyPress("4")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "4" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">4</span>
                <span className="text-[5px] text-emerald-400 font-semibold opacity-80 mt-0.5">PCH</span>
              </button>
              <button
                onClick={() => handleKeyPress("5")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "5" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">5</span>
                <span className="text-[5px] text-emerald-400 font-semibold opacity-80 mt-0.5">PCL</span>
              </button>
              <button
                onClick={() => handleKeyPress("6")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "6" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">6</span>
                <span className="text-[5px] text-emerald-400 font-semibold opacity-80 mt-0.5">SPH</span>
              </button>
              <button
                onClick={() => handleKeyPress("7")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "7" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">7</span>
                <span className="text-[5px] text-emerald-400 font-semibold opacity-80 mt-0.5">SPL</span>
              </button>

              {/* Row 4: 0, 1, 2, 3 */}
              <button
                onClick={() => handleKeyPress("0")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "0" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">0</span>
                <span className="text-[5px] text-neutral-500 font-semibold opacity-60 mt-0.5">-</span>
              </button>
              <button
                onClick={() => handleKeyPress("1")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "1" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">1</span>
                <span className="text-[5px] text-neutral-500 font-semibold opacity-60 mt-0.5">-</span>
              </button>
              <button
                onClick={() => handleKeyPress("2")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "2" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">2</span>
                <span className="text-[5px] text-emerald-400 font-semibold opacity-80 mt-0.5">SER</span>
              </button>
              <button
                onClick={() => handleKeyPress("3")}
                className={`w-full aspect-square rounded-md flex flex-col justify-center items-center border transition-all cursor-pointer ${depressedKey === "3" ? "translate-y-0.5 scale-[0.95] bg-neutral-900 border-black shadow-inner" : "bg-neutral-850 hover:bg-neutral-800 border-neutral-800 shadow-[0_3px_0_#111]"}`}
              >
                <span className="text-[10px] text-white font-extrabold leading-none">3</span>
                <span className="text-[5px] text-neutral-500 font-semibold opacity-60 mt-0.5">-</span>
              </button>
            </div>

          </div>

          {/* Logo, Silkscreen and Branding Under Keypad */}
          <div className="absolute right-8 bottom-3 select-none flex items-center gap-1.5 opacity-90">
            <svg className="w-5 h-5 text-white/90 fill-current" viewBox="0 0 24 24">
              <path d="M12 2L2 22h20L12 2zm0 4l6 12H6l6-12z"/>
            </svg>
            <div>
              <span className="text-white font-bold font-display text-[11px] tracking-widest block leading-none">8085-KIT</span>
              <span className="text-[#2ecc71] font-mono text-[6px] tracking-tight block uppercase mt-0.5">8085 MICROPROCESSOR KIT</span>
            </div>
          </div>

          {/* Board markings along the bottom edge */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-12 font-mono text-[5.5px] text-[#2ecc71]/40 tracking-wider">
            <span>ST8085-01</span>
            <span>ST8085-02</span>
            <span>ST8085-03</span>
            <span>ST8085-05</span>
            <span>ST8085-KIT</span>
          </div>

        </div>
      </div>
    </div>
  );
}
