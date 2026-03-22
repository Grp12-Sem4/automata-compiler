const parseInput = require("./parser");

function getNextState(currentState, input,dfa) 
{
  return dfa.transitions[currentState]?.[input] || null;
}

function validateSequence(inputString,dfa)
{
    const sequence = parseInput(inputString);
    if (sequence.length === 0) 
    {
        return{
            steps: [],
            finalState: dfa.initialState,
            error: "Empty input",
            isValid: false,
            totalSteps: 0
        };
    }
    let currentState = dfa.initialState;
    let steps = [];
    let stepCount=1;
    for (let packet of sequence) 
    {
        let nextState = getNextState(currentState, packet,dfa);
        if (nextState === null) 
        {
            const allowedInputs = Object.keys(dfa.transitions[currentState] || {});
            steps.push
            ({
                step: stepCount,
                packet,
                from: currentState,
                to: null,
                valid: false,
                message: `${packet} not allowed in ${currentState}. Expected: ${allowedInputs.join(", ")}`
            });
            return{
                steps,
                finalState: currentState,
                error: `Invalid transition: ${packet} not allowed in ${currentState}. Expected: ${allowedInputs.join(", ")}`,
                isValid: false,
                totalSteps: steps.length
            };
        }
        steps.push
        ({
            step: stepCount,
            packet,
            from: currentState,
            to: nextState,
            valid: true,
            message: "Transition successful"
        });
        currentState = nextState;
        stepCount++;
    }
    return{
        steps,
        finalState: currentState,
        error: null,
        isValid: true,
        totalSteps: steps.length
    };
}

module.exports = validateSequence;