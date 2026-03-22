function parseInput(inputString)
{
    if(!inputString || typeof inputString !== 'string')
    {
        return [];
    }
    inputString = inputString.trim();
    const tokens=inputString.split('->');
    const result= tokens.map(tokens=>tokens.trim()).filter(tokens=>tokens.length>0);
    return result;
}
module.exports=parseInput;