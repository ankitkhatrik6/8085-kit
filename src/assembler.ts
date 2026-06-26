/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssemblyLine, AssemblerResult } from "./types";

// Standard register mapping
const REG_MAP: Record<string, number> = {
  B: 0, C: 1, D: 2, E: 3, H: 4, L: 5, M: 6, A: 7
};

// Register pair mapping
const RP_MAP: Record<string, number> = {
  B: 0, BC: 0,
  D: 1, DE: 1,
  H: 2, HL: 2,
  SP: 3,
  PSW: 3 // For push/pop
};

// Condition mapping
const CC_MAP: Record<string, number> = {
  NZ: 0, Z: 1, NC: 2, C: 3, PO: 4, PE: 5, P: 6, M: 7
};

export function assemble(code: string): AssemblerResult {
  const lines: AssemblyLine[] = [];
  const errors: Array<{ lineNumber: number; message: string }> = [];
  const symbols: Record<string, number> = {};
  const hexMap: Record<number, number> = {};

  let currentAddress = 0x2000; // Default start address for trainer RAM

  // --- PASS 1: Parse structure, clean code, identify labels and compute sizes ---
  const rawLines = code.split("\n");
  
  for (let i = 0; i < rawLines.length; i++) {
    const rawText = rawLines[i];
    const lineNumber = i + 1;

    // Strip comments
    let cleanText = rawText.split(";")[0].trim();
    if (!cleanText) {
      lines.push({ lineNumber, rawText, cleanText: "" });
      continue;
    }

    let label: string | undefined;

    // Check for label
    const labelMatch = cleanText.match(/^([A-Za-z_][A-Za-z0-9_]*):(.*)$/);
    if (labelMatch) {
      label = labelMatch[1];
      cleanText = labelMatch[2].trim();
      
      // Save label with current address
      if (symbols[label] !== undefined) {
        errors.push({ lineNumber, message: `Duplicate label definition: '${label}'` });
      } else {
        symbols[label] = currentAddress;
      }
    }

    if (!cleanText) {
      lines.push({ lineNumber, rawText, cleanText: "", label });
      continue;
    }

    // Parse mnemonic and operand
    const parts = cleanText.split(/\s+/);
    const mnemonic = parts[0].toUpperCase();
    const operand = parts.slice(1).join(" ").trim();

    // Handle ORG directive in pass 1
    if (mnemonic === "ORG") {
      const addrVal = parseNumber(operand);
      if (addrVal === null || addrVal < 0 || addrVal > 0xFFFF) {
        errors.push({ lineNumber, message: `Invalid ORG address: '${operand}'` });
      } else {
        currentAddress = addrVal;
      }
      lines.push({ lineNumber, rawText, cleanText, label, mnemonic, operand, size: 0 });
      continue;
    }

    // Determine instruction size in bytes
    let size = 0;
    try {
      size = getInstructionSize(mnemonic, operand);
    } catch (err: any) {
      errors.push({ lineNumber, message: err.message || "Invalid syntax" });
    }

    lines.push({
      lineNumber,
      rawText,
      cleanText,
      label,
      mnemonic,
      operand,
      address: currentAddress,
      size
    });

    // We only update symbol tables and addresses if no errors in pass 1
    if (label && symbols[label] !== undefined) {
      symbols[label] = currentAddress;
    }

    currentAddress += size;
  }

  // If there are errors in Pass 1, stop
  if (errors.length > 0) {
    return { success: false, errors, lines, hexMap, symbols };
  }

  // --- PASS 2: Assemble to byte opcodes and resolve labels ---
  for (const line of lines) {
    if (!line.mnemonic || line.size === 0) continue;

    const { mnemonic, operand, address, lineNumber } = line;
    if (address === undefined || line.size === undefined) continue;

    try {
      const bytes = compileInstruction(mnemonic, operand, address, symbols);
      if (bytes.length !== line.size) {
        errors.push({
          lineNumber,
          message: `Internal Assembler Error: Expected size ${line.size}, got ${bytes.length}`
        });
        continue;
      }

      line.opcodes = bytes.map(b => b.toString(16).toUpperCase().padStart(2, "0"));
      line.cycles = getInstructionCycles(mnemonic, operand);

      // Write bytes to output hexMap
      for (let j = 0; j < bytes.length; j++) {
        hexMap[address + j] = bytes[j];
      }
    } catch (err: any) {
      errors.push({
        lineNumber,
        message: err.message || `Assembly failed for '${mnemonic} ${operand}'`
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
    lines,
    hexMap,
    symbols
  };
}

// --- Parse hex/decimal/binary numbers ---
export function parseNumber(str: string): number | null {
  let s = str.trim().toUpperCase();
  if (!s) return null;

  // Handle Hex: e.g. 2050H or 0FFH
  if (s.endsWith("H")) {
    const hexStr = s.slice(0, -1);
    const parsed = parseInt(hexStr, 16);
    return isNaN(parsed) ? null : parsed;
  }

  // Handle Binary: e.g. 10101010B
  if (s.endsWith("B")) {
    const binStr = s.slice(0, -1);
    const parsed = parseInt(binStr, 2);
    return isNaN(parsed) ? null : parsed;
  }

  // Handle Octal: e.g. 177O or 177Q
  if (s.endsWith("O") || s.endsWith("Q")) {
    const octStr = s.slice(0, -1);
    const parsed = parseInt(octStr, 8);
    return isNaN(parsed) ? null : parsed;
  }

  // Default to decimal
  const parsed = parseInt(s, 10);
  return isNaN(parsed) ? null : parsed;
}

// --- Helper to get size of instruction ---
function getInstructionSize(mnemonic: string, operand: string): number {
  if (mnemonic === "DB") {
    // DB can take multiple bytes separated by commas, e.g. DB 05H, 0AH
    const count = operand.split(",").length;
    return count;
  }
  if (mnemonic === "DW") {
    // DW takes 16-bit words (2 bytes each)
    const count = operand.split(",").length;
    return count * 2;
  }

  // Standard 8085 instructions
  switch (mnemonic) {
    // 3-byte instructions (16-bit operand)
    case "LXI":
    case "LDA":
    case "STA":
    case "LHLD":
    case "SHLD":
    case "JMP":
    case "JC":
    case "JNC":
    case "JZ":
    case "JNZ":
    case "JP":
    case "JM":
    case "JPE":
    case "JPO":
    case "CALL":
    case "CC":
    case "CNC":
    case "CZ":
    case "CNZ":
    case "CP":
    case "CM":
    case "CPE":
    case "CPO":
      return 3;

    // 2-byte instructions (8-bit operand)
    case "MVI":
    case "ADI":
    case "ACI":
    case "SUI":
    case "SBI":
    case "ANI":
    case "XRI":
    case "ORI":
    case "CPI":
    case "IN":
    case "OUT":
      return 2;

    // 1-byte instructions
    case "NOP":
    case "HLT":
    case "ADD":
    case "ADC":
    case "SUB":
    case "SBB":
    case "ANA":
    case "XRA":
    case "ORA":
    case "CMP":
    case "INR":
    case "DCR":
    case "MOV":
    case "XCHG":
    case "XTHL":
    case "SPHL":
    case "PCHL":
    case "RET":
    case "RC":
    case "RNC":
    case "RZ":
    case "RNZ":
    case "RM":
    case "RP":
    case "RPE":
    case "RPO":
    case "PUSH":
    case "POP":
    case "INX":
    case "DCX":
    case "DAD":
    case "LDAX":
    case "STAX":
    case "RLC":
    case "RRC":
    case "RAL":
    case "RAR":
    case "CMA":
    case "DAA":
    case "STC":
    case "CMC":
    case "EI":
    case "DI":
    case "RIM":
    case "SIM":
    case "RST":
      return 1;

    default:
      throw new Error(`Unknown instruction or directive: '${mnemonic}'`);
  }
}

// --- Compile a single parsed instruction to byte array ---
function compileInstruction(
  mnemonic: string,
  operand: string,
  address: number,
  symbols: Record<string, number>
): number[] {
  // DB directive
  if (mnemonic === "DB") {
    const parts = operand.split(",");
    const result: number[] = [];
    for (const p of parts) {
      const val = parseNumber(p);
      if (val === null || val < 0 || val > 255) {
        throw new Error(`DB elements must be 8-bit bytes (0-255). Invalid value: '${p}'`);
      }
      result.push(val);
    }
    return result;
  }

  // DW directive
  if (mnemonic === "DW") {
    const parts = operand.split(",");
    const result: number[] = [];
    for (const p of parts) {
      const val = parseNumber(p);
      if (val === null || val < 0 || val > 65535) {
        throw new Error(`DW elements must be 16-bit words (0-65535). Invalid value: '${p}'`);
      }
      result.push(val & 0xFF);        // Low byte first (little-endian)
      result.push((val >> 8) & 0xFF); // High byte
    }
    return result;
  }

  // Standard instructions
  switch (mnemonic) {
    case "NOP": return [0x00];
    case "HLT": return [0x76];
    case "XCHG": return [0xEB];
    case "XTHL": return [0xE3];
    case "SPHL": return [0xF9];
    case "PCHL": return [0xE9];
    case "RLC": return [0x07];
    case "RRC": return [0x0F];
    case "RAL": return [0x17];
    case "RAR": return [0x1F];
    case "CMA": return [0x2F];
    case "DAA": return [0x27];
    case "STC": return [0x37];
    case "CMC": return [0x3F];
    case "EI": return [0xFB];
    case "DI": return [0xF3];
    case "RIM": return [0x20];
    case "SIM": return [0x30];

    case "MOV": {
      const parts = operand.split(",").map(s => s.trim());
      if (parts.length !== 2) throw new Error("MOV requires exactly 2 register operands, e.g., MOV A,B");
      const r1 = REG_MAP[parts[0]];
      const r2 = REG_MAP[parts[1]];
      if (r1 === undefined) throw new Error(`Invalid source register '${parts[0]}' in MOV`);
      if (r2 === undefined) throw new Error(`Invalid destination register '${parts[1]}' in MOV`);
      if (r1 === 6 && r2 === 6) throw new Error("MOV M,M is invalid");
      return [0x40 | (r1 << 3) | r2];
    }

    case "MVI": {
      const parts = operand.split(",").map(s => s.trim());
      if (parts.length !== 2) throw new Error("MVI requires register and immediate value, e.g., MVI A,05H");
      const r = REG_MAP[parts[0]];
      if (r === undefined) throw new Error(`Invalid register '${parts[0]}' in MVI`);
      const val = parseNumber(parts[1]);
      if (val === null || val < -128 || val > 255) {
        throw new Error(`MVI immediate value must be an 8-bit byte. Got '${parts[1]}'`);
      }
      return [0x06 | (r << 3), val & 0xFF];
    }

    case "ADD": return compileRegisterOp(0x80, operand);
    case "ADC": return compileRegisterOp(0x88, operand);
    case "SUB": return compileRegisterOp(0x90, operand);
    case "SBB": return compileRegisterOp(0x98, operand);
    case "ANA": return compileRegisterOp(0xA0, operand);
    case "XRA": return compileRegisterOp(0xA8, operand);
    case "ORA": return compileRegisterOp(0xB0, operand);
    case "CMP": return compileRegisterOp(0xB8, operand);

    case "ADI": return compileImmediateOp(0xC6, operand);
    case "ACI": return compileImmediateOp(0xCE, operand);
    case "SUI": return compileImmediateOp(0xD6, operand);
    case "SBI": return compileImmediateOp(0xDE, operand);
    case "ANI": return compileImmediateOp(0xE6, operand);
    case "XRI": return compileImmediateOp(0xEE, operand);
    case "ORI": return compileImmediateOp(0xF6, operand);
    case "CPI": return compileImmediateOp(0xFE, operand);

    case "INR": {
      const r = REG_MAP[operand.toUpperCase()];
      if (r === undefined) throw new Error(`Invalid register '${operand}' in INR`);
      return [0x04 | (r << 3)];
    }
    case "DCR": {
      const r = REG_MAP[operand.toUpperCase()];
      if (r === undefined) throw new Error(`Invalid register '${operand}' in DCR`);
      return [0x05 | (r << 3)];
    }

    case "LXI": {
      const parts = operand.split(",").map(s => s.trim());
      if (parts.length !== 2) throw new Error("LXI requires a register pair and a 16-bit address/data value, e.g., LXI H,2050H");
      const rp = RP_MAP[parts[0]];
      if (rp === undefined) throw new Error(`Invalid register pair '${parts[0]}' in LXI`);
      const val = resolveAddress(parts[1], symbols);
      return [0x01 | (rp << 4), val & 0xFF, (val >> 8) & 0xFF];
    }

    case "INX": {
      const rp = RP_MAP[operand.toUpperCase()];
      if (rp === undefined) throw new Error(`Invalid register pair '${operand}' in INX`);
      return [0x03 | (rp << 4)];
    }
    case "DCX": {
      const rp = RP_MAP[operand.toUpperCase()];
      if (rp === undefined) throw new Error(`Invalid register pair '${operand}' in DCX`);
      return [0x0B | (rp << 4)];
    }
    case "DAD": {
      const rp = RP_MAP[operand.toUpperCase()];
      if (rp === undefined) throw new Error(`Invalid register pair '${operand}' in DAD`);
      return [0x09 | (rp << 4)];
    }

    case "PUSH": {
      const rp = RP_MAP[operand.toUpperCase()];
      if (rp === undefined) throw new Error(`Invalid register pair '${operand}' in PUSH`);
      return [0xC5 | (rp << 4)];
    }
    case "POP": {
      const rp = RP_MAP[operand.toUpperCase()];
      if (rp === undefined) throw new Error(`Invalid register pair '${operand}' in POP`);
      return [0xC1 | (rp << 4)];
    }

    case "STAX": {
      const rpName = operand.toUpperCase();
      if (rpName === "B" || rpName === "BC") return [0x02];
      if (rpName === "D" || rpName === "DE") return [0x12];
      throw new Error(`STAX can only use register pair B or D, got '${operand}'`);
    }
    case "LDAX": {
      const rpName = operand.toUpperCase();
      if (rpName === "B" || rpName === "BC") return [0x0A];
      if (rpName === "D" || rpName === "DE") return [0x1A];
      throw new Error(`LDAX can only use register pair B or D, got '${operand}'`);
    }

    case "LDA": return compileAddressOp(0x3A, operand, symbols);
    case "STA": return compileAddressOp(0x32, operand, symbols);
    case "LHLD": return compileAddressOp(0x2A, operand, symbols);
    case "SHLD": return compileAddressOp(0x22, operand, symbols);

    case "JMP": return compileAddressOp(0xC3, operand, symbols);
    case "CALL": return compileAddressOp(0xCD, operand, symbols);
    case "RET": return [0xC9];

    // Conditional Branches
    case "JC": return compileAddressOp(0xC2 | (CC_MAP.C << 3), operand, symbols);
    case "JNC": return compileAddressOp(0xC2 | (CC_MAP.NC << 3), operand, symbols);
    case "JZ": return compileAddressOp(0xC2 | (CC_MAP.Z << 3), operand, symbols);
    case "JNZ": return compileAddressOp(0xC2 | (CC_MAP.NZ << 3), operand, symbols);
    case "JP": return compileAddressOp(0xC2 | (CC_MAP.P << 3), operand, symbols);
    case "JM": return compileAddressOp(0xC2 | (CC_MAP.M << 3), operand, symbols);
    case "JPE": return compileAddressOp(0xC2 | (CC_MAP.PE << 3), operand, symbols);
    case "JPO": return compileAddressOp(0xC2 | (CC_MAP.PO << 3), operand, symbols);

    case "CC": return compileAddressOp(0xC4 | (CC_MAP.C << 3), operand, symbols);
    case "CNC": return compileAddressOp(0xC4 | (CC_MAP.NC << 3), operand, symbols);
    case "CZ": return compileAddressOp(0xC4 | (CC_MAP.Z << 3), operand, symbols);
    case "CNZ": return compileAddressOp(0xC4 | (CC_MAP.NZ << 3), operand, symbols);
    case "CP": return compileAddressOp(0xC4 | (CC_MAP.P << 3), operand, symbols);
    case "CM": return compileAddressOp(0xC4 | (CC_MAP.M << 3), operand, symbols);
    case "CPE": return compileAddressOp(0xC4 | (CC_MAP.PE << 3), operand, symbols);
    case "CPO": return compileAddressOp(0xC4 | (CC_MAP.PO << 3), operand, symbols);

    case "RC": return [0xC0 | (CC_MAP.C << 3)];
    case "RNC": return [0xC0 | (CC_MAP.NC << 3)];
    case "RZ": return [0xC0 | (CC_MAP.Z << 3)];
    case "RNZ": return [0xC0 | (CC_MAP.NZ << 3)];
    case "RP": return [0xC0 | (CC_MAP.P << 3)];
    case "RM": return [0xC0 | (CC_MAP.M << 3)];
    case "RPE": return [0xC0 | (CC_MAP.PE << 3)];
    case "RPO": return [0xC0 | (CC_MAP.PO << 3)];

    case "IN": {
      const val = parseNumber(operand);
      if (val === null || val < 0 || val > 255) {
        throw new Error(`IN port must be an 8-bit number (0-255). Got '${operand}'`);
      }
      return [0xDB, val];
    }
    case "OUT": {
      const val = parseNumber(operand);
      if (val === null || val < 0 || val > 255) {
        throw new Error(`OUT port must be an 8-bit number (0-255). Got '${operand}'`);
      }
      return [0xD3, val];
    }

    case "RST": {
      const val = parseNumber(operand);
      if (val === null || val < 0 || val > 7) {
        throw new Error(`RST vector number must be between 0 and 7. Got '${operand}'`);
      }
      return [0xC7 | (val << 3)];
    }

    default:
      throw new Error(`Unknown mnemonic: '${mnemonic}'`);
  }
}

// Help compile register-only ALU ops, e.g. "ADD B"
function compileRegisterOp(baseOp: number, operand: string): number[] {
  const r = REG_MAP[operand.toUpperCase()];
  if (r === undefined) throw new Error(`Invalid register '${operand}'`);
  return [baseOp | r];
}

// Help compile immediate 8-bit ALU ops, e.g. "ADI 05H"
function compileImmediateOp(op: number, operand: string): number[] {
  const val = parseNumber(operand);
  if (val === null || val < -128 || val > 255) {
    throw new Error(`Immediate value must be an 8-bit byte (0-255). Got '${operand}'`);
  }
  return [op, val & 0xFF];
}

// Help compile 16-bit address direct ops, e.g. "STA 2050H"
function compileAddressOp(
  op: number,
  operand: string,
  symbols: Record<string, number>
): number[] {
  const addr = resolveAddress(operand, symbols);
  return [op, addr & 0xFF, (addr >> 8) & 0xFFFF];
}

// Resolve an operand to a 16-bit address, supporting labels
function resolveAddress(
  operand: string,
  symbols: Record<string, number>
): number {
  const clean = operand.trim();
  // Check if it's a label
  if (symbols[clean] !== undefined) {
    return symbols[clean];
  }
  
  // Try to parse as number
  const parsed = parseNumber(clean);
  if (parsed === null || parsed < 0 || parsed > 65535) {
    throw new Error(`Unresolved label or invalid 16-bit address: '${operand}'`);
  }
  return parsed;
}

// --- Helper to get clock cycles ---
function getInstructionCycles(mnemonic: string, operand: string): number {
  switch (mnemonic) {
    case "NOP": return 4;
    case "HLT": return 5;
    case "XCHG": return 4;
    case "XTHL": return 16;
    case "SPHL": return 6;
    case "PCHL": return 6;
    case "RLC": return 4;
    case "RRC": return 4;
    case "RAL": return 4;
    case "RAR": return 4;
    case "CMA": return 4;
    case "DAA": return 4;
    case "STC": return 4;
    case "CMC": return 4;
    case "EI": return 4;
    case "DI": return 4;
    case "RIM": return 4;
    case "SIM": return 4;

    case "MOV": {
      const parts = operand.split(",");
      if (parts.length === 2 && (parts[0].trim().toUpperCase() === "M" || parts[1].trim().toUpperCase() === "M")) {
        return 7;
      }
      return 4;
    }
    case "MVI": {
      const parts = operand.split(",");
      if (parts.length > 0 && parts[0].trim().toUpperCase() === "M") return 10;
      return 7;
    }

    case "ADD":
    case "ADC":
    case "SUB":
    case "SBB":
    case "ANA":
    case "XRA":
    case "ORA":
    case "CMP":
      return operand.trim().toUpperCase() === "M" ? 7 : 4;

    case "ADI":
    case "ACI":
    case "SUI":
    case "SBI":
    case "ANI":
    case "XRI":
    case "ORI":
    case "CPI":
      return 7;

    case "INR":
    case "DCR":
      return operand.trim().toUpperCase() === "M" ? 10 : 4;

    case "LXI": return 10;
    case "INX":
    case "DCX":
      return 6;
    case "DAD": return 10;

    case "PUSH": return 12;
    case "POP": return 10;

    case "STAX":
    case "LDAX":
      return 7;

    case "LDA":
    case "STA":
      return 13;
    case "LHLD":
    case "SHLD":
      return 16;

    case "JMP": return 10;
    case "CALL": return 18;
    case "RET": return 10;

    // Conditionals: we'll return average / max timing or standard condition timing
    case "JC":
    case "JNC":
    case "JZ":
    case "JNZ":
    case "JP":
    case "JM":
    case "JPE":
    case "JPO":
      return 10; // 7 if not taken, 10 if taken in 8085

    case "CC":
    case "CNC":
    case "CZ":
    case "CNZ":
    case "CP":
    case "CM":
    case "CPE":
    case "CPO":
      return 18; // 9 if not taken, 18 if taken

    case "RC":
    case "RNC":
    case "RZ":
    case "RNZ":
    case "RM":
    case "RP":
    case "RPE":
    case "RPO":
      return 11; // 6 if not taken, 11 if taken

    case "IN":
    case "OUT":
      return 10;

    case "RST": return 12;

    default: return 4;
  }
}
