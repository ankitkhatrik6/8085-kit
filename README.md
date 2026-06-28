# 8085 Trainer Kit Simulator

A browser-based replica of the Intel 8085 Microprocessor Trainer Kit — the same kind you'd find in a college microprocessor lab, but running entirely in your browser.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-purple?logo=vite)
![License](https://img.shields.io/badge/License-Apache%202.0-green)

## What is this?

If you've ever taken a microprocessor course, you know the drill — punching hex codes into a tiny keypad, squinting at seven-segment displays, and hoping your program doesn't overwrite itself. This project recreates that entire experience digitally.

It's not just an emulator. It's a full trainer kit simulation:

- **Keypad + 7-segment display** that behaves exactly like real hardware (RESET shows `_MP_`, you enter addresses with hex keys, write data with FILL, run programs with GO)
- **Assembly workspace** where you write, assemble, and load 8085 programs directly into memory
- **Live register view** showing A, B, C, D, E, H, L, flags, PC, SP — all updating in real-time as instructions execute
- **64KB RAM viewer** for poking around memory, editing cells, and verifying program output
- **15 lab experiments** built in, from basic addition to bubble sort and fibonacci generation

## Why?

Because physical trainer kits are expensive, fragile, and not always available when you need to practice at 2am before an exam. This gives you the same hands-on experience from anywhere.

## Tech Stack

- **React 19** + **TypeScript** — UI and type safety
- **Vite** — dev server and bundler
- **Tailwind CSS v4** — styling
- **Framer Motion** — animations
- **Lucide React** — icons

The entire 8085 CPU emulation (instruction decoding, flag handling, memory management) is written from scratch in TypeScript — no external emulator libraries.

## Getting Started

You need **Node.js v18+** installed.

```bash
# clone the repo
git clone https://github.com/ankitkhatrik6/8085-kit.git
cd 8085-trainer-kit

# install dependencies
npm install

# start dev server
npm run dev
```

Open `http://localhost:3000` and you should see the trainer kit.

## Building for Production

```bash
npm run build
```

Outputs static files to `dist/`. Drop that folder on Vercel, Netlify, GitHub Pages, or any static host — no server needed.

## Lab Experiments Included

| #  | Experiment | Difficulty |
|----|-----------|------------|
| 1  | 8-Bit Addition | Beginner |
| 2  | 1's Complement | Beginner |
| 3  | 2's Complement | Beginner |
| 4  | Greatest of Two Numbers | Beginner |
| 5  | Right Shift | Beginner |
| 6  | Left Shift | Beginner |
| 7  | 8-Bit Multiplication | Intermediate |
| 8  | 8-Bit Division | Intermediate |
| 9  | Store Numbers 1–10 | Intermediate |
| 10 | Sum of 1–10 | Intermediate |
| 11 | Even Numbers 1–20 | Intermediate |
| 12 | Fibonacci Series (10 terms) | Advanced |
| 13 | Bubble Sort (10 numbers) | Advanced |
| 14 | 16-Bit Addition | Intermediate |
| 15 | Reverse 16-Bit Number | Advanced |

Each experiment comes with setup instructions, learning objectives, and expected output so you can verify your results.

## How the Keypad Works

This mimics the real trainer kit behavior:

1. **RESET** → Display shows `_MP_` (ready state)
2. **REL/EXMEM** → Enter a 4-digit hex address → press **MEMC/NEXT** to see the data at that address
3. **FILL** → Type 2-digit hex data to write into that memory cell
4. **MEMC/NEXT** → Move to next address
5. **GO** → Enter starting address → program executes from there

Same workflow you'd follow on an actual DYNA-85 or similar kit.

## Project Structure

```
├── src/
│   ├── App.tsx              # Main layout + tab navigation
│   ├── emulator.ts          # Full 8085 CPU emulation (~27KB)
│   ├── assembler.ts         # 8085 assembler (labels, ORG, all instructions)
│   ├── opcodes_data.ts      # Complete opcode table (256 entries)
│   ├── experiments.ts       # 15 pre-loaded lab programs
│   ├── types.ts             # TypeScript interfaces
│   ├── components/
│   │   ├── TrainerKit3D.tsx  # Keypad, 7-segment display, kit logic
│   │   ├── AssemblyWorkspace.tsx
│   │   ├── RegisterDiagnostics.tsx
│   │   └── RamViewer.tsx
│   └── main.tsx
├── index.html
├── vite.config.ts
└── package.json
```

## License

Apache 2.0

---

Made by **Ankit Khatri KC**
