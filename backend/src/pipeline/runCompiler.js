const { Lexer } = require("../modules/lexer");
const { Parser } = require("../modules/parser");
const { Interpreter } = require("../modules/interpreter");
const { Evaluator } = require("../modules/evaluator");
const { SemanticAnalyzer } = require("../modules/semanticAnalyzer");

function runCompiler(sourceCode, userInput = "") {
	if (typeof sourceCode !== "string") {
		throw new Error("Source code must be a string.");
	}

	const lexer = new Lexer(sourceCode);
	const tokens = lexer.tokenize();

	const parser = new Parser(tokens);
	const ast = parser.parse();

	if (parser.errors.length > 0) {
		return {
			success: false,
			phase: "syntax",
			tokens,
			ast: null,
			errors: parser.errors.map((err) => ({
				message: err.message,
				phase: err.phase,
				line: err.line,
				column: err.column,
				lexeme: err.lexeme,
			})),
		};
	}

	const semanticAnalyzer = new SemanticAnalyzer(sourceCode);
	const semanticResult = semanticAnalyzer.analyze(ast);

	if (!semanticResult.success) {
		return {
			success: false,
			phase: "semantic",
			tokens,
			ast,
			errors: semanticResult.errors,
		};
	}

	const evaluator = new Evaluator();
	const interpreter = new Interpreter(evaluator, sourceCode, userInput);
	const result = interpreter.run(ast);

	return {
		success: true,
		phase: "runtime",
		tokens,
		ast,
		...result,
	};
}

module.exports = { runCompiler };
