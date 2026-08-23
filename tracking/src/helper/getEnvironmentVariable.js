import _ from "lodash";
export function getEnvironmentVariable(name, allowUndefined = false) {
    const variable = process.env[name];
    if (!allowUndefined && _.isNil(variable)) {
        throw new Error("Environment variable undefined");
    }
    return variable;
}
//# sourceMappingURL=getEnvironmentVariable.js.map