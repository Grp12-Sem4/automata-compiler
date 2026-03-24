function evaluate(node, memory) 
{

    if (node.type === "Number") 
    {
        return node.value;
    }

    if (node.type === "Identifier") 
    {
        if (!(node.name in memory)) 
        {
            throw new Error(`Variable ${node.name} is not defined`);
        }
        return memory[node.name];
    }

    if (node.type === "BinaryExpression") 
    {
        const left = evaluate(node.left, memory);
        const right = evaluate(node.right, memory);
        switch (node.operator) 
        {
            case "+":
                return left + right;
            case "-":
                return left - right;
            case "*":
                return left * right;
            case "/":
                if(right===0)
                {
                    throw new Error('Division by zero');
                }
                return left / right;
            case "%":
                if(right===0)
                {
                    throw new Error('Modulo by zero');
                }
                return left % right;
            default:
                throw new Error(`Unknown operator ${node.operator}`);
        }
    }
    throw new Error(`Unknown node type: ${node.type}`);
}

module.exports = evaluate;