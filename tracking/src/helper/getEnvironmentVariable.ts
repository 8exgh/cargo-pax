import _ from "lodash";
import {EnvironmentVariables} from "./environmentVariables";

export function getEnvironmentVariable(name: EnvironmentVariables, allowUndefined: boolean = false): string {
    const variable = process.env[name];
    if(!allowUndefined && _.isNil(variable)) {
        throw new Error("Environment variable undefined")
    }

    return variable;
}