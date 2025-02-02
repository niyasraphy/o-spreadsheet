import { markdownLink } from "../helpers";
import { _t } from "../translation";
import { AddFunctionDescription, PrimitiveArgValue } from "../types";
import { arg } from "./arguments";
import { toString } from "./helpers";

// -----------------------------------------------------------------------------
// HYPERLINK
// -----------------------------------------------------------------------------
export const HYPERLINK: AddFunctionDescription = {
  description: _t("Creates a hyperlink in a cell."),
  args: [
    arg("url (string)", _t("The full URL of the link enclosed in quotation marks.")),
    arg(
      "link_label (string, optional)",
      _t("The text to display in the cell, enclosed in quotation marks.")
    ),
  ],
  returns: ["STRING"],
  compute: function (url: PrimitiveArgValue, linkLabel: PrimitiveArgValue): string {
    const processedUrl = toString(url).trim();
    const processedLabel = toString(linkLabel) || processedUrl;
    if (processedUrl === "") return processedLabel;
    return markdownLink(processedLabel, processedUrl);
  },
  isExported: true,
};
