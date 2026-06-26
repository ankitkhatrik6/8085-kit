/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CpuState {
  a: number; // Accumulator (8-bit)
  b: number; // Register B (8-bit)
  c: number; // Register C (8-bit)
  d: number; // Register D (8-bit)
  e: number; // Register E (8-bit)
  h: number; // Register H (8-bit)
  l: number; // Register L (8-bit)
  pc: number; // Program Counter (16-bit)
  sp: number; // Stack Pointer (16-bit)
  f: {
    s: boolean;  // Sign
    z: boolean;  // Zero
    ac: boolean; // Auxiliary Carry
    p: boolean;  // Parity
    cy: boolean; // Carry
  };
  halted: boolean;
  running: boolean;
}

export interface InstructionLog {
  pc: number;
  opcode: number;
  mnemonic: string;
  bytes: string[];
  cycles: number;
  timestamp: string;
}

export interface AssemblyLine {
  lineNumber: number;
  rawText: string;
  cleanText: string;
  address?: number;
  opcodes?: string[];
  error?: string;
  label?: string;
  mnemonic?: string;
  operand?: string;
  cycles?: number;
  size?: number;
}

export interface AssemblerResult {
  success: boolean;
  errors: Array<{ lineNumber: number; message: string }>;
  lines: AssemblyLine[];
  hexMap: Record<number, number>; // Address -> byte value
  symbols: Record<string, number>; // Label -> Address
}

export interface Experiment {
  id: string;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  description: string;
  learningObjectives: string[];
  assemblyCode: string;
  setupInstructions: string;
  expectedResult: string;
}

export type KeypadKey =
  // Command Keys
  | "RESET"
  | "VCT_INT"
  | "SHIFT"
  | "EXREG"
  | "INS_DATA"
  | "DEL_DATA"
  | "GO"
  | "BM"
  | "REL_EXMEM"
  | "STRING_PRE"
  | "MEMC_NEXT"
  | "FILL"
  // Hex keys 0-F
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7"
  | "8" | "9" | "A" | "B" | "C" | "D" | "E" | "F";

export enum KitMode {
  IDLE = "IDLE",
  EX_MEM_ADDR = "EX_MEM_ADDR", // Entering memory address to examine
  EX_MEM_DATA = "EX_MEM_DATA", // Entering memory data to write
  EX_REG = "EX_REG",           // Examining registers
  RUNNING_KIT = "RUNNING_KIT", // Program is running via GO key
  BLOCK_MOVE_SRC_START = "BLOCK_MOVE_SRC_START",
  BLOCK_MOVE_SRC_END = "BLOCK_MOVE_SRC_END",
  BLOCK_MOVE_DEST = "BLOCK_MOVE_DEST",
  FILL_START = "FILL_START",
  FILL_END = "FILL_END",
  FILL_VAL = "FILL_VAL",
}

export interface OpcodesInfo {
  opcode: number;
  mnemonic: string;
  bytes: number;
  cycles: number;
  description: string;
}
