class SymbolTable {
    constructor(parent = null) {
        this.parent = parent;
        this.symbols = new Map();
    }

    define(name, info) {
        if (this.symbols.has(name)) {
            return false;
        }

        this.symbols.set(name, info);
        return true;
    }

    resolve(name) {
        if (this.symbols.has(name)) {
            return this.symbols.get(name);
        }

        if (this.parent) {
            return this.parent.resolve(name);
        }

        return null;
    }

    existsInCurrentScope(name) {
        return this.symbols.has(name);
    }
}

module.exports = {
    SymbolTable
};