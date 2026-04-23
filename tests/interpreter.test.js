const test = require("node:test");
const assert = require("node:assert/strict");
const { Lexer } = require("../backend/src/modules/lexer");
const { Parser } = require("../backend/src/modules/parser");
const { Evaluator } = require("../backend/src/modules/evaluator");
const { Interpreter } = require("../backend/src/modules/interpreter");

test("interpreter executes statements and updates the symbol table", () => {
  const source = [
    "let x = 1;",
    "while (x < 4) {",
    "  x = x + 1;",
    "}",
    "print(x);"
  ].join("\n");

  const tokens = new Lexer(source).tokenize();
  const ast = new Parser(tokens).parse();
  const interpreter = new Interpreter(new Evaluator());
  const result = interpreter.run(ast);

  assert.equal(result.output, "4");
  assert.deepEqual(result.symbolTable, { x: 4 });
});

test("interpreter supports the interpreter-branch AST shape safely", () => {
  const interpreter = new Interpreter(new Evaluator());
  const program = {
    type: "Program",
    body: [
      {
        type: "VariableDeclaration",
        name: "x",
        value: { type: "Number", value: 9 }
      },
      {
        type: "PrintStatement",
        expression: {
          type: "BinaryExpression",
          operator: "%",
          left: { type: "Identifier", name: "x" },
          right: { type: "Number", value: 4 }
        }
      }
    ]
  };

  const result = interpreter.interpret(program);

  assert.equal(result.success, true);
  assert.deepEqual(result.memory, { x: 9 });
  assert.deepEqual(result.output, [1]);
});

test("interpreter reports duplicate declarations through interpret()", () => {
  const interpreter = new Interpreter(new Evaluator());
  const program = {
    type: "Program",
    body: [
      {
        type: "VariableDeclaration",
        name: "value",
        value: { type: "Number", value: 1 }
      },
      {
        type: "VariableDeclaration",
        name: "value",
        value: { type: "Number", value: 2 }
      }
    ]
  };

  const result = interpreter.interpret(program);

  assert.equal(result.success, false);
  assert.equal(result.error, "[Interpreter] Variable 'value' is already declared.");
  assert.deepEqual(result.memory, { value: 1 });
});
