const evaluate = require("./evaluator");

const ast = 
{
    type: "BinaryExpression",
    operator: "+",
    left: { type: "Identifier", name: "x" },
    right: { type: "Number", value: 3 }
};

const memory = { x: 5,y:2 };

console.log(evaluate(ast, memory)); // should print 8

const ast2 =
{
    type: "Identifier",
    name:"y"
}
console.log(evaluate(ast2, memory)); // should print 2

const ast3={
    type: "BinaryExpression",
    operator: "*",
    left:
    {
        type: "BinaryExpression",
        operator: "+",
        left: { type: "Identifier", name: "x" },
        right: { type: "Number", value: 3 }
    },
    right: { type: "Identifier", name: "y" }
}
console.log(evaluate(ast3, memory)); // should print 16