class Diagnostic {
    constructor({
        phase,
        message,
        line = null,
        column = null,
        lexeme = null,
        snippet = null,
        pointer = null
    }) {
        this.phase = phase;
        this.message = message;
        this.line = line;
        this.column = column;
        this.lexeme = lexeme;
        this.snippet = snippet;
        this.pointer = pointer;
    }
}

function getNodeLocation(node) {
    return {
        line: node?.loc?.start?.line ?? node?.line ?? null,
        column: node?.loc?.start?.column ?? node?.column ?? null
    };
}

function getSourceLine(sourceCode, line) {
    if (!sourceCode || !line) {
        return null;
    }

    return sourceCode.split(/\r?\n/)[line - 1] ?? null;
}

function createPointer(column) {
    if (!column || column < 1) {
        return null;
    }

    return `${" ".repeat(column - 1)}^`;
}

module.exports = {
    Diagnostic,
    getNodeLocation,
    getSourceLine,
    createPointer
};