const test = require("node:test");
const assert = require("node:assert/strict");
const { Lexer, TokenType } = require("../backend/src/modules/lexer");

test("lexer tokenizes declarations, arithmetic, and equality", () => {
  const source = "let total = 42 % 5; print(total == 2);";
  const tokens = new Lexer(source).tokenize();

  assert.deepEqual(
    tokens.map((token) => token.type),
    [
      TokenType.LET,
      TokenType.IDENTIFIER,
      TokenType.ASSIGN,
      TokenType.NUMBER,
      TokenType.MOD,
      TokenType.NUMBER,
      TokenType.SEMICOLON,
      TokenType.PRINT,
      TokenType.LPAREN,
      TokenType.IDENTIFIER,
      TokenType.EQUAL_EQUAL,
      TokenType.NUMBER,
      TokenType.RPAREN,
      TokenType.SEMICOLON,
      TokenType.EOF
    ]
  );

  assert.equal(tokens[2].value, "=");
  assert.equal(tokens[4].value, "%");
  assert.equal(tokens[10].value, "==");
});
