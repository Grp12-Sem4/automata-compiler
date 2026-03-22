const parseInput = require("./parser");
const validateSequence = require("./validator");

const dfa = 
{
  initialState: "CLOSED",
  transitions: 
  {
    "CLOSED": { "SYN": "SYN_SENT" },
    "SYN_SENT": { "SYN-ACK": "ESTABLISHED" },
    "ESTABLISHED": { "DATA": "ESTABLISHED", "FIN": "FIN_WAIT" }
  }
};

console.log("---- Parser Tests ----");
console.log(parseInput("SYN -> SYN-ACK -> DATA"));
console.log(parseInput("  SYN->DATA  "));
console.log(parseInput(""));

console.log("\n---- Validator Tests ----");

// ✅ Valid
console.log(validateSequence("SYN -> SYN-ACK -> DATA",dfa));

// ❌ Invalid transition
console.log(validateSequence("SYN -> DATA",dfa));

// ⚠ Empty input
console.log(validateSequence("",dfa));

// ❌ Unknown packet
console.log(validateSequence("SYN -> XYZ",dfa));

// ⚠ Weird format
console.log(validateSequence("SYN -> -> DATA",dfa));

// ⚠ Single packet
console.log(validateSequence("SYN",dfa));