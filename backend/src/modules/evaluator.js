const { TokenType } = require("./lexer");

class Evaluator {
  evaluate(node, symbolTable = {}) {
    if (!node) {
      throw new Error("Evaluator received an empty expression.");
    }

    switch (node.type) {
      case "Literal":
      case "Number":
        return node.value;

      case "Identifier":
        return this.resolveIdentifier(node.name, symbolTable);

      case "UnaryExpression":
        return this.evaluateUnary(node, symbolTable);

      case "BinaryExpression":
        return this.evaluateBinary(node, symbolTable);
      
      case "LogicalExpression":
        return this.evaluateLogical(node, symbolTable);
      default:
        throw new Error(`[Evaluator] Unsupported expression type '${node.type}'.`);
    }
  }

  resolveIdentifier(name, symbolTable) {
    if (!(name in symbolTable)) {
      throw new Error(`[Evaluator] Variable '${name}' is not defined.`);
    }

    return symbolTable[name];
  }

  evaluateUnary(node, symbolTable) {
    const value = this.evaluate(node.argument, symbolTable);

    switch (node.operator) {
      case TokenType.MINUS:
      case "-":
        return -value;
      
      case TokenType.BANG:
      case "!":
        if (typeof value !== "boolean") {
          throw new Error("[Evaluator] Operand of ! must be boolean.");
        }
        return !value;

      default:
        throw new Error(`[Evaluator] Unsupported unary operator '${node.operator}'.`);
    }
  }

  evaluateBinary(node, symbolTable) 
  {
    const left = this.evaluate(node.left, symbolTable);
    const right = this.evaluate(node.right, symbolTable);

    switch (node.operator) {
      case TokenType.PLUS:
      case "+":{
        if (typeof left === "string" || typeof right === "string") {
          return String(left) + String(right);
        }

        if (typeof left === "number" && typeof right === "number") {
          return left + right;
        }

        throw new Error("[Evaluator] Invalid operands for '+' operator.");
      }
      case TokenType.MINUS:
      case "-":
        return left - right;
      case TokenType.STAR:
      case "*":
        return left * right;
      case TokenType.SLASH:
      case "/":
        if (right === 0) {
          throw new Error("[Evaluator] Division by zero.");
        }
        return left / right;
      case TokenType.MOD:
      case "%":
        if (right === 0) {
          throw new Error("[Evaluator] Modulo by zero.");
        }
        return left % right;
      case TokenType.EQ:
      case "==":
        return left === right;
      case TokenType.NEQ:
      case "!=":
        return left !== right;
      case TokenType.GT:
      case ">":
        return left > right;
      case TokenType.GTE:
      case ">=":
        return left >= right;
      case TokenType.LT:
      case "<":
        return left < right;
      case TokenType.LTE:
      case "<=":
        return left <= right;
      default:
        throw new Error(`[Evaluator] Unsupported binary operator '${node.operator}'.`);
    }
  }

  evaluateLogical(node, symbolTable) {
    const left = this.evaluate(node.left, symbolTable);

    if (node.operator === TokenType.AND) {
      if (typeof left !== "boolean") {
        throw new Error("[Evaluator] Left operand of && must be boolean.");
      }

      if (!left) return false;

      const right = this.evaluate(node.right, symbolTable);

      if (typeof right !== "boolean") {
        throw new Error("[Evaluator] Right operand of && must be boolean.");
      }

      return left && right;
    }

    if (node.operator === TokenType.OR) {
      if (typeof left !== "boolean") {
        throw new Error("[Evaluator] Left operand of || must be boolean.");
      }

      if (left) return true;

      const right = this.evaluate(node.right, symbolTable);

      if (typeof right !== "boolean") {
        throw new Error("[Evaluator] Right operand of || must be boolean.");
      }

      return left || right;
    }

    throw new Error(`[Evaluator] Unsupported logical operator '${node.operator}'.`);
  }
}

module.exports = { Evaluator };
