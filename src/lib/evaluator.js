export function evaluateLines(lines) {
  const results = [];
  const variables = {}; // Store variables
  let lastResult = 0; // To keep track of the last result

  // Helper functions for supported math operations and functions
  const mathFunctions = {
    abs: (x) => Math.abs(x),
    sin: (x) => Math.sin(x),
    cos: (x) => Math.cos(x),
    tan: (x) => Math.tan(x),
    asin: (x) => Math.asin(x),
    acos: (x) => Math.acos(x),
    atan: (x) => Math.atan(x),
    log: (x) => Math.log10(x),
    ln: (x) => Math.log(x),
    sqrt: (x) => Math.sqrt(x),
    exp: (x) => Math.exp(x),
  };

  for (const line of lines) {
    if (!line) {
      results.push({ type: "null", value: "" });
      continue;
    }
    try {
      let expression = line.trim();

      // Replace `last` keyword with `lastResult`
      expression = expression.replace(/\blast\b/g, lastResult);

      // Replace "^" with "**" for exponentiation
      expression = expression.replace(/\^/g, "**");

      // Replace variables in the expression with their values
      for (const [key, value] of Object.entries(variables)) {
        const varRegex = new RegExp(`\\b${key}\\b`, "g");
        expression = expression.replace(varRegex, value);
      }

      // Parse assignments
      if (/^[a-zA-Z_]\w*\s*=/.test(expression)) {
        // Split on the first "="
        const [varName, varExpression] = expression.split(/=(.+)/);
        const trimmedName = varName.trim();

        // Evaluate the right-hand side of the assignment
        const result = evaluateExpression(varExpression.trim(), mathFunctions);
        variables[trimmedName] = result;
        lastResult = result;
        results.push({ type: "result", value: result });
      } else {
        // Evaluate as a standalone expression
        const result = evaluateExpression(expression, mathFunctions);
        lastResult = result;
        results.push({ type: "result", value: result });
      }
    } catch (error) {
      results.push({ type: "error", value: `Error: ${error.message}` });
    }
  }
  return results;
}

// Helper to evaluate an expression with math functions and bitwise operations
function evaluateExpression(expression, mathFunctions) {
  // Create a new function that can access math functions and evaluates the expression
  return Function(
    '"use strict"; ' +
      Object.entries(mathFunctions)
        .map(([name, fn]) => `const ${name} = ${fn};`)
        .join("\n") +
      `return (${expression});`
  )();
}
