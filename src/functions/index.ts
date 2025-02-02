import { Registry } from "../registries/registry";
import { _t } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  ArgValue,
  ComputeFunction,
  ComputeFunctionArg,
  EvalContext,
  FunctionDescription,
  FunctionReturn,
  isMatrix,
} from "../types";
import { addMetaInfoFromArg, validateArguments } from "./arguments";
import * as array from "./module_array";
import * as misc from "./module_custom";
import * as database from "./module_database";
import * as date from "./module_date";
import * as engineering from "./module_engineering";
import * as filter from "./module_filter";
import * as financial from "./module_financial";
import * as info from "./module_info";
import * as logical from "./module_logical";
import * as lookup from "./module_lookup";
import * as math from "./module_math";
import * as operators from "./module_operators";
import * as statistical from "./module_statistical";
import * as text from "./module_text";
import * as web from "./module_web";

export { arg } from "./arguments";

type Functions = { [functionName: string]: AddFunctionDescription };
type Category = { name: string; functions: Functions };
const categories: Category[] = [
  { name: _t("Array"), functions: array },
  { name: _t("Database"), functions: database },
  { name: _t("Date"), functions: date },
  { name: _t("Filter"), functions: filter },
  { name: _t("Financial"), functions: financial },
  { name: _t("Info"), functions: info },
  { name: _t("Lookup"), functions: lookup },
  { name: _t("Logical"), functions: logical },
  { name: _t("Math"), functions: math },
  { name: _t("Misc"), functions: misc },
  { name: _t("Operator"), functions: operators },
  { name: _t("Statistical"), functions: statistical },
  { name: _t("Text"), functions: text },
  { name: _t("Engineering"), functions: engineering },
  { name: _t("Web"), functions: web },
];

const functionNameRegex = /^[A-Z0-9\_\.]+$/;

//------------------------------------------------------------------------------
// Function registry
//------------------------------------------------------------------------------
class FunctionRegistry extends Registry<FunctionDescription> {
  mapping: {
    [key: string]: ComputeFunction<Arg, FunctionReturn>;
  } = {};

  add(name: string, addDescr: AddFunctionDescription) {
    name = name.toUpperCase();
    if (!functionNameRegex.test(name)) {
      throw new Error(
        _t(
          "Invalid function name %s. Function names can exclusively contain alphanumerical values separated by dots (.) or underscore (_)",
          name
        )
      );
    }
    const descr = addMetaInfoFromArg(addDescr);
    validateArguments(descr.args);

    function computeValueAndFormat(
      this: EvalContext,
      ...args: ComputeFunctionArg<Arg>[]
    ): FunctionReturn {
      const computeValue = descr.compute.bind(this);
      const computeFormat = descr.computeFormat ? descr.computeFormat.bind(this) : () => undefined;

      const value = computeValue(...extractArgValuesFromArgs(args));
      const format = computeFormat(...args);
      if (isMatrix(value)) {
        return {
          value,
          format,
        };
      }
      if (!isMatrix(format)) {
        return {
          value,
          format,
        };
      }
      throw new Error("A format matrix should never be associated with a scalar value");
    }

    this.mapping[name] = computeValueAndFormat;

    super.add(name, descr);
    return this;
  }
}

function extractArgValuesFromArgs(args: ComputeFunctionArg<Arg>[]): ComputeFunctionArg<ArgValue>[] {
  return args.map((arg) => {
    if (arg === undefined) {
      return undefined;
    }
    if (typeof arg === "function") {
      return () => arg()?.value;
    }
    return arg.value;
  });
}

export const functionRegistry = new FunctionRegistry();

for (let category of categories) {
  const fns = category.functions;
  for (let name in fns) {
    const addDescr = fns[name];
    addDescr.category = addDescr.category || category.name;
    name = name.replace(/_/g, ".");
    functionRegistry.add(name, { isExported: false, ...addDescr });
  }
}
