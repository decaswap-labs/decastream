#!/usr/bin/env node

// Fix BigInt values in test-suite.js
const fs = require("fs");

let content = fs.readFileSync("test-suite.js", "utf8");

// Replace all string BigInt values with actual BigInt
content = content.replace(/'500000000000000000'/g, "500000000000000000n");
content = content.replace(/'250000000000000000'/g, "250000000000000000n");
content = content.replace(/'0'/g, "0n");

fs.writeFileSync("test-suite.js", content);

console.log("✅ Fixed BigInt values in test-suite.js");
