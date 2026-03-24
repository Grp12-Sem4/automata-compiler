const { Evaluator } = require("./evaluator");

class Interpreter {
  constructor(evaluator = new Evaluator()) {
    this.evaluator = evaluator;
    this.reset();
  }

  reset() {
    this.symbolTable = Object.create(null);
    this.outputValues = [];
  }

  run(program) {
    const result = this.interpret(program);

    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      success: true,
      output: result.output.map((value) => String(value)).join("\n"),
      outputLines: result.output.map((value) => String(value)),
      outputValues: [...result.output],
      symbolTable: { ...result.memory },
      memory: { ...result.memory }
    };
  }

  interpret(program) {
    this.reset();

    try {
      if (!program || program.type !== "Program" || !Array.isArray(program.body)) {
        throw new Error("Invalid AST: root must be Program with a body array.");
      }

      for (const statement of program.body) {
        this.execute(statement);
      }

      return this.snapshot(true);
    } catch (error) {
      return this.snapshot(false, error.message);
    }
  }

  snapshot(success, error) {
    const result = {
      success,
      memory: { ...this.symbolTable },
      output: [...this.outputValues]
    };

    if (error) {
      result.error = error;
    }

    return result;
  }

  execute(node) {
    if (!node || !node.type) {
      throw new Error("[Interpreter] Invalid statement node.");
    }

    switch (node.type) {
      case "VariableDeclaration": {
        const identifier = this.getIdentifier(node);
        const initializer = node.initializer ?? node.value;

        if (!initializer) {
          throw new Error(`[Interpreter] Variable '${identifier}' must have a value.`);
        }

        if (identifier in this.symbolTable) {
          throw new Error(`[Interpreter] Variable '${identifier}' is already declared.`);
        }

        const value = this.evaluator.evaluate(initializer, this.symbolTable);
        this.symbolTable[identifier] = value;
        return value;
      }

      case "AssignmentStatement": {
        const identifier = this.getIdentifier(node);
        const assignmentValue = node.value ?? node.initializer;

        if (!(identifier in this.symbolTable)) {
          throw new Error(`[Interpreter] Variable '${identifier}' is not defined.`);
        }

        if (!assignmentValue) {
          throw new Error(`[Interpreter] Assignment for '${identifier}' must have a value.`);
        }

        const value = this.evaluator.evaluate(assignmentValue, this.symbolTable);
        this.symbolTable[identifier] = value;
        return value;
      }

      case "PrintStatement": {
        if (!node.expression) {
          throw new Error("[Interpreter] PrintStatement must have an expression.");
        }

        const value = this.evaluator.evaluate(node.expression, this.symbolTable);
        this.outputValues.push(value);
        return value;
      }

      case "BlockStatement": {
        let lastValue = null;

        for (const statement of node.body) {
          lastValue = this.execute(statement);
        }

        return lastValue;
      }

      case "IfStatement": {
        const condition = this.evaluator.evaluate(node.condition, this.symbolTable);

        if (condition) {
          return this.execute(node.thenBranch);
        }

        if (node.elseBranch) {
          return this.execute(node.elseBranch);
        }

        return null;
      }

      case "WhileStatement": {
        let iterations = 0;
        let lastValue = null;

        while (this.evaluator.evaluate(node.condition, this.symbolTable)) {
          iterations += 1;

          if (iterations > 10000) {
            throw new Error("[Interpreter] Loop iteration limit exceeded.");
          }

          lastValue = this.execute(node.body);
        }

        return lastValue;
      }

      case "ExpressionStatement":
        return this.evaluator.evaluate(node.expression, this.symbolTable);

      default:
        throw new Error(`[Interpreter] Unsupported node type '${node.type}'.`);
    }
  }

  getIdentifier(node) {
    const identifier = typeof node.identifier === "string" ? node.identifier : node.name;

    if (typeof identifier !== "string" || identifier.trim() === "") {
      throw new Error("[Interpreter] Invalid variable name.");
    }

    return identifier;
  }
}

module.exports = { Interpreter };
