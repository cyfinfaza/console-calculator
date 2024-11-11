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

  for (let line of lines) {
    line = line.split("//")[0];
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

      // Parse assignments
      if (/^[a-zA-Z_]\w*\s*=/.test(expression)) {
        // Split on the first "="
        const [varName, varExpression] = expression.split(/=(.+)/);
        const trimmedName = varName.trim();

        // Evaluate the right-hand side of the assignment without variable replacement
        const result = evaluateExpression(
          varExpression.trim(),
          mathFunctions,
          variables
        );
        variables[trimmedName] = result;
        lastResult = result;
        results.push({ type: "result", value: result });
      } else {
        // Replace variables in the expression with their values (excluding assignments)
        for (const [key, value] of Object.entries(variables)) {
          const varRegex = new RegExp(`\\b${key}\\b`, "g");
          if (typeof value === "string") {
            expression = expression.replace(varRegex, JSON.stringify(value));
          } else {
            expression = expression.replace(varRegex, value);
          }
        }

        // Evaluate as a standalone expression
        const result = evaluateExpression(expression, mathFunctions, variables);
        lastResult = result;
        results.push({ type: "result", value: result });
      }
    } catch (error) {
      results.push({ type: "error", value: `Error: ${error.message}` });
    }
  }
  return results;
}

// Helper to evaluate an expression with math functions and prevent global access
function evaluateExpression(expression, mathFunctions, variables) {
  // Create a new function that can access math functions and evaluates the expression
  return Function(
    '"use strict"; ' +
      "const window = undefined; const document = undefined; const fetch = undefined; const alert = undefined; const prompt = undefined;" +
      Object.entries(mathFunctions)
        .map(([name, fn]) => `const ${name} = ${fn};`)
        .join("\n") +
      Object.keys(variables)
        .map((key) => `const ${key} = ${JSON.stringify(variables[key])};`)
        .join("\n") +
      `return (${expression});`
  )();
}
