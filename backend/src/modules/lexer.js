const TokenType = {
	LET: "LET",
	PRINT: "PRINT",
	IF: "IF",
	ELSE: "ELSE",
	WHILE: "WHILE",

	NUMBER: "NUMBER",
	IDENTIFIER: "IDENTIFIER",

	PLUS: "PLUS", // +
	MINUS: "MINUS", // -
	STAR: "STAR", // *
	SLASH: "SLASH", // /
	MOD: "MOD", // %
	ASSIGN: "ASSIGN", // =
	EQ: "EQ", // ==
	NEQ: "NEQ", // !=
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
};

class Token {
	constructor(type, value, line) {
		this.type = type;
		this.value = value;
		this.line = line;
	}

	toString() {
		return `Token(${this.type}, ${this.value}, line:${this.line})`;
	}
}

class Lexer {
	constructor(source) {
		this.source = source;
		this.pos = 0;
		this.line = 1;
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
		if (ch === "\n") this.line++;
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

	addToken(type, value) {
		this.tokens.push(new Token(type, value, this.line));
	}

	tokenize() {
		while (!this.isAtEnd()) {
			this.scanToken();
		}
		this.addToken(TokenType.EOF, null);
		return this.tokens;
	}

	scanToken() {
		const ch = this.advance();

		if (this.isWhitespace(ch)) return;

		if (ch === "/" && this.current() === "/") {
			while (!this.isAtEnd() && this.current() !== "\n") this.advance();
			return;
		}

		switch (ch) {
			case "+":
				this.addToken(TokenType.PLUS, ch);
				break;
			case "-":
				this.addToken(TokenType.MINUS, ch);
				break;
			case "*":
				this.addToken(TokenType.STAR, ch);
				break;
			case "/":
				this.addToken(TokenType.SLASH, ch);
				break;
			case "%":
				this.addToken(TokenType.MOD, ch);
				break;
			case ";":
				this.addToken(TokenType.SEMICOLON, ch);
				break;
			case "(":
				this.addToken(TokenType.LPAREN, ch);
				break;
			case ")":
				this.addToken(TokenType.RPAREN, ch);
				break;
			case "{":
				this.addToken(TokenType.LBRACE, ch);
				break;
			case "}":
				this.addToken(TokenType.RBRACE, ch);
				break;

			case "=":
				if (this.current() === "=") {
					this.advance();
					this.addToken(TokenType.EQ, "==");
				} else {
					this.addToken(TokenType.ASSIGN, "=");
				}
				break;

			case "!":
				if (this.current() === "=") {
					this.advance();
					this.addToken(TokenType.NEQ, "!=");
				} else {
					throw new Error(
						`[Lexer] Line ${this.line}: Unexpected character '!'`,
					);
				}
				break;

			case "<":
				if (this.current() === "=") {
					this.advance();
					this.addToken(TokenType.LTE, "<=");
				} else {
					this.addToken(TokenType.LT, "<");
				}
				break;

			case ">":
				if (this.current() === "=") {
					this.advance();
					this.addToken(TokenType.GTE, ">=");
				} else {
					this.addToken(TokenType.GT, ">");
				}
				break;

			default:
				if (this.isDigit(ch)) {
					this.readNumber(ch);
				} else if (this.isAlpha(ch)) {
					this.readIdentifier(ch);
				} else {
					throw new Error(
						`[Lexer] Line ${this.line}: Unknown character '${ch}'`,
					);
				}
		}
	}

	readNumber(first) {
		let num = first;
		while (!this.isAtEnd() && this.isDigit(this.current())) {
			num += this.advance();
		}
		if (this.current() === "." && this.isDigit(this.peek())) {
			num += this.advance(); // consume '.'
			while (!this.isAtEnd() && this.isDigit(this.current())) {
				num += this.advance();
			}
		}
		this.addToken(TokenType.NUMBER, parseFloat(num));
	}

	readIdentifier(first) {
		let word = first;
		while (!this.isAtEnd() && this.isAlphaNum(this.current())) {
			word += this.advance();
		}
		const type = KEYWORDS[word] ?? TokenType.IDENTIFIER;
		this.addToken(type, word);
	}
}

module.exports = { Lexer, Token, TokenType };
