const { Lexer } = require("../modules/lexer");
const { Parser } = require("../modules/parser");
const { Interpreter } = require("../modules/interpreter");
const { Evaluator } = require("../modules/evaluator");

function runCompiler(sourceCode) {
	if (typeof sourceCode !== "string") {
		throw new Error("Source code must be a string.");
	}

	const lexer = new Lexer(sourceCode);
	const tokens = lexer.tokenize();

	const parser = new Parser(tokens);
	const ast = parser.parse();

	const evaluator = new Evaluator();
	const interpreter = new Interpreter(evaluator);
	const result = interpreter.run(ast);

	return {
		tokens,
		ast,
		...result,
	};
}

module.exports = { runCompiler };
