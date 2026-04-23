const test = require("node:test");
const assert = require("node:assert/strict");
const { Lexer } = require("../backend/src/modules/lexer");
const { Parser, ParserError } = require("../backend/src/modules/parser");

test("parser builds an AST for standardized declarations, print, and logic", () => {
	const source = [
		'let value = 20 % 6 + 3 * 4;',
		'print(value > 5 && true);',
	].join("\n");
	const tokens = new Lexer(source).tokenize();
	const ast = new Parser(tokens).parse();

	assert.equal(ast.type, "Program");
	assert.equal(ast.body.length, 2);
	assert.deepEqual(ast.loc.start, { line: 1, column: 1 });
	assert.equal(ast.body[0].type, "VariableDeclaration");
	assert.equal(ast.body[0].identifier, "value");
	assert.equal(ast.body[0].initializer.type, "BinaryExpression");
	assert.equal(ast.body[0].initializer.left.operator, "MOD");
	assert.equal(ast.body[1].type, "PrintStatement");
	assert.equal(ast.body[1].expression.type, "LogicalExpression");
	assert.equal(ast.body[1].expression.left.type, "BinaryExpression");
	assert.equal(ast.body[1].expression.right.value, true);
});

test("parser attaches source locations to statements and nested expressions", () => {
	const source = [
		"while (count < 3) {",
		'  print("hi");',
		"}",
	].join("\n");
	const tokens = new Lexer(source).tokenize();
	const ast = new Parser(tokens).parse();
	const loop = ast.body[0];
	const printStatement = loop.body.body[0];

	assert.deepEqual(loop.loc.start, { line: 1, column: 1 });
	assert.deepEqual(loop.loc.end, { line: 3, column: 1 });
	assert.deepEqual(loop.condition.loc.start, { line: 1, column: 8 });
	assert.deepEqual(printStatement.loc.start, { line: 2, column: 3 });
	assert.deepEqual(printStatement.expression.loc.start, { line: 2, column: 9 });
	assert.deepEqual(printStatement.expression.loc.end, { line: 2, column: 12 });
});

test("parser recognizes input() as a call expression", () => {
	const source = "let name = input();";
	const tokens = new Lexer(source).tokenize();
	const ast = new Parser(tokens).parse();
	const declaration = ast.body[0];

	assert.equal(declaration.initializer.type, "CallExpression");
	assert.equal(declaration.initializer.callee.type, "Identifier");
	assert.equal(declaration.initializer.callee.name, "input");
	assert.deepEqual(declaration.initializer.arguments, []);
});

test("parser enforces print(expr); and block bodies", () => {
	assert.throws(
		() => new Parser(new Lexer("print value;").tokenize()).parse(),
		(error) =>
			error instanceof ParserError &&
			error.phase === "syntax" &&
			error.line === 1 &&
			error.column === 7,
	);

	assert.throws(
		() => new Parser(new Lexer("if (true) print(1);").tokenize()).parse(),
		(error) =>
			error instanceof ParserError &&
			error.phase === "syntax" &&
			error.line === 1 &&
			error.column === 11,
	);
});
