const { TokenType } = require("./lexer");

class ParserError extends Error {
	constructor(message, token) {
		super(message);
		this.name = "ParserError";
		this.phase = "syntax";
		this.line = token?.line ?? null;
		this.column = token?.column ?? null;
		this.token = token?.type ?? "EOF";
		this.lexeme = token?.value ?? null;
	}
}

class Parser {
	constructor(tokens) {
		this.tokens = tokens;
		this.current = 0;
	}

	parse() {
		const body = [];
		const startToken = this.peek();

		while (!this.isAtEnd()) {
			body.push(this.statement());
		}

		const endToken = body.length > 0 ? this.getNodeEndToken(body[body.length - 1]) : startToken;
		return this.createNode("Program", { body }, startToken, endToken);
	}

	statement() {
		if (this.match(TokenType.LET)) {
			return this.variableDeclaration(this.previous());
		}

		if (this.match(TokenType.PRINT)) {
			return this.printStatement(this.previous());
		}

		if (this.match(TokenType.IF)) {
			return this.ifStatement(this.previous());
		}

		if (this.match(TokenType.WHILE)) {
			return this.whileStatement(this.previous());
		}

		if (this.match(TokenType.LBRACE)) {
			return this.blockStatement(this.previous());
		}

		if (this.check(TokenType.IDENTIFIER) && this.checkNext(TokenType.ASSIGN)) {
			return this.assignmentStatement();
		}

		return this.expressionStatement();
	}

	variableDeclaration(letToken) {
		const identifier = this.consume(
			TokenType.IDENTIFIER,
			"Expected variable name after 'let'.",
		);

		this.consume(TokenType.ASSIGN, "Expected '=' after variable name.");

		const initializer = this.expression();
		const semicolon = this.consume(
			TokenType.SEMICOLON,
			"Expected ';' after variable declaration.",
		);

		return this.createNode(
			"VariableDeclaration",
			{
				identifier: identifier.value,
				initializer,
			},
			letToken,
			semicolon,
		);
	}

	assignmentStatement() {
		const identifier = this.consume(
			TokenType.IDENTIFIER,
			"Expected variable name.",
		);
		this.consume(TokenType.ASSIGN, "Expected '=' in assignment.");
		const value = this.expression();
		const semicolon = this.consume(
			TokenType.SEMICOLON,
			"Expected ';' after assignment.",
		);

		return this.createNode(
			"AssignmentStatement",
			{
				identifier: identifier.value,
				value,
			},
			identifier,
			semicolon,
		);
	}

	printStatement(printToken) {
		this.consume(TokenType.LPAREN, "Expected '(' after 'print'.");
		const expression = this.expression();
		this.consume(TokenType.RPAREN, "Expected ')' after print expression.");
		const semicolon = this.consume(
			TokenType.SEMICOLON,
			"Expected ';' after print statement.",
		);

		return this.createNode(
			"PrintStatement",
			{ expression },
			printToken,
			semicolon,
		);
	}

	ifStatement(ifToken) {
		this.consume(TokenType.LPAREN, "Expected '(' after 'if'.");
		const condition = this.expression();
		this.consume(TokenType.RPAREN, "Expected ')' after condition.");

		const thenBranch = this.requireBlock("Expected '{' before if body.");
		const elseBranch = this.match(TokenType.ELSE)
			? this.requireBlock("Expected '{' before else body.")
			: null;

		return this.createNode(
			"IfStatement",
			{
				condition,
				thenBranch,
				elseBranch,
			},
			ifToken,
			elseBranch ? this.getNodeEndToken(elseBranch) : this.getNodeEndToken(thenBranch),
		);
	}

	whileStatement(whileToken) {
		this.consume(TokenType.LPAREN, "Expected '(' after 'while'.");
		const condition = this.expression();
		this.consume(TokenType.RPAREN, "Expected ')' after condition.");
		const body = this.requireBlock("Expected '{' before while body.");

		return this.createNode(
			"WhileStatement",
			{ condition, body },
			whileToken,
			this.getNodeEndToken(body),
		);
	}

	requireBlock(message) {
		const lbrace = this.consume(TokenType.LBRACE, message);
		return this.blockStatement(lbrace);
	}

	blockStatement(openBrace = this.previous()) {
		const body = [];

		while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
			body.push(this.statement());
		}

		const closeBrace = this.consume(TokenType.RBRACE, "Expected '}' after block.");

		return this.createNode("BlockStatement", { body }, openBrace, closeBrace);
	}

	expressionStatement() {
		const expression = this.expression();
		const semicolon = this.consume(
			TokenType.SEMICOLON,
			"Expected ';' after expression.",
		);

		return this.createNode(
			"ExpressionStatement",
			{ expression },
			this.getNodeStartToken(expression),
			semicolon,
		);
	}

	expression() {
		return this.logicalOr();
	}

	logicalOr() {
		let expression = this.logicalAnd();

		while (this.match(TokenType.OR)) {
			const operator = this.previous();
			const right = this.logicalAnd();
			expression = this.createNode(
				"LogicalExpression",
				{
					operator: operator.type,
					left: expression,
					right,
				},
				this.getNodeStartToken(expression),
				this.getNodeEndToken(right),
			);
		}

		return expression;
	}

	logicalAnd() {
		let expression = this.equality();

		while (this.match(TokenType.AND)) {
			const operator = this.previous();
			const right = this.equality();
			expression = this.createNode(
				"LogicalExpression",
				{
					operator: operator.type,
					left: expression,
					right,
				},
				this.getNodeStartToken(expression),
				this.getNodeEndToken(right),
			);
		}

		return expression;
	}

	equality() {
		let expression = this.comparison();

		while (this.match(TokenType.EQUAL_EQUAL, TokenType.BANG_EQUAL)) {
			const operator = this.previous();
			const right = this.comparison();
			expression = this.createNode(
				"BinaryExpression",
				{
					operator: operator.type,
					left: expression,
					right,
				},
				this.getNodeStartToken(expression),
				this.getNodeEndToken(right),
			);
		}

		return expression;
	}

	comparison() {
		let expression = this.term();

		while (
			this.match(TokenType.GT, TokenType.GTE, TokenType.LT, TokenType.LTE)
		) {
			const operator = this.previous();
			const right = this.term();
			expression = this.createNode(
				"BinaryExpression",
				{
					operator: operator.type,
					left: expression,
					right,
				},
				this.getNodeStartToken(expression),
				this.getNodeEndToken(right),
			);
		}

		return expression;
	}

	term() {
		let expression = this.factor();

		while (this.match(TokenType.PLUS, TokenType.MINUS)) {
			const operator = this.previous();
			const right = this.factor();
			expression = this.createNode(
				"BinaryExpression",
				{
					operator: operator.type,
					left: expression,
					right,
				},
				this.getNodeStartToken(expression),
				this.getNodeEndToken(right),
			);
		}

		return expression;
	}

	factor() {
		let expression = this.unary();

		while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.MOD)) {
			const operator = this.previous();
			const right = this.unary();
			expression = this.createNode(
				"BinaryExpression",
				{
					operator: operator.type,
					left: expression,
					right,
				},
				this.getNodeStartToken(expression),
				this.getNodeEndToken(right),
			);
		}

		return expression;
	}

	unary() {
		if (this.match(TokenType.MINUS, TokenType.BANG)) {
			const operator = this.previous();
			const argument = this.unary();
			return this.createNode(
				"UnaryExpression",
				{
					operator: operator.type,
					argument,
				},
				operator,
				this.getNodeEndToken(argument),
			);
		}

		return this.call();
	}

	call() {
		let expression = this.primary();

		while (this.match(TokenType.LPAREN)) {
			const args = [];

			if (!this.check(TokenType.RPAREN)) {
				args.push(this.expression());
			}

			const closeParen = this.consume(
				TokenType.RPAREN,
				"Expected ')' after function arguments.",
			);

			expression = this.createNode(
				"CallExpression",
				{
					callee: expression,
					arguments: args,
				},
				this.getNodeStartToken(expression),
				closeParen,
			);
		}

		return expression;
	}

	primary() {
		if (this.match(TokenType.FALSE)) {
			return this.literalNode(false, this.previous());
		}

		if (this.match(TokenType.TRUE)) {
			return this.literalNode(true, this.previous());
		}

		if (this.match(TokenType.NUMBER, TokenType.STRING)) {
			return this.literalNode(this.previous().value, this.previous());
		}

		if (this.match(TokenType.IDENTIFIER, TokenType.INPUT)) {
			const token = this.previous();
			return this.createNode(
				"Identifier",
				{ name: token.value },
				token,
				token,
			);
		}

		if (this.match(TokenType.LPAREN)) {
			const expression = this.expression();
			this.consume(TokenType.RPAREN, "Expected ')' after expression.");
			return expression;
		}

		throw this.error(this.peek(), "Expected an expression.");
	}

	literalNode(value, token) {
		return this.createNode("Literal", { value }, token, token);
	}

	createNode(type, properties, startToken, endToken = startToken) {
		const node = {
			type,
			...properties,
			loc: {
				start: {
					line: startToken?.line ?? null,
					column: startToken?.column ?? null,
				},
				end: this.getTokenEnd(endToken),
			},
		};

		Object.defineProperty(node, "startToken", {
			value: startToken,
			enumerable: false,
			writable: true,
		});
		Object.defineProperty(node, "endToken", {
			value: endToken,
			enumerable: false,
			writable: true,
		});

		return node;
	}

	getTokenEnd(token) {
		if (!token) {
			return { line: null, column: null };
		}

		const rawValue = token.value === null || token.value === undefined
			? token.type
			: token.value;
		const text =
			token.type === TokenType.STRING ? `"${rawValue}"` : String(rawValue);

		return {
			line: token.line,
			column: token.column + Math.max(text.length - 1, 0),
		};
	}

	getNodeStartToken(node) {
		return node?.startToken ?? this.peek();
	}

	getNodeEndToken(node) {
		return node?.endToken ?? this.previous();
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
		const found = token?.type ?? "EOF";
		return new ParserError(`${message} Found ${found}.`, token);
	}
}

module.exports = { Parser, ParserError };
