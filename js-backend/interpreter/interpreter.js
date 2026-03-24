const evaluate = require("../evaluator/evaluator");

function interpret(ast) {
    const memory = {};
    const output = [];

    try {
        if (!ast || ast.type !== "Program" || !Array.isArray(ast.body)) {
            throw new Error("Invalid AST: root must be Program with a body array");
        }

        for (const statement of ast.body) {
            executeStatement(statement, memory, output);
        }

        return {
            success: true,
            memory,
            output
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            memory,
            output
        };
    }
}

function executeStatement(node, memory, output) {
    if (!node || !node.type) {
        throw new Error("Invalid statement node");
    }

    switch (node.type) {
        case "VariableDeclaration": {
            if (typeof node.name !== "string" || node.name.trim() === "") {
                throw new Error("Invalid variable name");
            }

            if (!node.value) {
                throw new Error(`Variable '${node.name}' must have a value`);
            }

            if (node.name in memory) {
                throw new Error(`Variable '${node.name}' is already declared`);
            }

            const value = evaluate(node.value, memory);
            memory[node.name] = value;
            break;
        }

        case "PrintStatement": {
            if (!node.expression) {
                throw new Error("PrintStatement must have an expression");
            }

            const value = evaluate(node.expression, memory);
            output.push(value);
            break;
        }

        default:
            throw new Error(`Unknown statement type: ${node.type}`);
    }
}

module.exports = interpret;