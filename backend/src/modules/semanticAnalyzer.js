const { SymbolTable } = require("./symbolTable");
const {
    Diagnostic,
    getNodeLocation,
    getSourceLine,
    createPointer
} = require("./diagnostic");

class SemanticAnalyzer {
    constructor(sourceCode = "") {
        this.sourceCode = sourceCode;
        this.errors = [];
        this.currentScope = new SymbolTable();
    }

    analyze(ast) {
        this.visit(ast);

        return {
            success: this.errors.length === 0,
            errors: this.errors
        };
    }

    report(message, node, lexeme = null) {
        const { line, column } = getNodeLocation(node);

        this.errors.push(
            new Diagnostic({
                phase: "semantic",
                message,
                line,
                column,
                lexeme,
                snippet: getSourceLine(this.sourceCode, line),
                pointer: createPointer(column)
            })
        );
    }

    enterScope() {
        this.currentScope = new SymbolTable(this.currentScope);
    }

    exitScope() {
        if (this.currentScope.parent) {
            this.currentScope = this.currentScope.parent;
        }
    }

    visit(node) {
        if (!node) {
            return "unknown";
        }

        switch (node.type) {
            case "Program":
                return this.visitProgram(node);

            case "VariableDeclaration":
                return this.visitVariableDeclaration(node);

            case "AssignmentStatement":
                return this.visitAssignmentStatement(node);

            case "PrintStatement":
                return this.visitPrintStatement(node);

            case "BlockStatement":
                return this.visitBlockStatement(node);

            case "IfStatement":
                return this.visitIfStatement(node);

            case "WhileStatement":
                return this.visitWhileStatement(node);

            case "ExpressionStatement":
                return this.visit(node.expression);

            case "Literal":
                return this.getLiteralType(node.value);

            case "Identifier":
                return this.visitIdentifier(node);

            case "UnaryExpression":
                return this.visitUnaryExpression(node);

            case "BinaryExpression":
                return this.visitBinaryExpression(node);

            case "LogicalExpression":
                return this.visitLogicalExpression(node);

            case "CallExpression":
                return this.visitCallExpression(node);

            default:
                this.report(`Unsupported AST node type '${node.type}'.`, node);
                return "unknown";
        }
    }

    visitProgram(node) {
        for (const statement of node.body || []) {
            this.visit(statement);
        }

        return "program";
    }

    visitVariableDeclaration(node) {
        const name = node.identifier || node.name;

        if (!name) {
            this.report("Variable declaration is missing an identifier.", node);
            return "unknown";
        }

        const initializerType = this.visit(node.initializer || node.value);

        const inserted = this.currentScope.define(name, {
            name,
            type: initializerType,
            node
        });

        if (!inserted) {
            this.report(
                `Variable '${name}' is already declared in this scope.`,
                node,
                name
            );
        }

        return initializerType;
    }

    visitAssignmentStatement(node) {
        const name = node.identifier || node.name;

        if (!name) {
            this.report("Assignment is missing a variable name.", node);
            return "unknown";
        }

        const symbol = this.currentScope.resolve(name);

        if (!symbol) {
            this.report(
                `Cannot assign to undeclared variable '${name}'.`,
                node,
                name
            );

            if (node.value) {
                this.visit(node.value);
            }

            return "unknown";
        }

        const valueType = this.visit(node.value);

        if (
            symbol.type !== "unknown" &&
            valueType !== "unknown" &&
            symbol.type !== valueType
        ) {
            this.report(
                `Cannot assign value of type '${valueType}' to variable '${name}' of type '${symbol.type}'.`,
                node,
                name
            );
        }

        return valueType;
    }

    visitPrintStatement(node) {
        return this.visit(node.expression);
    }

    visitBlockStatement(node) {
        this.enterScope();

        for (const statement of node.body || []) {
            this.visit(statement);
        }

        this.exitScope();

        return "block";
    }

    visitIfStatement(node) {
        const conditionType = this.visit(node.condition);

        if (conditionType !== "boolean" && conditionType !== "unknown") {
            this.report(
                `If condition must be boolean, but got '${conditionType}'.`,
                node.condition
            );
        }

        this.visit(node.thenBranch);

        if (node.elseBranch) {
            this.visit(node.elseBranch);
        }

        return "if";
    }

    visitWhileStatement(node) {
        const conditionType = this.visit(node.condition);

        if (conditionType !== "boolean" && conditionType !== "unknown") {
            this.report(
                `While condition must be boolean, but got '${conditionType}'.`,
                node.condition
            );
        }

        this.visit(node.body);

        return "while";
    }

    visitIdentifier(node) {
        const name = node.name;

        const symbol = this.currentScope.resolve(name);

        if (!symbol) {
            this.report(
                `Variable '${name}' is used before declaration.`,
                node,
                name
            );

            return "unknown";
        }

        return symbol.type || "unknown";
    }

    visitUnaryExpression(node) {
        const operator = this.normalizeOperator(node.operator);
        const argumentType = this.visit(node.argument || node.operand);

        if (operator === "-") {
            if (argumentType !== "number" && argumentType !== "unknown") {
                this.report(
                    `Unary '-' requires a number operand, but got '${argumentType}'.`,
                    node
                );
            }

            return "number";
        }

        if (operator === "!") {
            if (argumentType !== "boolean" && argumentType !== "unknown") {
                this.report(
                    `Logical '!' requires a boolean operand, but got '${argumentType}'.`,
                    node
                );
            }

            return "boolean";
        }

        this.report(`Unsupported unary operator '${operator}'.`, node);
        return "unknown";
    }

    visitBinaryExpression(node) {
        const operator = this.normalizeOperator(node.operator);
        const leftType = this.visit(node.left);
        const rightType = this.visit(node.right);

        if (operator === "+") {
            if (leftType === "number" && rightType === "number") {
                return "number";
            }

            if (leftType === "string" && rightType === "string") {
                return "string";
            }

            if (leftType !== "unknown" && rightType !== "unknown") {
                this.report(
                    "Operator '+' requires both operands to be numbers or both operands to be strings.",
                    node
                );
            }

            return "unknown";
        }

        if (["-", "*", "/", "%"].includes(operator)) {
            this.requireNumberOperands(node, leftType, rightType, operator);
            return "number";
        }

        if ([">", ">=", "<", "<="].includes(operator)) {
            this.requireNumberOperands(node, leftType, rightType, operator);
            return "boolean";
        }

        if (["==", "!="].includes(operator)) {
            if (
                leftType !== "unknown" &&
                rightType !== "unknown" &&
                leftType !== rightType
            ) {
                this.report(
                    `Cannot compare '${leftType}' with '${rightType}'.`,
                    node
                );
            }

            return "boolean";
        }

        this.report(`Unsupported binary operator '${operator}'.`, node);
        return "unknown";
    }

    visitLogicalExpression(node) {
        const operator = this.normalizeOperator(node.operator);
        const leftType = this.visit(node.left);
        const rightType = this.visit(node.right);

        if (leftType !== "boolean" && leftType !== "unknown") {
            this.report(
                `Left operand of '${operator}' must be boolean, but got '${leftType}'.`,
                node.left
            );
        }

        if (rightType !== "boolean" && rightType !== "unknown") {
            this.report(
                `Right operand of '${operator}' must be boolean, but got '${rightType}'.`,
                node.right
            );
        }

        return "boolean";
    }

    visitCallExpression(node) {
        const functionName =
            node.name ||
            node.callee?.name ||
            node.callee;

        const args = node.arguments || node.args || [];

        if (functionName === "input") {
            if (args.length !== 0) {
                this.report("input() does not accept arguments.", node, functionName);
            }

            return "string";
        }

        if (functionName === "len") {
            if (args.length !== 1) {
                this.report("len() expects exactly one argument.", node, functionName);
                return "number";
            }

            const argType = this.visit(args[0]);

            if (argType !== "string" && argType !== "unknown") {
                this.report(
                    `len() expects a string argument, but got '${argType}'.`,
                    node,
                    functionName
                );
            }

            return "number";
        }

        if (functionName === "toInt") {
            if (args.length !== 1) {
                this.report("toInt() expects exactly one argument.", node, functionName);
                return "number";
            }

            const argType = this.visit(args[0]);

            if (
                argType !== "string" &&
                argType !== "number" &&
                argType !== "unknown"
            ) {
                this.report(
                    `toInt() expects a string or number argument, but got '${argType}'.`,
                    node,
                    functionName
                );
            }

            return "number";
        }

        this.report(`Unknown function '${functionName}'.`, node, functionName);
        return "unknown";
    }

    requireNumberOperands(node, leftType, rightType, operator) {
        if (leftType !== "number" && leftType !== "unknown") {
            this.report(
                `Left operand of '${operator}' must be number, but got '${leftType}'.`,
                node.left
            );
        }

        if (rightType !== "number" && rightType !== "unknown") {
            this.report(
                `Right operand of '${operator}' must be number, but got '${rightType}'.`,
                node.right
            );
        }
    }

    getLiteralType(value) {
        if (typeof value === "number") {
            return "number";
        }

        if (typeof value === "string") {
            return "string";
        }

        if (typeof value === "boolean") {
            return "boolean";
        }

        return "unknown";
    }

    normalizeOperator(operator) {
        const operatorMap = {
            PLUS: "+",
            MINUS: "-",
            STAR: "*",
            SLASH: "/",
            MOD: "%",
            PERCENT: "%",
            GREATER: ">",
            GT: ">",
            GREATER_EQUAL: ">=",
            GTE: ">=",
            LESS: "<",
            LT: "<",
            LESS_EQUAL: "<=",
            LTE: "<=",
            EQUAL_EQUAL: "==",
            BANG_EQUAL: "!=",
            AND_AND: "&&",
            OR_OR: "||",
            BANG: "!"
        };

        return operatorMap[operator] || operator;
    }
}

module.exports = {
    SemanticAnalyzer
};