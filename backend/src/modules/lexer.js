const TokenType = {
	LET: "LET",
	PRINT: "PRINT",
	IF: "IF",
	ELSE: "ELSE",
	WHILE: "WHILE",
	INPUT: "INPUT",
	TRUE: "TRUE",
	FALSE: "FALSE",

	NUMBER: "NUMBER",
	IDENTIFIER: "IDENTIFIER",
	STRING: "STRING",

	PLUS: "PLUS", // +
	MINUS: "MINUS", // -
	STAR: "STAR", // *
	SLASH: "SLASH", // /
	MOD: "MOD", // %
	ASSIGN: "ASSIGN", // =
	EQUAL_EQUAL: "EQUAL_EQUAL", // ==
	BANG_EQUAL: "BANG_EQUAL", // !=
	BANG: "BANG", // !
	AND: "AND", // &&
	OR: "OR", // ||
	LT: "LT", //
	GT: "GT", // >
	LTE: "LTE", // <=
	GTE: "GTE", // >=

	SEMICOLON: "SEMICOLON", // ;
	LPAREN: "LPAREN", // (
	RPAREN: "RPAREN", // )
	LBRACE: "LBRACE", // {
	RBRACE: "RBRACE", // }

	EOF: "EOF",
};

const KEYWORDS = {
	let: TokenType.LET,
	print: TokenType.PRINT,
	if: TokenType.IF,
	else: TokenType.ELSE,
	while: TokenType.WHILE,
	input: TokenType.INPUT,
	true: TokenType.TRUE,
	false: TokenType.FALSE,
};

class LexerError extends Error {
	constructor(message, line, column) {
		super(message);
		this.phase = "lexical";
		this.line = line;
		this.column = column;
	}
}

class Token {
	constructor(type, value, line, column) {
		this.type = type;
		this.value = value;
		this.line = line;
		this.column = column;
	}

	toString() {
		return `Token(${this.type}, ${this.value}, line:${this.line}, col:${this.column})`;
	}
}

class Lexer {
	constructor(source) {
		this.source = source;
		this.pos = 0;
		this.line = 1;
		this.column = 1;
		this.tokens = [];
	}

	current() {
		return this.source[this.pos];
	}

	peek(offset = 1) {
		return this.source[this.pos + offset];
	}

	advance() {
		const ch = this.source[this.pos++];
		if (ch === "\n") {
			this.line++;
			this.column = 1;
		} else {
			this.column++;
		}
		return ch;
	}

	isDigit(ch) {
		return ch >= "0" && ch <= "9";
	}
	isAlpha(ch) {
		return /[a-zA-Z_]/.test(ch);
	}
	isAlphaNum(ch) {
		return /[a-zA-Z0-9_]/.test(ch);
	}
	isWhitespace(ch) {
		return /[ \t\r\n]/.test(ch);
	}
	isAtEnd() {
		return this.pos >= this.source.length;
	}

	addToken(type, value, line, column) {
		this.tokens.push(new Token(type, value, line, column));
	}

	tokenize() {
		while (!this.isAtEnd()) {
			const startLine = this.line;
			const startColumn = this.column;
			this.scanToken(startLine, startColumn);
		}
		this.addToken(TokenType.EOF, null, this.line, this.column);
		return this.tokens;
	}

	scanToken(startLine, startColumn) {
		const ch = this.advance();

		if (this.isWhitespace(ch)) return;

		// to find comments in code
		if (ch === "/" && this.current() === "/") {
			while (!this.isAtEnd() && this.current() !== "\n") this.advance();
			return;
		}

		switch (ch) {
			case "+":
				this.addToken(TokenType.PLUS, ch, startLine, startColumn);
				break;
			case "-":
				this.addToken(TokenType.MINUS, ch, startLine, startColumn);
				break;
			case "*":
				this.addToken(TokenType.STAR, ch, startLine, startColumn);
				break;
			case "/":
				this.addToken(TokenType.SLASH, ch, startLine, startColumn);
				break;
			case "%":
				this.addToken(TokenType.MOD, ch, startLine, startColumn);
				break;
			case ";":
				this.addToken(TokenType.SEMICOLON, ch, startLine, startColumn);
				break;
			case "(":
				this.addToken(TokenType.LPAREN, ch, startLine, startColumn);
				break;
			case ")":
				this.addToken(TokenType.RPAREN, ch, startLine, startColumn);
				break;
			case "{":
				this.addToken(TokenType.LBRACE, ch, startLine, startColumn);
				break;
			case "}":
				this.addToken(TokenType.RBRACE, ch, startLine, startColumn);
				break;
			case '"':
				this.readString(startLine, startColumn);
				break;

			case "=":
				if (this.current() === "=") {
					this.advance();
					this.addToken(TokenType.EQUAL_EQUAL, "==", startLine, startColumn);
				} else {
					this.addToken(TokenType.ASSIGN, "=", startLine, startColumn);
				}
				break;

			case "!":
				if (this.current() === "=") {
					this.advance();
					this.addToken(TokenType.BANG_EQUAL, "!=", startLine, startColumn);
				} else {
					this.addToken(TokenType.BANG, "!", startLine, startColumn);
				}
				break;

			case "&":
				if (this.current() === "&") {
					this.advance();
					this.addToken(TokenType.AND, "&&", startLine, startColumn);
				} else {
					throw new LexerError("Unexpected character '&'", startLine, startColumn);
				}
				break;

			case "|":
				if (this.current() === "|") {
					this.advance();
					this.addToken(TokenType.OR, "||", startLine, startColumn);
				} else {
					throw new LexerError("Unexpected character '|'", startLine, startColumn);
				}
				break;

			case "<":
				if (this.current() === "=") {
					this.advance();
					this.addToken(TokenType.LTE, "<=", startLine, startColumn);
				} else {
					this.addToken(TokenType.LT, "<", startLine, startColumn);
				}
				break;

			case ">":
				if (this.current() === "=") {
					this.advance();
					this.addToken(TokenType.GTE, ">=", startLine, startColumn);
				} else {
					this.addToken(TokenType.GT, ">", startLine, startColumn);
				}
				break;

			default:
				if (this.isDigit(ch)) {
					this.readNumber(ch, startLine, startColumn);
				} else if (this.isAlpha(ch)) {
					this.readIdentifier(ch, startLine, startColumn);
				} else {
					throw new LexerError(`Unexpected character '${ch}'`, startLine, startColumn);
				}
		}
	}

	readNumber(first, startLine, startColumn) {
		let num = first;
		while (!this.isAtEnd() && this.isDigit(this.current())) {
			num += this.advance();
		}
		if (this.current() === "." && this.isDigit(this.peek())) {
			num += this.advance();
			while (!this.isAtEnd() && this.isDigit(this.current())) {
				num += this.advance();
			}
		}
		this.addToken(TokenType.NUMBER, parseFloat(num), startLine, startColumn);
	}

	readString(startLine, startColumn) {
		const valueStart = this.pos;
		while (!this.isAtEnd() && this.current() !== '"') {
			this.advance();
		}
		if (this.isAtEnd()) {
			throw new LexerError("Unterminated string literal", startLine, startColumn);
		}
		const value = this.source.slice(valueStart, this.pos);
		this.advance();
		this.addToken(TokenType.STRING, value, startLine, startColumn);
	}

	readIdentifier(first, startLine, startColumn) {
		let word = first;
		while (!this.isAtEnd() && this.isAlphaNum(this.current())) {
			word += this.advance();
		}
		const type = KEYWORDS[word] ?? TokenType.IDENTIFIER;
		this.addToken(type, word, startLine, startColumn);
	}
}

module.exports = { Lexer, Token, TokenType, LexerError };
