const { Evaluator } = require("./evaluator");

class Interpreter {
	constructor(evaluator = new Evaluator(), sourceCode = "", userInput = "") {
		this.evaluator = evaluator;
		this.sourceCode = sourceCode;
		this.userInput = userInput;
		this.reset();
	}

	reset() {
		this.symbolTable = Object.create(null);
		this.outputValues = [];
	}

	run(program) {
		const result = this.interpret(program);

		if (!result.success) {
			throw result.error;
		}

		return {
			success: true,
			output: result.output.map((value) => String(value)).join("\n"),
			outputLines: result.output.map((value) => String(value)),
			outputValues: [...result.output],
			symbolTable: { ...result.memory },
			memory: { ...result.memory },
		};
	}

	interpret(program) {
		this.reset();

		try {
			if (
				!program ||
				program.type !== "Program" ||
				!Array.isArray(program.body)
			) {
				throw new Error("Invalid AST: root must be Program with a body array.");
			}

			for (const statement of program.body) {
				this.execute(statement);
			}

			return this.snapshot(true);
		} catch (error) {
			if (error && error.phase) {
				return this.snapshot(false, error);
			}

			return this.snapshot(
				false,
				this.runtimeError(error.message || String(error), null),
			);
		}
	}

	snapshot(success, error) {
		const result = {
			success,
			memory: { ...this.symbolTable },
			output: [...this.outputValues],
		};

		if (error) {
			result.error = error;
		}

		return result;
	}

	execute(node) {
		if (!node || !node.type) {
			throw this.runtimeError("Invalid statement node.", node);
		}

		switch (node.type) {
			case "VariableDeclaration": {
				const identifier = this.getIdentifier(node);
				const initializer = node.initializer ?? node.value;

				if (!initializer) {
					throw this.runtimeError(
						`Variable '${identifier}' must have a value.`,
						node,
					);
				}

				if (
					Object.prototype.hasOwnProperty.call(this.symbolTable, identifier)
				) {
					throw this.runtimeError(
						`Variable '${identifier}' is already declared.`,
						node,
					);
				}

				let value;
				if (initializer.type === "CallExpression") {
					value = this.handleCall(initializer);
				} else {
					try {
						value = this.evaluator.evaluate(initializer, this.symbolTable);
					} catch (err) {
						throw this.runtimeError(err.message, initializer);
					}
				}
				this.symbolTable[identifier] = value;
				return value;
			}

			case "AssignmentStatement": {
				const identifier = this.getIdentifier(node);
				const assignmentValue = node.value ?? node.initializer;

				if (!(identifier in this.symbolTable)) {
					throw this.runtimeError(
						`Variable '${identifier}' is not defined.`,
						node,
					);
				}

				if (!assignmentValue) {
					throw this.runtimeError(
						`Assignment for '${identifier}' must have a value.`,
						node,
					);
				}

				let value;

				if (assignmentValue.type === "CallExpression") {
					value = this.handleCall(assignmentValue);
				} else {
					try {
						value = this.evaluator.evaluate(assignmentValue, this.symbolTable);
					} catch (err) {
						throw this.runtimeError(err.message, assignmentValue);
					}
				}

				// Climb the prototype chain to find the correct scope
				let targetScope = this.symbolTable;
				while (
					targetScope !== null &&
					!Object.prototype.hasOwnProperty.call(targetScope, identifier)
				) {
					targetScope = Object.getPrototypeOf(targetScope);
				}

				if (targetScope) {
					targetScope[identifier] = value;
				} else {
					this.symbolTable[identifier] = value; // Fallback
				}
				return value;
			}

			case "PrintStatement": {
				if (!node.expression) {
					throw this.runtimeError(
						"PrintStatement must have an expression.",
						node,
					);
				}

				let value;

				if (node.expression.type === "CallExpression") {
					value = this.handleCall(node.expression);
				} else {
					try {
						value = this.evaluator.evaluate(node.expression, this.symbolTable);
					} catch (err) {
						throw this.runtimeError(err.message, node.expression);
					}
				}

				this.outputValues.push(value);
				return value;
			}

			case "BlockStatement": {
				const previous = this.symbolTable;

				this.symbolTable = Object.create(previous);

				let lastValue = null;

				try {
					for (const statement of node.body) {
						lastValue = this.execute(statement);
					}
				} finally {
					this.symbolTable = previous;
				}

				return lastValue;
			}

			case "IfStatement": {
				let condition;
				try {
					condition = this.evaluator.evaluate(node.condition, this.symbolTable);
				} catch (err) {
					throw this.runtimeError(err.message, node.condition);
				}

				if (condition) {
					return this.execute(node.thenBranch);
				}

				if (node.elseBranch) {
					return this.execute(node.elseBranch);
				}

				return null;
			}

			case "WhileStatement": {
				let iterations = 0;
				let lastValue = null;

				while (true) {
					let condition;
					try {
						condition = this.evaluator.evaluate(
							node.condition,
							this.symbolTable,
						);
					} catch (err) {
						throw this.runtimeError(err.message, node.condition);
					}

					if (!condition) break;
					iterations += 1;

					if (iterations > 10000) {
						throw this.runtimeError("Loop iteration limit exceeded.", node);
					}

					lastValue = this.execute(node.body);
				}

				return lastValue;
			}

			case "ExpressionStatement": {
				if (node.expression.type === "CallExpression") {
					return this.handleCall(node.expression);
				}

				try {
					return this.evaluator.evaluate(node.expression, this.symbolTable);
				} catch (err) {
					throw this.runtimeError(err.message, node.expression);
				}
			}

			default:
				throw this.runtimeError(`Unsupported node type '${node.type}'.`, node);
		}
	}

	getIdentifier(node) {
		const identifier =
			typeof node.identifier === "string" ? node.identifier : node.name;

		if (typeof identifier !== "string" || identifier.trim() === "") {
			throw this.runtimeError("Invalid variable name.", node);
		}

		return identifier;
	}

	handleCall(node) {
		const calleeName = node.callee.name;

		const args = node.arguments.map((arg) => {
			try {
				return this.evaluator.evaluate(arg, this.symbolTable);
			} catch (err) {
				throw this.runtimeError(err.message, arg);
			}
		});

		if (calleeName === "print") {
			const value = args[0];
			this.outputValues.push(value);
			return value;
		}

		if (calleeName === "input") {
			return this.userInput;
		}

		if (calleeName === "len") {
			const val = args[0];

			if (typeof val !== "string") {
				throw this.runtimeError("len() expects a string.", node);
			}

			return val.length;
		}

		if (calleeName === "toInt") {
			const val = args[0];

			if (typeof val === "number") {
				return val;
			}

			if (typeof val === "string") {
				const num = parseInt(val, 10);

				if (!isNaN(num)) {
					return num;
				}

				if (val.length === 1) {
					return val.charCodeAt(0);
				}
			}

			throw this.runtimeError("toInt() cannot convert value to integer.", node);
		}

		throw this.runtimeError(`Unknown function '${calleeName}'.`, node);
	}

	runtimeError(message, node) {
		const line = node?.loc?.start?.line ?? null;
		const column = node?.loc?.start?.column ?? null;

		let snippet = "";
		let pointer = "";

		if (line && this.sourceCode) {
			const lines = this.sourceCode.split("\n");
			snippet = lines[line - 1] || "";

			if (column) {
				pointer = " ".repeat(column - 1) + "^";
			}
		}

		return {
			phase: "runtime",
			message: message.replace("[Evaluator] ", ""),
			line,
			column,
			snippet,
			pointer,
		};
	}
}

module.exports = { Interpreter };
