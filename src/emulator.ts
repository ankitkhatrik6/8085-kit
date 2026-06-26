/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CpuState, InstructionLog } from "./types";

export class Intel8085 {
  public memory: Uint8Array;
  public ports: Uint8Array;
  public state: CpuState;
  public cycleCount: number = 0;
  public breakpoints: Set<number> = new Set();
  public history: InstructionLog[] = [];

  constructor() {
    this.memory = new Uint8Array(65536);
    this.ports = new Uint8Array(256);
    this.state = this.getInitialState();
    this.reset();
  }

  private getInitialState(): CpuState {
    return {
      a: 0,
      b: 0,
      c: 0,
      d: 0,
      e: 0,
      h: 0,
      l: 0,
      pc: 0x2000, // Trainer RAM starts at 2000H
      sp: 0xF000, // Stack pointer usually initialized to F000H
      f: {
        s: false,
        z: true,
        ac: false,
        p: false,
        cy: false,
      },
      halted: false,
      running: false,
    };
  }

  public reset(): void {
    this.state.a = 0;
    this.state.b = 0;
    this.state.c = 0;
    this.state.d = 0;
    this.state.e = 0;
    this.state.h = 0;
    this.state.l = 0;
    this.state.pc = 0x2000;
    this.state.sp = 0xF000;
    this.state.f = {
      s: false,
      z: true,
      ac: false,
      p: false,
      cy: false,
    };
    this.state.halted = false;
    this.state.running = false;
    this.cycleCount = 0;
    this.history = [];
  }

  // --- Read/Write Memory with Bounds Check ---
  public readMem(addr: number): number {
    return this.memory[addr & 0xFFFF];
  }

  public writeMem(addr: number, val: number): void {
    this.memory[addr & 0xFFFF] = val & 0xFF;
  }

  public readMem16(addr: number): number {
    const low = this.readMem(addr);
    const high = this.readMem(addr + 1);
    return (high << 8) | low;
  }

  public writeMem16(addr: number, val: number): void {
    this.writeMem(addr, val & 0xFF);
    this.writeMem(addr + 1, (val >> 8) & 0xFF);
  }

  // --- Stack operations ---
  public push16(val: number): void {
    this.state.sp = (this.state.sp - 2) & 0xFFFF;
    this.writeMem16(this.state.sp, val);
  }

  public pop16(): number {
    const val = this.readMem16(this.state.sp);
    this.state.sp = (this.state.sp + 2) & 0xFFFF;
    return val;
  }

  // --- Helper to get/set register pairs ---
  public getBC(): number { return (this.state.b << 8) | this.state.c; }
  public getDE(): number { return (this.state.d << 8) | this.state.e; }
  public getHL(): number { return (this.state.h << 8) | this.state.l; }

  public setBC(val: number): void {
    this.state.b = (val >> 8) & 0xFF;
    this.state.c = val & 0xFF;
  }
  public setDE(val: number): void {
    this.state.d = (val >> 8) & 0xFF;
    this.state.e = val & 0xFF;
  }
  public setHL(val: number): void {
    this.state.h = (val >> 8) & 0xFF;
    this.state.l = val & 0xFF;
  }

  // Pack flags into the F register byte
  public getFByte(): number {
    let f = 0x02; // Bit 1 is always 1 on 8085
    if (this.state.f.s) f |= 0x80;
    if (this.state.f.z) f |= 0x40;
    if (this.state.f.ac) f |= 0x10;
    if (this.state.f.p) f |= 0x04;
    if (this.state.f.cy) f |= 0x01;
    return f;
  }

  // Unpack F register byte into flags
  public setFByte(val: number): void {
    this.state.f.s = (val & 0x80) !== 0;
    this.state.f.z = (val & 0x40) !== 0;
    this.state.f.ac = (val & 0x10) !== 0;
    this.state.f.p = (val & 0x04) !== 0;
    this.state.f.cy = (val & 0x01) !== 0;
  }

  public getPSW(): number {
    return (this.state.a << 8) | this.getFByte();
  }

  public setPSW(val: number): void {
    this.state.a = (val >> 8) & 0xFF;
    this.setFByte(val & 0xFF);
  }

  // --- Flag calculation helpers ---
  private checkZ(val: number): boolean {
    return (val & 0xFF) === 0;
  }

  private checkS(val: number): boolean {
    return (val & 0x80) !== 0;
  }

  private checkP(val: number): boolean {
    // Parity: true if even number of 1s
    let count = 0;
    let temp = val & 0xFF;
    while (temp > 0) {
      if ((temp & 1) === 1) count++;
      temp >>= 1;
    }
    return count % 2 === 0;
  }

  // Update Sign, Zero, Parity flags based on 8-bit result
  private updateSZP(val: number): void {
    const clean = val & 0xFF;
    this.state.f.z = this.checkZ(clean);
    this.state.f.s = this.checkS(clean);
    this.state.f.p = this.checkP(clean);
  }

  // --- ALU operations ---
  public add8(val1: number, val2: number, carry: number = 0): number {
    const v1 = val1 & 0xFF;
    const v2 = val2 & 0xFF;
    const c = carry & 1;
    const result = v1 + v2 + c;
    
    // Aux Carry: carry from bit 3 to bit 4
    this.state.f.ac = ((v1 & 0x0F) + (v2 & 0x0F) + c) > 0x0F;
    this.state.f.cy = result > 0xFF;
    
    const r8 = result & 0xFF;
    this.updateSZP(r8);
    return r8;
  }

  public sub8(val1: number, val2: number, borrow: number = 0): number {
    const v1 = val1 & 0xFF;
    const v2 = val2 & 0xFF;
    const b = borrow & 1;
    const result = v1 - v2 - b;

    // Aux Carry in borrow: borrow from bit 4
    this.state.f.ac = ((v1 & 0x0F) - (v2 & 0x0F) - b) < 0;
    this.state.f.cy = result < 0;

    const r8 = result & 0xFF;
    this.updateSZP(r8);
    return r8;
  }

  public inr8(val: number): number {
    const v = val & 0xFF;
    const result = v + 1;
    this.state.f.ac = (v & 0x0F) === 0x0F;
    // Note: INR does NOT affect carry flag!
    const r8 = result & 0xFF;
    this.updateSZP(r8);
    return r8;
  }

  public dcr8(val: number): number {
    const v = val & 0xFF;
    const result = v - 1;
    this.state.f.ac = (v & 0x0F) === 0x00;
    // Note: DCR does NOT affect carry flag!
    const r8 = result & 0xFF;
    this.updateSZP(r8);
    return r8;
  }

  public ana8(val: number): void {
    // 8085 ANA sets AC always, clears CY
    this.state.a = (this.state.a & val) & 0xFF;
    this.state.f.cy = false;
    this.state.f.ac = true; // 8085 ANA sets AC to 1
    this.updateSZP(this.state.a);
  }

  public xra8(val: number): void {
    // XRA clears CY and AC
    this.state.a = (this.state.a ^ val) & 0xFF;
    this.state.f.cy = false;
    this.state.f.ac = false;
    this.updateSZP(this.state.a);
  }

  public ora8(val: number): void {
    // ORA clears CY and AC
    this.state.a = (this.state.a | val) & 0xFF;
    this.state.f.cy = false;
    this.state.f.ac = false;
    this.updateSZP(this.state.a);
  }

  public cmp8(val: number): void {
    // CMP does internal SUB. Sets flags, does not modify A.
    this.sub8(this.state.a, val);
  }

  // --- Get / Set Register by internal index ---
  private getReg(idx: number): number {
    switch (idx) {
      case 0: return this.state.b;
      case 1: return this.state.c;
      case 2: return this.state.d;
      case 3: return this.state.e;
      case 4: return this.state.h;
      case 5: return this.state.l;
      case 6: return this.readMem(this.getHL()); // Memory reference M
      case 7: return this.state.a;
      default: return 0;
    }
  }

  private setReg(idx: number, val: number): void {
    const clean = val & 0xFF;
    switch (idx) {
      case 0: this.state.b = clean; break;
      case 1: this.state.c = clean; break;
      case 2: this.state.d = clean; break;
      case 3: this.state.e = clean; break;
      case 4: this.state.h = clean; break;
      case 5: this.state.l = clean; break;
      case 6: this.writeMem(this.getHL(), clean); break; // Memory reference M
      case 7: this.state.a = clean; break;
    }
  }

  private getRegName(idx: number): string {
    const names = ["B", "C", "D", "E", "H", "L", "M", "A"];
    return names[idx] || "?";
  }

  // --- STEP ONE INSTRUCTION ---
  public step(): { cycles: number; mnemonic: string; pc: number } {
    if (this.state.halted) {
      return { cycles: 0, mnemonic: "HLT (Halted)", pc: this.state.pc };
    }

    const startPC = this.state.pc;
    const opcode = this.readMem(startPC);
    this.state.pc = (this.state.pc + 1) & 0xFFFF;

    let cycles = 4; // Default timing
    let mnemonic = "NOP";
    let bytesUsed: string[] = [opcode.toString(16).toUpperCase().padStart(2, "0")];

    // Decode instruction
    // 8085 instructions are beautifully grouped in bit categories
    // x = bit 7-6, y = bit 5-3, z = bit 2-0

    const x = (opcode >> 6) & 3;
    const y = (opcode >> 3) & 7;
    const z = opcode & 7;

    if (x === 0) {
      if (z === 0) {
        // NOP or Jumps / Relative or special
        if (y === 0) {
          mnemonic = "NOP";
          cycles = 4;
        } else if (y === 1) {
          // JN or similar (8085 does not have official Relative jump, but has RST/NOP)
          mnemonic = "NOP (Undocumented)";
          cycles = 4;
        } else if (y === 2) {
          // RIM (Read Interrupt Mask)
          mnemonic = "RIM";
          cycles = 4;
          // Return simulated interrupt mask: SID=0, I7.5=0, I6.5=0, I5.5=0, IE=0
          this.state.a = 0; 
        } else if (y === 3) {
          // SIM (Set Interrupt Mask)
          mnemonic = "SIM";
          cycles = 4;
          // Simulated SIM
        } else {
          mnemonic = "NOP";
          cycles = 4;
        }
      } else if (z === 1) {
        // LXI rp, d16
        const rp = (y >> 1) & 3;
        const val16 = this.readMem16(this.state.pc);
        this.state.pc = (this.state.pc + 2) & 0xFFFF;
        bytesUsed.push(this.readMem(startPC + 1).toString(16).toUpperCase().padStart(2, "0"));
        bytesUsed.push(this.readMem(startPC + 2).toString(16).toUpperCase().padStart(2, "0"));
        
        cycles = 10;
        const hexStr = val16.toString(16).toUpperCase().padStart(4, "0") + "H";
        if (rp === 0) { this.setBC(val16); mnemonic = `LXI B,${hexStr}`; }
        else if (rp === 1) { this.setDE(val16); mnemonic = `LXI D,${hexStr}`; }
        else if (rp === 2) { this.setHL(val16); mnemonic = `LXI H,${hexStr}`; }
        else { this.state.sp = val16; mnemonic = `LXI SP,${hexStr}`; }
      } else if (z === 2) {
        // Indirect addressing STAX / LDAX / SHLD / LHLD / STA / LDA
        const rp = (y >> 1) & 3;
        if ((y & 1) === 0) {
          // STAX or SHLD or STA
          if (rp === 0) {
            this.writeMem(this.getBC(), this.state.a);
            mnemonic = "STAX B";
            cycles = 7;
          } else if (rp === 1) {
            this.writeMem(this.getDE(), this.state.a);
            mnemonic = "STAX D";
            cycles = 7;
          } else if (rp === 2) {
            const addr = this.readMem16(this.state.pc);
            this.state.pc = (this.state.pc + 2) & 0xFFFF;
            bytesUsed.push(this.readMem(startPC + 1).toString(16).toUpperCase().padStart(2, "0"));
            bytesUsed.push(this.readMem(startPC + 2).toString(16).toUpperCase().padStart(2, "0"));
            this.writeMem16(addr, this.getHL());
            mnemonic = `SHLD ${addr.toString(16).toUpperCase().padStart(4, "0")}H`;
            cycles = 16;
          } else {
            const addr = this.readMem16(this.state.pc);
            this.state.pc = (this.state.pc + 2) & 0xFFFF;
            bytesUsed.push(this.readMem(startPC + 1).toString(16).toUpperCase().padStart(2, "0"));
            bytesUsed.push(this.readMem(startPC + 2).toString(16).toUpperCase().padStart(2, "0"));
            this.writeMem(addr, this.state.a);
            mnemonic = `STA ${addr.toString(16).toUpperCase().padStart(4, "0")}H`;
            cycles = 13;
          }
        } else {
          // LDAX or LHLD or LDA
          if (rp === 0) {
            this.state.a = this.readMem(this.getBC());
            mnemonic = "LDAX B";
            cycles = 7;
          } else if (rp === 1) {
            this.state.a = this.readMem(this.getDE());
            mnemonic = "LDAX D";
            cycles = 7;
          } else if (rp === 2) {
            const addr = this.readMem16(this.state.pc);
            this.state.pc = (this.state.pc + 2) & 0xFFFF;
            bytesUsed.push(this.readMem(startPC + 1).toString(16).toUpperCase().padStart(2, "0"));
            bytesUsed.push(this.readMem(startPC + 2).toString(16).toUpperCase().padStart(2, "0"));
            this.setHL(this.readMem16(addr));
            mnemonic = `LHLD ${addr.toString(16).toUpperCase().padStart(4, "0")}H`;
            cycles = 16;
          } else {
            const addr = this.readMem16(this.state.pc);
            this.state.pc = (this.state.pc + 2) & 0xFFFF;
            bytesUsed.push(this.readMem(startPC + 1).toString(16).toUpperCase().padStart(2, "0"));
            bytesUsed.push(this.readMem(startPC + 2).toString(16).toUpperCase().padStart(2, "0"));
            this.state.a = this.readMem(addr);
            mnemonic = `LDA ${addr.toString(16).toUpperCase().padStart(4, "0")}H`;
            cycles = 13;
          }
        }
      } else if (z === 3) {
        // INX / DCX
        const rp = (y >> 1) & 3;
        cycles = 6;
        if ((y & 1) === 0) {
          // INX
          if (rp === 0) { this.setBC((this.getBC() + 1) & 0xFFFF); mnemonic = "INX B"; }
          else if (rp === 1) { this.setDE((this.getDE() + 1) & 0xFFFF); mnemonic = "INX D"; }
          else if (rp === 2) { this.setHL((this.getHL() + 1) & 0xFFFF); mnemonic = "INX H"; }
          else { this.state.sp = (this.state.sp + 1) & 0xFFFF; mnemonic = "INX SP"; }
        } else {
          // DCX
          if (rp === 0) { this.setBC((this.getBC() - 1) & 0xFFFF); mnemonic = "DCX B"; }
          else if (rp === 1) { this.setDE((this.getDE() - 1) & 0xFFFF); mnemonic = "DCX D"; }
          else if (rp === 2) { this.setHL((this.getHL() - 1) & 0xFFFF); mnemonic = "DCX H"; }
          else { this.state.sp = (this.state.sp - 1) & 0xFFFF; mnemonic = "DCX SP"; }
        }
      } else if (z === 4) {
        // INR r
        cycles = y === 6 ? 10 : 4;
        const val = this.getReg(y);
        const res = this.inr8(val);
        this.setReg(y, res);
        mnemonic = `INR ${this.getRegName(y)}`;
      } else if (z === 5) {
        // DCR r
        cycles = y === 6 ? 10 : 4;
        const val = this.getReg(y);
        const res = this.dcr8(val);
        this.setReg(y, res);
        mnemonic = `DCR ${this.getRegName(y)}`;
      } else if (z === 6) {
        // MVI r, d8
        cycles = y === 6 ? 10 : 7;
        const d8 = this.readMem(this.state.pc);
        this.state.pc = (this.state.pc + 1) & 0xFFFF;
        bytesUsed.push(d8.toString(16).toUpperCase().padStart(2, "0"));
        this.setReg(y, d8);
        mnemonic = `MVI ${this.getRegName(y)},${d8.toString(16).toUpperCase().padStart(2, "0")}H`;
      } else if (z === 7) {
        // Rotates and decimal adjustments
        cycles = 4;
        if (y === 0) {
          // RLC
          const bit7 = (this.state.a >> 7) & 1;
          this.state.a = ((this.state.a << 1) | bit7) & 0xFF;
          this.state.f.cy = bit7 === 1;
          mnemonic = "RLC";
        } else if (y === 1) {
          // RRC
          const bit0 = this.state.a & 1;
          this.state.a = ((this.state.a >> 1) | (bit0 << 7)) & 0xFF;
          this.state.f.cy = bit0 === 1;
          mnemonic = "RRC";
        } else if (y === 2) {
          // RAL
          const oldCy = this.state.f.cy ? 1 : 0;
          const bit7 = (this.state.a >> 7) & 1;
          this.state.a = ((this.state.a << 1) | oldCy) & 0xFF;
          this.state.f.cy = bit7 === 1;
          mnemonic = "RAL";
        } else if (y === 3) {
          // RAR
          const oldCy = this.state.f.cy ? 1 : 0;
          const bit0 = this.state.a & 1;
          this.state.a = ((this.state.a >> 1) | (oldCy << 7)) & 0xFF;
          this.state.f.cy = bit0 === 1;
          mnemonic = "RAR";
        } else if (y === 4) {
          // DAA (Decimal Adjust Accumulator)
          // Adjust A to BCD representation
          let val = this.state.a;
          let carry = false;
          if ((val & 0x0F) > 9 || this.state.f.ac) {
            val += 6;
            this.state.f.ac = true;
          } else {
            this.state.f.ac = false;
          }
          if ((val > 0x9F) || this.state.f.cy) {
            val += 0x60;
            carry = true;
          }
          this.state.a = val & 0xFF;
          this.state.f.cy = carry || this.state.f.cy;
          this.updateSZP(this.state.a);
          mnemonic = "DAA";
        } else if (y === 5) {
          // CMA (Complement Accumulator)
          this.state.a = (~this.state.a) & 0xFF;
          mnemonic = "CMA";
        } else if (y === 6) {
          // STC (Set Carry)
          this.state.f.cy = true;
          mnemonic = "STC";
        } else if (y === 7) {
          // CMC (Complement Carry)
          this.state.f.cy = !this.state.f.cy;
          mnemonic = "CMC";
        }
      }
    } else if (x === 1) {
      // MOV or HLT
      if (y === 6 && z === 6) {
        // HLT
        this.state.halted = true;
        this.state.running = false;
        mnemonic = "HLT";
        cycles = 5;
      } else {
        // MOV r1, r2
        const srcVal = this.getReg(z);
        this.setReg(y, srcVal);
        mnemonic = `MOV ${this.getRegName(y)},${this.getRegName(z)}`;
        cycles = (y === 6 || z === 6) ? 7 : 4;
      }
    } else if (x === 2) {
      // ALU operations (ADD, ADC, SUB, SBB, ANA, XRA, ORA, CMP)
      const val = this.getReg(z);
      cycles = z === 6 ? 7 : 4;
      const rName = this.getRegName(z);

      switch (y) {
        case 0: // ADD
          this.state.a = this.add8(this.state.a, val);
          mnemonic = `ADD ${rName}`;
          break;
        case 1: // ADC
          this.state.a = this.add8(this.state.a, val, this.state.f.cy ? 1 : 0);
          mnemonic = `ADC ${rName}`;
          break;
        case 2: // SUB
          this.state.a = this.sub8(this.state.a, val);
          mnemonic = `SUB ${rName}`;
          break;
        case 3: // SBB
          this.state.a = this.sub8(this.state.a, val, this.state.f.cy ? 1 : 0);
          mnemonic = `SBB ${rName}`;
          break;
        case 4: // ANA
          this.ana8(val);
          mnemonic = `ANA ${rName}`;
          break;
        case 5: // XRA
          this.xra8(val);
          mnemonic = `XRA ${rName}`;
          break;
        case 6: // ORA
          this.ora8(val);
          mnemonic = `ORA ${rName}`;
          break;
        case 7: // CMP
          this.cmp8(val);
          mnemonic = `CMP ${rName}`;
          break;
      }
    } else if (x === 3) {
      // Jumps, Calls, Stack, I/O
      if (z === 0) {
        // Conditional Returns: RNZ, RZ, RNC, RC, RPO, RPE, RP, RM
        cycles = 6; // If condition is false; 11 if true
        const cond = this.checkCondition(y);
        mnemonic = `R${this.getCondName(y)}`;
        if (cond) {
          this.state.pc = this.pop16();
          cycles = 11;
        }
      } else if (z === 1) {
        // POP rp or special (RET, PCHL, SPHL)
        const rp = (y >> 1) & 3;
        if ((y & 1) === 0) {
          // POP rp
          cycles = 10;
          if (rp === 0) { this.setBC(this.pop16()); mnemonic = "POP B"; }
          else if (rp === 1) { this.setDE(this.pop16()); mnemonic = "POP D"; }
          else if (rp === 2) { this.setHL(this.pop16()); mnemonic = "POP H"; }
          else { this.setPSW(this.pop16()); mnemonic = "POP PSW"; }
        } else {
          // Special ones
          if (y === 1) {
            // RET
            this.state.pc = this.pop16();
            mnemonic = "RET";
            cycles = 10;
          } else if (y === 5) {
            // PCHL
            this.state.pc = this.getHL();
            mnemonic = "PCHL";
            cycles = 6;
          } else if (y === 7) {
            // SPHL
            this.state.sp = this.getHL();
            mnemonic = "SPHL";
            cycles = 6;
          } else {
            mnemonic = "NOP";
          }
        }
      } else if (z === 2) {
        // Conditional Jumps: JNZ, JZ, JNC, JC, JPO, JPE, JP, JM
        const addr = this.readMem16(this.state.pc);
        this.state.pc = (this.state.pc + 2) & 0xFFFF;
        bytesUsed.push(this.readMem(startPC + 1).toString(16).toUpperCase().padStart(2, "0"));
        bytesUsed.push(this.readMem(startPC + 2).toString(16).toUpperCase().padStart(2, "0"));
        
        cycles = 10;
        const cond = this.checkCondition(y);
        mnemonic = `J${this.getCondName(y)} ${addr.toString(16).toUpperCase().padStart(4, "0")}H`;
        if (cond) {
          this.state.pc = addr;
        }
      } else if (z === 3) {
        // Unconditional JMP, OUT, IN, XTHL, DI, EI, etc.
        if (y === 0) {
          // JMP
          const addr = this.readMem16(this.state.pc);
          this.state.pc = addr;
          bytesUsed.push(this.readMem(startPC + 1).toString(16).toUpperCase().padStart(2, "0"));
          bytesUsed.push(this.readMem(startPC + 2).toString(16).toUpperCase().padStart(2, "0"));
          mnemonic = `JMP ${addr.toString(16).toUpperCase().padStart(4, "0")}H`;
          cycles = 10;
        } else if (y === 2) {
          // OUT port
          const port = this.readMem(this.state.pc);
          this.state.pc = (this.state.pc + 1) & 0xFFFF;
          bytesUsed.push(port.toString(16).toUpperCase().padStart(2, "0"));
          this.ports[port] = this.state.a;
          mnemonic = `OUT ${port.toString(16).toUpperCase().padStart(2, "0")}H`;
          cycles = 10;
        } else if (y === 3) {
          // IN port
          const port = this.readMem(this.state.pc);
          this.state.pc = (this.state.pc + 1) & 0xFFFF;
          bytesUsed.push(port.toString(16).toUpperCase().padStart(2, "0"));
          this.state.a = this.ports[port];
          mnemonic = `IN ${port.toString(16).toUpperCase().padStart(2, "0")}H`;
          cycles = 10;
        } else if (y === 4) {
          // XTHL (Exchange top of stack with H-L)
          const temp = this.readMem16(this.state.sp);
          this.writeMem16(this.state.sp, this.getHL());
          this.setHL(temp);
          mnemonic = "XTHL";
          cycles = 16;
        } else if (y === 5) {
          // XCHG (Exchange D-E with H-L)
          const temp = this.getDE();
          this.setDE(this.getHL());
          this.setHL(temp);
          mnemonic = "XCHG";
          cycles = 4;
        } else if (y === 6) {
          // DI (Disable Interrupts)
          mnemonic = "DI";
          cycles = 4;
        } else if (y === 7) {
          // EI (Enable Interrupts)
          mnemonic = "EI";
          cycles = 4;
        }
      } else if (z === 4) {
        // Conditional Calls: CNZ, CZ, CNC, CC, CPO, CPE, CP, CM
        const addr = this.readMem16(this.state.pc);
        this.state.pc = (this.state.pc + 2) & 0xFFFF;
        bytesUsed.push(this.readMem(startPC + 1).toString(16).toUpperCase().padStart(2, "0"));
        bytesUsed.push(this.readMem(startPC + 2).toString(16).toUpperCase().padStart(2, "0"));
        
        cycles = 9; // 18 if taken
        const cond = this.checkCondition(y);
        mnemonic = `C${this.getCondName(y)} ${addr.toString(16).toUpperCase().padStart(4, "0")}H`;
        if (cond) {
          this.push16(this.state.pc);
          this.state.pc = addr;
          cycles = 18;
        }
      } else if (z === 5) {
        // PUSH rp or Unconditional CALL
        const rp = (y >> 1) & 3;
        if ((y & 1) === 0) {
          // PUSH rp
          cycles = 12;
          if (rp === 0) { this.push16(this.getBC()); mnemonic = "PUSH B"; }
          else if (rp === 1) { this.push16(this.getDE()); mnemonic = "PUSH D"; }
          else if (rp === 2) { this.push16(this.getHL()); mnemonic = "PUSH H"; }
          else { this.push16(this.getPSW()); mnemonic = "PUSH PSW"; }
        } else {
          // Unconditional CALL
          const addr = this.readMem16(this.state.pc);
          this.state.pc = (this.state.pc + 2) & 0xFFFF;
          bytesUsed.push(this.readMem(startPC + 1).toString(16).toUpperCase().padStart(2, "0"));
          bytesUsed.push(this.readMem(startPC + 2).toString(16).toUpperCase().padStart(2, "0"));
          this.push16(this.state.pc);
          this.state.pc = addr;
          mnemonic = `CALL ${addr.toString(16).toUpperCase().padStart(4, "0")}H`;
          cycles = 18;
        }
      } else if (z === 6) {
        // Immediate ALU: ADI, ACI, SUI, SBI, ANI, XRI, ORI, CPI
        const d8 = this.readMem(this.state.pc);
        this.state.pc = (this.state.pc + 1) & 0xFFFF;
        bytesUsed.push(d8.toString(16).toUpperCase().padStart(2, "0"));
        cycles = 7;
        const hexStr = d8.toString(16).toUpperCase().padStart(2, "0") + "H";

        switch (y) {
          case 0: // ADI
            this.state.a = this.add8(this.state.a, d8);
            mnemonic = `ADI ${hexStr}`;
            break;
          case 1: // ACI
            this.state.a = this.add8(this.state.a, d8, this.state.f.cy ? 1 : 0);
            mnemonic = `ACI ${hexStr}`;
            break;
          case 2: // SUI
            this.state.a = this.sub8(this.state.a, d8);
            mnemonic = `SUI ${hexStr}`;
            break;
          case 3: // SBI
            this.state.a = this.sub8(this.state.a, d8, this.state.f.cy ? 1 : 0);
            mnemonic = `SBI ${hexStr}`;
            break;
          case 4: // ANI
            this.ana8(d8);
            mnemonic = `ANI ${hexStr}`;
            break;
          case 5: // XRI
            this.xra8(d8);
            mnemonic = `XRI ${hexStr}`;
            break;
          case 6: // ORI
            this.ora8(d8);
            mnemonic = `ORI ${hexStr}`;
            break;
          case 7: // CPI
            this.cmp8(d8);
            mnemonic = `CPI ${hexStr}`;
            break;
        }
      } else if (z === 7) {
        // RST n (Restart / software interrupt)
        cycles = 12;
        const n = y;
        this.push16(this.state.pc);
        this.state.pc = n * 8;
        mnemonic = `RST ${n}`;
      }
    }

    this.cycleCount += cycles;

    // Log the execution
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now.getMilliseconds().toString().padStart(3, "0")}`;
    const logItem: InstructionLog = {
      pc: startPC,
      opcode,
      mnemonic,
      bytes: bytesUsed,
      cycles,
      timestamp,
    };
    
    // Maintain a small history log of the last 150 instructions for CPU registers live telemetry
    this.history.unshift(logItem);
    if (this.history.length > 150) {
      this.history.pop();
    }

    return { cycles, mnemonic, pc: this.state.pc };
  }

  // Helper to check standard 8085 conditions
  private checkCondition(y: number): boolean {
    switch (y) {
      case 0: return !this.state.f.z;  // NZ (Not Zero)
      case 1: return this.state.f.z;   // Z (Zero)
      case 2: return !this.state.f.cy; // NC (No Carry)
      case 3: return this.state.f.cy;  // C (Carry)
      case 4: return !this.state.f.p;  // PO (Parity Odd)
      case 5: return this.state.f.p;   // PE (Parity Even)
      case 6: return !this.state.f.s;  // P (Positive)
      case 7: return this.state.f.s;   // M (Minus / Negative)
      default: return false;
    }
  }

  private getCondName(y: number): string {
    const names = ["NZ", "Z", "NC", "C", "PO", "PE", "P", "M"];
    return names[y] || "?";
  }
}
