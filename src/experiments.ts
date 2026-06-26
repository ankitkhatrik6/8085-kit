/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Experiment } from "./types";

export const LABORATORY_EXPERIMENTS: Experiment[] = [
  {
    id: "sum_8bit_2031",
    title: "1. 8-Bit Addition (Sum in 2031H)",
    difficulty: "Beginner",
    description: "Load two 8-bit numbers from memory locations 202FH and 2030H, calculate their sum, and store the 8-bit result in memory location 2031H.",
    learningObjectives: [
      "Load values from memory locations 202FH and 2030H into Accumulator.",
      "Utilize register B to perform register-to-register addition.",
      "Store the resulting sum in the specific memory location 2031H.",
      "Observe direct addressing instructions LDA and STA in action."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Navigate to the RAM VIEWER or WORKBENCH.\n3. Scroll or set the RAM cells at 202FH and 2030H with input numbers (e.g., set 202FH = 12H, 2030H = 23H).\n4. Assemble and Load, then run the program.\n5. Verify that cell 2031H contains the sum (e.g., 35H).",
    expectedResult: "The memory location 2031H contains the sum of the numbers at 202FH and 2030H.",
    assemblyCode: `; Program to add two 8-bit numbers and store result in 2031H
ORG 2000H

LDA 202FH    ; Load first 8-bit number from 202FH into Accumulator
MOV B, A     ; Store first number in Register B
LDA 2030H    ; Load second 8-bit number from 2030H into Accumulator
ADD B        ; Add Register B to Accumulator (A = A + B)
STA 2031H    ; Store the 8-bit result in 2031H
HLT          ; Halt program execution
`
  },
  {
    id: "ones_complement_11h",
    title: "2. 1's Complement of 11H (Store in 3016H)",
    difficulty: "Beginner",
    description: "Find the 1's complement of the 8-bit number 11H and store the result in memory location 3016H.",
    learningObjectives: [
      "Load an immediate 8-bit constant (11H) using the MVI instruction.",
      "Perform logical inversion of accumulator bits using CMA.",
      "Store the 1's complement value in memory location 3016H."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Assemble and Load, then run the program.\n3. Open the RAM VIEWER and inspect memory cell 3016H.\n4. Confirm that 3016H contains the 1's complement of 11H (which is EEH).",
    expectedResult: "Memory location 3016H should contain EEH (the bitwise logical NOT of 11H).",
    assemblyCode: `; Program to find 1's complement of 11H and store in 3016H
ORG 2000H

MVI A, 11H   ; Load immediate 11H into Accumulator
CMA          ; Complement Accumulator (invert all bits)
STA 3016H    ; Store the complemented result in 3016H
HLT          ; Halt program execution
`
  },
  {
    id: "twos_complement_3000",
    title: "3. 2's Complement of 8-Bit Number (ORG 3000H)",
    difficulty: "Beginner",
    description: "Find the 2's complement of an 8-bit number loaded from 3000H, and store the result in 2035H. The program is assumed to run from address 3000H.",
    learningObjectives: [
      "Configure the program start origin (ORG 3000H).",
      "Load data from 3000H, complement it (1's complement), and add 1 (ADI 01H) to get the 2's complement.",
      "Store the final result at 2035H."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Set memory location 3000H to an input value (e.g., 05H) in the RAM VIEWER before execution.\n3. Compile and Run the program starting at address 3000H.\n4. Check memory cell 2035H for the 2's complement of the input (e.g., 2's complement of 05H is FBH).",
    expectedResult: "Memory location 2035H should contain the 2's complement of the data located at 3000H.",
    assemblyCode: `; Program to find 2's complement of an 8-bit number starting at 3000H
ORG 3000H

LDA 3000H    ; Load input 8-bit number from address 3000H
CMA          ; Invert all bits (1's complement)
ADI 01H      ; Add 01H to get the 2's complement (A = A + 1)
STA 2035H    ; Store the 2's complement result in 2035H
HLT          ; Halt program execution
`
  },
  {
    id: "greatest_number_2068",
    title: "4. Greatest of Two Numbers (Result in 2068H)",
    difficulty: "Beginner",
    description: "Compare two 8-bit numbers located at memory addresses 2066H and 2067H, and store the greater number at 2068H.",
    learningObjectives: [
      "Use the CMP instruction to compare two unsigned 8-bit numbers.",
      "Interpret the Carry (CY) flag as an indicator of unsigned relational comparison.",
      "Implement conditional branching with JNC (Jump if No Carry)."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Set memory locations 2066H and 2067H with comparison inputs (e.g., set 2066H = 4AH, 2067H = 6FH).\n3. Assemble and Run the program.\n4. Check cell 2068H to confirm that the greater number (6FH) has been successfully stored.",
    expectedResult: "Memory location 2068H contains the greater value between [2066H] and [2067H].",
    assemblyCode: `; Program to find the greatest of two numbers and store in 2068H
ORG 2000H

LDA 2066H    ; Load first number from 2066H into Accumulator
MOV B, A     ; Save first number in Register B
LDA 2067H    ; Load second number from 2067H into Accumulator
CMP B        ; Compare Accumulator (A) with B (calculates A - B without modifying A)
JNC STORE    ; If A >= B (Carry = 0), then Accumulator has the greater number, jump to STORE
MOV A, B     ; If A < B, move B (first number) into Accumulator (as it is the greatest)
STORE: STA 2068H ; Store the greatest number in 2068H
HLT          ; Halt program execution
`
  },
  {
    id: "right_shift_8bit",
    title: "5. Verify Right Shift of 8-Bit Number",
    difficulty: "Beginner",
    description: "Load an 8-bit number from 2040H, perform a right logical/circular shift of 1 bit, and store the shifted result in 2041H.",
    learningObjectives: [
      "Understand rotation instructions, specifically RRC (Rotate Right without Carry).",
      "Observe how bits shift to the right and how the LSB wraps around to the MSB position."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Write an 8-bit value at 2040H (e.g., F0H = 11110000B).\n3. Run the program.\n4. Verify that location 2041H contains 78H (01111000B), demonstrating a shift of one bit to the right.",
    expectedResult: "The content of 2041H represents the original value at 2040H shifted right by 1 bit.",
    assemblyCode: `; Program to shift an 8-bit number right by 1 bit using RRC
ORG 2000H

LDA 2040H    ; Load the 8-bit number from 2040H into Accumulator
RRC          ; Shift/Rotate Accumulator right by 1 bit (A = A >> 1, LSB goes to MSB)
STA 2041H    ; Store the shifted result in 2041H
HLT          ; Halt program execution
`
  },
  {
    id: "left_shift_8bit",
    title: "6. Verify Left Shift of 8-Bit Number",
    difficulty: "Beginner",
    description: "Load an 8-bit number from 2040H, perform a left logical/circular shift of 1 bit, and store the shifted result in 2041H.",
    learningObjectives: [
      "Understand rotation instructions, specifically RLC (Rotate Left without Carry).",
      "Observe how bits shift to the left and how the MSB wraps around to the LSB position."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Write an 8-bit value at 2040H (e.g., 0FH = 00001111B).\n3. Run the program.\n4. Verify that location 2041H contains 1EH (00011110B), demonstrating a shift of one bit to the left.",
    expectedResult: "The content of 2041H represents the original value at 2040H shifted left by 1 bit.",
    assemblyCode: `; Program to shift an 8-bit number left by 1 bit using RLC
ORG 2000H

LDA 2040H    ; Load the 8-bit number from 2040H into Accumulator
RLC          ; Shift/Rotate Accumulator left by 1 bit (A = A << 1, MSB goes to LSB)
STA 2041H    ; Store the shifted result in 2041H
HLT          ; Halt program execution
`
  },
  {
    id: "multiplication_8bit",
    title: "7. Multiplication of Two 8-Bit Numbers",
    difficulty: "Intermediate",
    description: "Multiply two unsigned 8-bit numbers loaded from 2050H and 2051H using successive addition. Store the 16-bit product in 2052H (LSB) and 2053H (MSB).",
    learningObjectives: [
      "Implement multiplication using successive addition algorithms.",
      "Handle 16-bit sum accumulations using the DAD instruction.",
      "Manage double registers for arithmetic operations."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Set memory location 2050H = 0FH (Multiplier = 15) and 2051H = 08H (Multiplicand = 8).\n3. Assemble and Run.\n4. Check memory locations 2052H (contains LSB) and 2053H (contains MSB).\n5. Confirm result: 15 * 8 = 120 (decimal 120 = 78H), so 2052H = 78H and 2053H = 00H.",
    expectedResult: "Memory locations 2052H and 2053H hold the LSB and MSB of the 16-bit multiplication product.",
    assemblyCode: `; Program to multiply two 8-bit numbers by successive addition
ORG 2000H

LDA 2050H    ; Load Multiplier from 2050H
MOV C, A     ; Store Multiplier in Register C (acts as loop down-counter)
LDA 2051H    ; Load Multiplicand from 2051H
MOV B, A     ; Store Multiplicand in Register B

LXI H, 0000H ; Initialize 16-bit accumulator HL to 0000H
MVI D, 00H   ; Clear Register D (DE will hold the 16-bit multiplicand)
MOV E, B     ; Set DE = 00[Multiplicand]

MOV A, C     ; Load counter into Accumulator to check if it's zero
CPI 00H      ; Check if multiplier is 0
JZ DONE      ; If multiplier is 0, product is 0, jump to DONE

LOOP: DAD D  ; Add register pair DE to HL (HL = HL + DE)
DCR C        ; Decrement multiplier loop counter
JNZ LOOP     ; If counter is not zero, add again

DONE: SHLD 2052H ; Store 16-bit product from HL into 2052H (LSB) and 2053H (MSB)
HLT          ; Halt program execution
`
  },
  {
    id: "division_8bit",
    title: "8. Division of Two 8-Bit Numbers",
    difficulty: "Intermediate",
    description: "Divide an 8-bit dividend at 2050H by an 8-bit divisor at 2051H using successive subtraction. Store the Quotient in 2052H and the Remainder in 2053H.",
    learningObjectives: [
      "Implement integer division through successive subtractions.",
      "Check and handle division-by-zero boundary conditions safely.",
      "Utilize comparison (CMP) and conditional loops to separate quotients and remainders."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Set dividend cell 2050H = 19H (25 decimal) and divisor cell 2051H = 05H (5 decimal).\n3. Assemble and Run.\n4. Cell 2052H should contain the Quotient (05H) and 2053H should contain the Remainder (00H).\n5. Try a non-perfect division, e.g., 2050H = 1AH (26) / 2051H = 05H (5). Outcome: Quotient = 05H (in 2052H), Remainder = 01H (in 2053H).",
    expectedResult: "Quotient is stored at 2052H and the Remainder at 2053H.",
    assemblyCode: `; Program to divide two 8-bit numbers using successive subtraction
ORG 2000H

MVI C, 00H   ; Clear Register C to serve as the Quotient counter
LDA 2050H    ; Load Dividend into Accumulator
MOV B, A     ; Save Dividend in Register B
LDA 2051H    ; Load Divisor into Accumulator
CPI 00H      ; Check if Divisor is 0 (Division by Zero)
JZ ERROR     ; If divisor is 0, jump to ERROR block
MOV E, A     ; Save Divisor in Register E
MOV A, B     ; Move Dividend back into Accumulator

LOOP: CMP E  ; Compare Accumulator (dividend) with Divisor (E)
JC DONE      ; If Accumulator < E, subtraction loop is complete
SUB E        ; Subtract Divisor from Accumulator (A = A - E)
INR C        ; Increment Quotient counter C
JMP LOOP     ; Repeat subtraction

ERROR: MVI C, 0FFH ; If division by zero occurred, set quotient to FFH as error flag
XRA A        ; Set Accumulator to 00H (Remainder is 00H)

DONE: MOV B, A ; Save remaining value (Remainder) in Register B
MOV A, C     ; Load Quotient (C) into Accumulator
STA 2052H    ; Store Quotient at 2052H
MOV A, B     ; Load Remainder (B) into Accumulator
STA 2053H    ; Store Remainder at 2053H
HLT          ; Halt program execution
`
  },
  {
    id: "store_1_to_10",
    title: "9. Store Numbers from 1 to 10 starting at 3061H",
    difficulty: "Intermediate",
    description: "Write an assembly routine to store numbers from 1 to 10 (01H to 0AH) sequentially starting from memory location 3061H.",
    learningObjectives: [
      "Load a 16-bit starting memory pointer using the LXI instruction.",
      "Implement a structured loop with a loop counter register (C).",
      "Store accumulator data indirectly to memory pointed by H-L."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Assemble, Load, and Run.\n3. Open the RAM VIEWER and search/scroll to address 3061H.\n4. Check the cell contents from 3061H to 306AH. They should be filled with 01, 02, 03, 04, 05, 06, 07, 08, 09, 0A.",
    expectedResult: "Addresses 3061H through 306AH hold sequential bytes from 01H to 0AH.",
    assemblyCode: `; Program to store numbers from 1 to 10 starting at address 3061H
ORG 2000H

LXI H, 3061H ; Point HL register pair to starting memory address 3061H
MVI C, 0AH    ; Set loop counter C = 10 (0AH in hexadecimal)
MVI A, 01H   ; Start with value 01H in Accumulator

LOOP: MOV M, A ; Store the current value of A into memory pointed by HL
INX H         ; Increment HL pointer to the next memory address
INR A         ; Increment sequence number in Accumulator
DCR C         ; Decrement loop counter C
JNZ LOOP      ; If counter is not zero, repeat the store loop

HLT          ; Halt program execution
`
  },
  {
    id: "sum_1_to_10",
    title: "10. Find Sum of Numbers from 1 to 10",
    difficulty: "Intermediate",
    description: "Calculate the arithmetic sum of numbers from 1 to 10 (decimal 55 or hexadecimal 37H) and store the final result in memory location 2040H.",
    learningObjectives: [
      "Set up an arithmetic accumulation loop.",
      "Use Register C as a downward counter and adder operand.",
      "Store the calculated result in a dedicated memory cell."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Assemble, Load, and Run.\n3. Inspect memory address 2040H in the RAM VIEWER.\n4. Confirm that 2040H contains 37H (which represents 55 in decimal).",
    expectedResult: "Memory location 2040H should contain the accumulated sum value 37H.",
    assemblyCode: `; Program to find the sum of numbers from 1 to 10
ORG 2000H

MVI C, 0AH    ; Load loop counter C with 10 (0AH)
MVI A, 00H   ; Clear Accumulator to hold the running sum

LOOP: ADD C  ; Add C to the Accumulator (A = A + C)
DCR C        ; Decrement counter
JNZ LOOP     ; If counter is not zero, continue adding

STA 2040H    ; Store the final accumulated sum (37H) in 2040H
HLT          ; Halt program execution
`
  },
  {
    id: "even_numbers_1_to_20",
    title: "11. Display All Even Numbers from 1 to 20",
    difficulty: "Intermediate",
    description: "Generate and display all even numbers from 1 to 20 (namely 02, 04, 06, 08, 0A, 0C, 0E, 10, 12, 14H) and store them sequentially starting from memory location 2050H.",
    learningObjectives: [
      "Understand incremental loop patterns using immediate addition (ADI 02H).",
      "Write multiple computed sequence terms sequentially to memory.",
      "Manage indirect memory writes using register pair HL."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Assemble, Load, and Run the program.\n3. Open the RAM VIEWER and scroll to 2050H.\n4. Check cells 2050H to 2059H. They should contain the sequence: 02, 04, 06, 08, 0A, 0C, 0E, 10, 12, 14.",
    expectedResult: "RAM cells 2050H through 2059H contain the even numbers 02H through 14H.",
    assemblyCode: `; Program to store all even numbers from 1 to 20 starting at 2050H
ORG 2000H

LXI H, 2050H ; Point HL to the starting memory address 2050H
MVI C, 0AH    ; There are exactly 10 even numbers between 1 and 20
MVI A, 02H   ; First even number is 02H

LOOP: MOV M, A ; Store current even number in memory pointed by HL
INX H         ; Move HL to next memory location
ADI 02H      ; Add 02H to Accumulator to get the next even number
DCR C         ; Decrement loop counter
JNZ LOOP      ; If counter is not zero, repeat loop

HLT          ; Halt program execution
`
  },
  {
    id: "fibonacci_10th",
    title: "12. Generate Fibonacci Series Up to 10th Term",
    difficulty: "Advanced",
    description: "Generate the first 10 terms of the Fibonacci series (00H, 01H, 01H, 02H, 03H, 05H, 08H, 0DH, 15H, 22H) and store them in memory starting from address 2050H.",
    learningObjectives: [
      "Implement mathematical recurrence relationships in assembly.",
      "Maintain multiple running states concurrently across registers B, D, and E.",
      "Understand complex loop conditions and memory array generation."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Assemble, Load, and Run the program.\n3. Open the RAM VIEWER and scroll to 2050H.\n4. Check addresses 2050H to 2059H. Confirm the values match the Fibonacci sequence: 00, 01, 01, 02, 03, 05, 08, 0D, 15, 22.",
    expectedResult: "Addresses 2050H to 2059H contain the first 10 Fibonacci values: 00H, 01H, 01H, 02H, 03H, 05H, 08H, 0DH, 15H, 22H.",
    assemblyCode: `; Program to generate first 10 terms of Fibonacci series at 2050H
ORG 2000H

LXI H, 2050H ; Point HL register pair to starting memory address 2050H
MVI C, 0AH    ; Set total term counter C = 10

MVI A, 00H   ; Term 1 = 00H
MOV M, A     ; Store 1st term at 2050H
DCR C         ; Decrement term counter

INX H        ; Move pointer to 2051H
MVI B, 01H   ; Term 2 = 01H
MOV M, B     ; Store 2nd term at 2051H
DCR C         ; Decrement term counter

MVI D, 00H   ; Register D will hold F(n-2), initially 00H
MOV E, B     ; Register E will hold F(n-1), initially 01H

LOOP: INX H  ; Increment HL pointer to write next term
MOV A, D     ; Load F(n-2) into Accumulator
ADD E        ; Add F(n-1) to get F(n) (A = D + E)
MOV M, A     ; Store the generated Fibonacci number F(n)
MOV D, E     ; Shift: F(n-1) becomes new F(n-2)
MOV E, A     ; Shift: F(n) becomes new F(n-1)
DCR C         ; Decrement term counter
JNZ LOOP     ; If more terms left, repeat addition loop

HLT          ; Halt program execution
`
  },
  {
    id: "sort_10_numbers",
    title: "13. Sort 10 Numbers in Ascending Order",
    difficulty: "Advanced",
    description: "Sort an array of 10 unsigned 8-bit numbers located from 2050H to 2059H in ascending order using Bubble Sort.",
    learningObjectives: [
      "Design nested loop logic in assembly (outer and inner passes).",
      "Perform comparison and implement data swapping algorithms.",
      "Control relative address pointer manipulation using INX and DCX."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Populate memory locations 2050H to 2059H with random numbers in the RAM VIEWER (e.g., 0A, 04, 0F, 01, 15, 03, 09, 05, 07, 02).\n3. Assemble, Load, and Run.\n4. Scroll to 2050H to verify the numbers are now sorted: 01, 02, 03, 04, 05, 07, 09, 0A, 0F, 15.",
    expectedResult: "The array of 10 values located at 2050H-2059H is sorted in ascending numerical order.",
    assemblyCode: `; Program to sort 10 numbers in ascending order using Bubble Sort
ORG 2000H

MVI D, 09H   ; Outer loop counter = N - 1 = 9 passes

OUTER: LXI H, 2050H ; Reset memory pointer to the start of the array
MVI C, 09H   ; Inner loop counter = N - 1 = 9 comparisons per pass

INNER: MOV A, M ; Load current element into Accumulator
INX H         ; Point to the next element
CMP M         ; Compare current element with next element [HL]
JC NOSWAP     ; If current < next, they are in correct order, skip swap
JZ NOSWAP     ; If they are equal, skip swap

; Swap the elements in memory
MOV B, M     ; Load next element into Register B
MOV M, A     ; Place current element (A) in the next element's memory slot [HL]
DCX H         ; Point back to the current element's memory slot [HL-1]
MOV M, B     ; Place next element (B) in the current element's slot [HL-1]
INX H         ; Point HL back to next element to preserve pointer for subsequent comparisons

NOSWAP: DCR C ; Decrement inner comparison counter
JNZ INNER     ; If comparisons left in this pass, repeat inner loop

DCR D        ; Decrement outer pass counter
JNZ OUTER     ; If more passes are required, start the next pass

HLT          ; Halt program execution
`
  },
  {
    id: "sum_16bit_numbers",
    title: "14. Sum of Two 16-Bit Numbers",
    difficulty: "Intermediate",
    description: "Calculate the sum of two 16-bit numbers. The first 16-bit number is loaded from 2050H (LSB) and 2051H (MSB), and the second is loaded from 2052H (LSB) and 2053H (MSB). Store the 16-bit sum in 2054H (LSB) and 2055H (MSB), and any carry in 2056H.",
    learningObjectives: [
      "Understand 16-bit register pair memory loading with LHLD.",
      "Execute high-speed 16-bit binary additions with DAD instruction.",
      "Track and store 16-bit overflow carry flags."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Set inputs in RAM: \n   - First 16-bit number (e.g., FFFFH): 2050H = FF, 2051H = FF\n   - Second 16-bit number (e.g., 0002H): 2052H = 02, 2053H = 00\n3. Assemble and Run.\n4. Check memory: 2054H = 01H, 2055H = 00H, and 2056H = 01H (representing total sum of 10001H).",
    expectedResult: "The 16-bit sum is saved at 2054H-2055H and any carry is saved at 2056H.",
    assemblyCode: `; Program to add two 16-bit numbers with carry tracking
ORG 2000H

LHLD 2050H   ; Load first 16-bit number from 2050H/2051H into HL register pair
XCHG         ; Exchange HL with DE (DE now holds first 16-bit number)
LHLD 2052H   ; Load second 16-bit number from 2052H/2053H into HL register pair
MVI C, 00H   ; Clear Register C to serve as the Carry indicator
DAD D        ; Add Register Pair DE to HL (HL = HL + DE, LSB & MSB are added)
JNC STORE    ; If there is no carry (CY = 0), jump to STORE
INR C        ; If carry occurred, increment Register C

STORE: SHLD 2054H ; Store the 16-bit sum in HL at 2054H (LSB) and 2055H (MSB)
MOV A, C     ; Load carry indicator from C into Accumulator
STA 2056H    ; Store Carry value at 2056H
HLT          ; Halt program execution
`
  },
  {
    id: "reverse_16bit_number",
    title: "15. Program to Display Reverse of a 16-Bit Number",
    difficulty: "Advanced",
    description: "Load a 16-bit number from memory location 2050H/2051H, reverse all of its 16 bits, and store the reversed 16-bit result in 2052H/2053H.",
    learningObjectives: [
      "Perform advanced bitwise manipulations on 16-bit boundaries.",
      "Utilize bit-by-bit rotation loops to reverse data streams.",
      "Store and reconstruct multi-register binary patterns."
    ],
    setupInstructions: "1. Click 'Load Code to Workspace'.\n2. Set inputs in RAM: \n   - Load a 16-bit pattern, e.g., 8000H (10000000 00000000B): 2050H = 00H, 2051H = 80H.\n3. Run the program.\n4. Check the result at 2052H and 2053H.\n5. Cell 2052H should contain 01H and 2053H should contain 00H (representing 0001H, which is the exact bit-reversal of 8000H: 00000000 00000001B).",
    expectedResult: "The bitwise reversed pattern of the 16-bit input is saved at 2052H-2053H.",
    assemblyCode: `; Program to reverse the bits of a 16-bit number
ORG 2000H

LHLD 2050H   ; Load 16-bit number from 2050H (L) and 2051H (H)

; Part 1: Reverse L (original LSB) and accumulate into Register D (new MSB)
MOV A, L     ; Load L into Accumulator
MVI C, 08H   ; Set bit counter = 8
MVI D, 00H   ; Clear Register D to hold reversed L SB

LOOP1: RAR   ; Shift right-most bit of A (LSB) into Carry
MOV E, A     ; Save remaining bits of A in Register E
MOV A, D     ; Load accumulated bits into Accumulator
RAL          ; Shift Carry into the right-most bit (LSB) of A
MOV D, A     ; Save updated accumulation in Register D
MOV A, E     ; Restore remaining bits of A for next loop
DCR C        ; Decrement bit counter
JNZ LOOP1    ; Repeat for all 8 bits of L

; Part 2: Reverse H (original MSB) and accumulate into Register E (new LSB)
MOV A, H     ; Load H into Accumulator
MVI C, 08H   ; Set bit counter = 8
MVI E, 00H   ; Clear Register E to hold reversed MSB

LOOP2: RAR   ; Shift right-most bit of A (LSB) into Carry
MOV H, A     ; Save remaining bits of A in Register H
MOV A, E     ; Load accumulated bits into Accumulator
RAL          ; Shift Carry into the right-most bit (LSB) of A
MOV E, A     ; Save updated accumulation in Register E
MOV A, H     ; Restore remaining bits of A for next loop
DCR C        ; Decrement bit counter
JNZ LOOP2    ; Repeat for all 8 bits of H

; DE now holds the fully reversed 16-bit number (E = LSB, D = MSB)
; Store reversed 16-bit result at 2052H (LSB) and 2053H (MSB)
MOV A, E     ; Load reversed LSB
STA 2052H    ; Store at 2052H
MOV A, D     ; Load reversed MSB
STA 2053H    ; Store at 2053H

HLT          ; Halt program execution
`
  }
];
