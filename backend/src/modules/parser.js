const { TokenType } = require("./lexer");

class Parser {
	constructor(tokens) {
		this.tokens = tokens;
		this.current = 0;
	}

	parse() {
		const body = [];

		while (!this.isAtEnd()) {
			body.push(this.statement());
		}

		return {
			type: "Program",
			body,
		};
	}

	statement() {
		if (this.match(TokenType.LET)) {
			return this.variableDeclaration();
		}

		if (this.match(TokenType.PRINT)) {
			return this.printStatement();
		}

		if (this.match(TokenType.IF)) {
			return this.ifStatement();
		}

		if (this.match(TokenType.WHILE)) {
			return this.whileStatement();
		}

		if (this.match(TokenType.LBRACE)) {
			return this.blockStatement();
		}

		if (this.check(TokenType.IDENTIFIER) && this.checkNext(TokenType.ASSIGN)) {
			return this.assignmentStatement();
		}

		return this.expressionStatement();
	}

	variableDeclaration() {
		const identifier = this.consume(
			TokenType.IDENTIFIER,
			"Expected variable name after 'let'.",
		);

		this.consume(TokenType.ASSIGN, "Expected '=' after variable name.");

		const initializer = this.expression();
		this.consume(
			TokenType.SEMICOLON,
			"Expected ';' after variable declaration.",
		);

		return {
			type: "VariableDeclaration",
			identifier: identifier.value,
			initializer,
		};
	}

	assignmentStatement() {
		const identifier = this.consume(
			TokenType.IDENTIFIER,
			"Expected variable name.",
		);
		this.consume(TokenType.ASSIGN, "Expected '=' in assignment.");
		const value = this.expression();
		this.consume(TokenType.SEMICOLON, "Expected ';' after assignment.");

		return {
			type: "AssignmentStatement",
			identifier: identifier.value,
			value,
		};
	}

	printStatement() {
		let expression;

		if (this.match(TokenType.LPAREN)) {
			expression = this.expression();
			this.consume(TokenType.RPAREN, "Expected ')' after print expression.");
		} else {
			expression = this.expression();
		}

		this.consume(TokenType.SEMICOLON, "Expected ';' after print statement.");

		return {
			type: "PrintStatement",
			expression,
		};
	}

	ifStatement() {
		this.consume(TokenType.LPAREN, "Expected '(' after 'if'.");
		const condition = this.expression();
		this.consume(TokenType.RPAREN, "Expected ')' after condition.");

		const thenBranch = this.statement();
		const elseBranch = this.match(TokenType.ELSE) ? this.statement() : null;

		return {
			type: "IfStatement",
			condition,
			thenBranch,
			elseBranch,
		};
	}

	whileStatement() {
		this.consume(TokenType.LPAREN, "Expected '(' after 'while'.");
		const condition = this.expression();
		this.consume(TokenType.RPAREN, "Expected ')' after condition.");

		return {
			type: "WhileStatement",
			condition,
			body: this.statement(),
		};
	}

	blockStatement() {
		const body = [];

		while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
			body.push(this.statement());
		}

		this.consume(TokenType.RBRACE, "Expected '}' after block.");

		return {
			type: "BlockStatement",
			body,
		};
	}

	expressionStatement() {
		const expression = this.expression();
		this.consume(TokenType.SEMICOLON, "Expected ';' after expression.");

		return {
			type: "ExpressionStatement",
			expression,
		};
	}

	expression() {
		return this.equality();
	}

	equality() {
		let expression = this.comparison();

		while (this.match(TokenType.EQ, TokenType.NEQ)) {
			const operator = this.previous().type;
			const right = this.comparison();
			expression = {
				type: "BinaryExpression",
				operator,
				left: expression,
				right,
			};
		}

		return expression;
	}

	comparison() {
		let expression = this.term();

		while (
			this.match(TokenType.GT, TokenType.GTE, TokenType.LT, TokenType.LTE)
		) {
			const operator = this.previous().type;
			const right = this.term();
			expression = {
				type: "BinaryExpression",
				operator,
				left: expression,
				right,
			};
		}

		return expression;
	}

	term() {
		let expression = this.factor();

		while (this.match(TokenType.PLUS, TokenType.MINUS)) {
			const operator = this.previous().type;
			const right = this.factor();
			expression = {
				type: "BinaryExpression",
				operator,
				left: expression,
				right,
			};
		}

		return expression;
	}

	factor() {
		let expression = this.unary();

		while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.MOD)) {
			const operator = this.previous().type;
			const right = this.unary();
			expression = {
				type: "BinaryExpression",
				operator,
				left: expression,
				right,
			};
		}

		return expression;
	}

	unary() {
		if (this.match(TokenType.MINUS)) {
			return {
				type: "UnaryExpression",
				operator: this.previous().type,
				argument: this.unary(),
			};
		}

		return this.primary();
	}

	primary() {
		if (this.match(TokenType.NUMBER)) {
			return {
				type: "Literal",
				value: this.previous().value,
			};
		}

		if (this.match(TokenType.IDENTIFIER)) {
			return {
				type: "Identifier",
				name: this.previous().value,
			};
		}

		if (this.match(TokenType.LPAREN)) {
			const expression = this.expression();
			this.consume(TokenType.RPAREN, "Expected ')' after expression.");
			return expression;
		}

		throw this.error(this.peek(), "Expected an expression.");
	}

	match(...types) {
		for (const type of types) {
			if (this.check(type)) {
				this.advance();
				return true;
			}
		}

		return false;
	}

	consume(type, message) {
		if (this.check(type)) {
			return this.advance();
		}

		throw this.error(this.peek(), message);
	}

	check(type) {
		if (this.isAtEnd()) {
			return false;
		}

		return this.peek().type === type;
	}

	checkNext(type) {
		if (this.current + 1 >= this.tokens.length) {
			return false;
		}

		return this.tokens[this.current + 1].type === type;
	}

	advance() {
		if (!this.isAtEnd()) {
			this.current += 1;
		}

		return this.previous();
	}

	isAtEnd() {
		return this.peek().type === TokenType.EOF;
	}

	peek() {
		return this.tokens[this.current];
	}

	previous() {
		return this.tokens[this.current - 1];
	}

	error(token, message) {
		const found = token ? token.type : "EOF";
		return new Error(
			`[Parser] Line ${token?.line ?? "?"}: ${message} Found ${found}.`,
		);
	}
}

module.exports = { Parser };
