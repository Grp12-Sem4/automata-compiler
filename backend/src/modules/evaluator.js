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
      default:
        throw new Error(`[Evaluator] Unsupported unary operator '${node.operator}'.`);
    }
  }

  evaluateBinary(node, symbolTable) {
    const left = this.evaluate(node.left, symbolTable);
    const right = this.evaluate(node.right, symbolTable);

    switch (node.operator) {
      case TokenType.PLUS:
      case "+":
        return left + right;
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
}

module.exports = { Evaluator };
