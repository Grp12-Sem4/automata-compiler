const interpret = require("./interpreter");

const programAst = {
    type: "Program",
    body: [
        {
            type: "VariableDeclaration",
            name: "x",
            value: {
                type: "Number",
                value: 5
            }
        },
        {
            type: "VariableDeclaration",
            name: "y",
            value: {
                type: "BinaryExpression",
                operator: "+",
                left: {
                    type: "Identifier",
                    name: "x"
                },
                right: {
                    type: "Number",
                    value: 3
                }
            }
        },
        {
            type: "PrintStatement",
            expression: {
                type: "Identifier",
                name: "y"
            }
        }
    ]
};

const result = interpret(programAst);
console.log(result);