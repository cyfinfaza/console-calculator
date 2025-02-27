import { loadPyodide } from "pyodide";

let pyodideInstance = null;
let isPyodideReady = false;
let evaluationMode = "javascript"; // Default to JavaScript

// Initialize Pyodide
async function initPyodide() {
  if (!isPyodideReady) {
    try {
      console.log("Loading Pyodide...");
      pyodideInstance = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.3/full/",
      });

      console.log("Loading NumPy package...");
      // Load numpy package explicitly
      await pyodideInstance.loadPackage("numpy");
      await pyodideInstance.loadPackage("matplotlib");

      // Import numpy and math with * to make functions directly available
      await pyodideInstance.runPythonAsync(`
        import numpy as np
        import math
        from numpy import *
        from math import *
        
        # Set up the last variable for Python mode
        last = 0
      `);

      isPyodideReady = true;
      console.log("Pyodide initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Pyodide:", error);
      throw new Error("Failed to initialize Python environment");
    }
  }
  return pyodideInstance;
}

// Set the evaluation mode
export function setEvaluationMode(mode) {
  if (mode !== "javascript" && mode !== "python") {
    throw new Error("Invalid evaluation mode. Use 'javascript' or 'python'");
  }

  evaluationMode = mode;
  if (mode === "python" && !isPyodideReady) {
    return initPyodide();
  }
  return Promise.resolve();
}

// Get the current evaluation mode
export function getEvaluationMode() {
  return evaluationMode;
}

export async function evaluateLines(lines) {
  if (evaluationMode === "python" && !isPyodideReady) {
    await initPyodide();
  }

  return evaluationMode === "javascript"
    ? evaluateLinesJavaScript(lines)
    : await evaluateLinesPython(lines);
}

// Simplified error handler for JavaScript
function getSimplifiedJSErrorMessage(error) {
  const errorMsg = error.message || String(error);

  // Handle common JavaScript errors with simplified messages
  if (errorMsg.includes("Unexpected token")) {
    return "Syntax error";
  } else if (errorMsg.includes("is not defined")) {
    return "Undefined variable or function";
  } else if (
    errorMsg.includes("Cannot read property") ||
    errorMsg.includes("Cannot read properties")
  ) {
    return "Invalid property access";
  } else if (errorMsg.includes("is not a function")) {
    return "Not a function";
  } else if (errorMsg.includes("Maximum call stack size exceeded")) {
    return "Infinite recursion detected";
  } else if (errorMsg.includes("Division by zero")) {
    return "Division by zero";
  }

  // Truncate long error messages
  return errorMsg.length > 50 ? errorMsg.substring(0, 50) + "..." : errorMsg;
}

// JavaScript evaluation logic with improved error handling
function evaluateLinesJavaScript(lines) {
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
      results.push({
        type: "error",
        value: getSimplifiedJSErrorMessage(error),
      });
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

// Simplified error handler for Python
function getSimplifiedPythonErrorMessage(error) {
  const errorMsg = error.message || String(error);

  // Common Python errors with simplified messages
  if (errorMsg.includes("SyntaxError")) {
    return "Syntax error";
  } else if (errorMsg.includes("NameError")) {
    return "Undefined variable or function";
  } else if (errorMsg.includes("TypeError")) {
    if (errorMsg.includes("not callable")) {
      return "Not a function";
    } else if (errorMsg.includes("can't multiply")) {
      return "Type mismatch in operation";
    } else {
      return "Type error";
    }
  } else if (errorMsg.includes("ValueError")) {
    return "Invalid value";
  } else if (errorMsg.includes("ZeroDivisionError")) {
    return "Division by zero";
  } else if (errorMsg.includes("IndexError")) {
    return "Index out of range";
  } else if (errorMsg.includes("AttributeError")) {
    return "Invalid attribute";
  } else if (errorMsg.includes("UnboundLocalError")) {
    return "Variable used before assignment";
  } else if (errorMsg.includes("IndentationError")) {
    return "Indentation error";
  } else if (errorMsg.includes("RecursionError")) {
    return "Maximum recursion depth exceeded";
  }

  // Extract just the error type and message without traceback
  const errorPattern = /(\w+Error):\s*(.+?)(?:\n|$)/;
  const match = errorMsg.match(errorPattern);
  if (match) {
    const shortMessage = match[2].trim();
    return shortMessage.length > 50
      ? shortMessage.substring(0, 50) + "..."
      : shortMessage;
  }

  // Fallback for other errors - truncate if needed
  return errorMsg.length > 50 ? errorMsg.substring(0, 50) + "..." : errorMsg;
}

// Python evaluation logic with improved error handling
async function evaluateLinesPython(lines) {
  const results = [];

  if (!isPyodideReady) {
    await initPyodide();
  }

  for (let line of lines) {
    // Handle comments
    line = line.split("//")[0];
    if (!line) {
      results.push({ type: "null", value: "" });
      continue;
    }

    try {
      let expression = line.trim();

      // Replace "^" with "**" for exponentiation
      expression = expression.replace(/\^/g, "**");

      // Check if it's an assignment
      const isAssignment = /^[a-zA-Z_]\w*\s*=/.test(expression);

      // For assignments, we run the code and update last
      if (isAssignment) {
        // Run the assignment
        await pyodideInstance.runPythonAsync(expression);

        // Extract variable name to get its value
        const varName = expression.split(/=(.+)/)[0].trim();
        const result = pyodideInstance.globals.get(varName);

        // Update last variable in Python context
        await pyodideInstance.runPythonAsync(`last = ${varName}`);

        // Format the result
        const formattedResult = formatPythonResult(result);
        results.push({ type: "result", value: formattedResult });
      } else {
        // For expressions, we need to get the value and update last
        let result;
        try {
          // Try to evaluate as an expression and capture the result
          result = pyodideInstance.runPython(`
            _temp_result = ${expression}
            last = _temp_result
            _temp_result
          `);
        } catch (expressionError) {
          // If it fails as an expression, try running as a statement
          await pyodideInstance.runPythonAsync(expression);
          result = pyodideInstance.globals.get("last");
        }

        // Format the result
        const formattedResult = formatPythonResult(result);
        results.push({ type: "result", value: formattedResult });
      }
    } catch (error) {
      results.push({
        type: "error",
        value: getSimplifiedPythonErrorMessage(error),
      });
    }
  }

  return results;
}

// Helper to format Python results for display
function formatPythonResult(result) {
  if (result === undefined || result === null) {
    return "None";
  }

  // Handle numpy arrays
  if (result && typeof result === "object" && result.type === "numpy.ndarray") {
    try {
      // For numpy arrays, try to convert to a readable format
      return pyodideInstance.runPython(`str(${result.toString()})`);
    } catch (e) {
      return String(result);
    }
  }

  // Handle numeric values
  if (typeof result === "number") {
    // Format to avoid excessive decimals
    return Number.isInteger(result) ? result : parseFloat(result.toFixed(10));
  }

  return String(result);
}
