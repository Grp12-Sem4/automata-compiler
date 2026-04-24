const test = require("node:test");
const assert = require("node:assert/strict");
const { Lexer } = require("../backend/src/modules/lexer");
const { Parser } = require("../backend/src/modules/parser");
const { SemanticAnalyzer } = require("../backend/src/modules/semanticAnalyzer");

function analyze(source) {
	const tokens = new Lexer(source).tokenize();
	const ast = new Parser(tokens).parse();
	return new SemanticAnalyzer(source).analyze(ast);
}

test("semantic analyzer allows valid declarations and assignments", () => {
	const source = [
		"let x = 10;",
		"x = x + 5;",
		"print(x);"
	].join("\n");

	const result = analyze(source);

	assert.equal(result.success, true);
	assert.equal(result.errors.length, 0);
});

test("semantic analyzer detects variable redeclaration in same scope", () => {
	const source = [
		"let x = 10;",
		"let x = 20;"
	].join("\n");

	const result = analyze(source);

	assert.equal(result.success, false);
	assert.match(result.errors[0].message, /already declared/);
	assert.equal(result.errors[0].phase, "semantic");
});

test("semantic analyzer allows shadowing in nested block", () => {
	const source = [
		"let x = 10;",
		"if (true) {",
		"  let x = 5;",
		"  print(x);",
		"}",
		"print(x);"
	].join("\n");

	const result = analyze(source);

	assert.equal(result.success, true);
});

test("semantic analyzer detects use before declaration", () => {
	const source = "print(x);";

	const result = analyze(source);

	assert.equal(result.success, false);
	assert.match(result.errors[0].message, /used before declaration/);
});

test("semantic analyzer detects assignment to undeclared variable", () => {
	const source = "x = 10;";

	const result = analyze(source);

	assert.equal(result.success, false);
	assert.match(result.errors[0].message, /undeclared variable/);
});

test("semantic analyzer requires boolean if condition", () => {
	const source = [
		"let x = 10;",
		"if (x) {",
		"  print(x);",
		"}"
	].join("\n");

	const result = analyze(source);

	assert.equal(result.success, false);
	assert.match(result.errors[0].message, /condition must be boolean/);
});

test("semantic analyzer requires boolean logical operands", () => {
	const source = [
		"let x = 10;",
		"let y = 20;",
		"if (x && y) {",
		"  print(x);",
		"}"
	].join("\n");

	const result = analyze(source);

	assert.equal(result.success, false);
	assert.ok(result.errors.some((error) => error.message.includes("must be boolean")));
});