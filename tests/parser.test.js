const test = require("node:test");
const assert = require("node:assert/strict");
const { Lexer } = require("../backend/src/modules/lexer");
const { Parser } = require("../backend/src/modules/parser");

test("parser builds an AST for declarations and print statements", () => {
  const source = "let value = 20 % 6 + 3 * 4; print value;";
  const tokens = new Lexer(source).tokenize();
  const ast = new Parser(tokens).parse();

  assert.equal(ast.type, "Program");
  assert.equal(ast.body.length, 2);
  assert.equal(ast.body[0].type, "VariableDeclaration");
  assert.equal(ast.body[0].identifier, "value");
  assert.equal(ast.body[0].initializer.type, "BinaryExpression");
  assert.equal(ast.body[0].initializer.left.operator, "MOD");
  assert.equal(ast.body[1].type, "PrintStatement");
  assert.equal(ast.body[1].expression.type, "Identifier");
});
