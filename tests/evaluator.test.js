const test = require("node:test");
const assert = require("node:assert/strict");
const { TokenType } = require("../backend/src/modules/lexer");
const { Evaluator } = require("../backend/src/modules/evaluator");

test("evaluator resolves arithmetic and comparison expressions", () => {
  const evaluator = new Evaluator();
  const expression = {
    type: "BinaryExpression",
    operator: TokenType.GT,
    left: {
      type: "BinaryExpression",
      operator: TokenType.PLUS,
      left: { type: "Literal", value: 7 },
      right: { type: "Literal", value: 5 }
    },
    right: {
      type: "Identifier",
      name: "threshold"
    }
  };

  const result = evaluator.evaluate(expression, { threshold: 10 });

  assert.equal(result, true);
});

test("evaluator supports the evaluator-branch AST shape and modulo", () => {
  const evaluator = new Evaluator();
  const expression = {
    type: "BinaryExpression",
    operator: "%",
    left: {
      type: "BinaryExpression",
      operator: "+",
      left: { type: "Identifier", name: "x" },
      right: { type: "Number", value: 5 }
    },
    right: { type: "Number", value: 4 }
  };

  const result = evaluator.evaluate(expression, { x: 7 });

  assert.equal(result, 0);
});
