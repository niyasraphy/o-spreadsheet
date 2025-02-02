import { _t } from "../translation";
import { CommandResult } from "../types/index";

export const CfTerms = {
  Errors: {
    [CommandResult.InvalidRange]: _t("The range is invalid"),
    [CommandResult.FirstArgMissing]: _t("The argument is missing. Please provide a value"),
    [CommandResult.SecondArgMissing]: _t("The second argument is missing. Please provide a value"),
    [CommandResult.MinNaN]: _t("The minpoint must be a number"),
    [CommandResult.MidNaN]: _t("The midpoint must be a number"),
    [CommandResult.MaxNaN]: _t("The maxpoint must be a number"),
    [CommandResult.ValueUpperInflectionNaN]: _t("The first value must be a number"),
    [CommandResult.ValueLowerInflectionNaN]: _t("The second value must be a number"),
    [CommandResult.MinBiggerThanMax]: _t("Minimum must be smaller then Maximum"),
    [CommandResult.MinBiggerThanMid]: _t("Minimum must be smaller then Midpoint"),
    [CommandResult.MidBiggerThanMax]: _t("Midpoint must be smaller then Maximum"),
    [CommandResult.LowerBiggerThanUpper]: _t(
      "Lower inflection point must be smaller than upper inflection point"
    ),
    [CommandResult.MinInvalidFormula]: _t("Invalid Minpoint formula"),
    [CommandResult.MaxInvalidFormula]: _t("Invalid Maxpoint formula"),
    [CommandResult.MidInvalidFormula]: _t("Invalid Midpoint formula"),
    [CommandResult.ValueUpperInvalidFormula]: _t("Invalid upper inflection point formula"),
    [CommandResult.ValueLowerInvalidFormula]: _t("Invalid lower inflection point formula"),
    [CommandResult.EmptyRange]: _t("A range needs to be defined"),
    Unexpected: _t("The rule is invalid for an unknown reason"),
  },
  ColorScale: _t("Color scale"),
  IconSet: _t("Icon set"),
};

export const CellIsOperators = {
  IsEmpty: _t("Is empty"),
  IsNotEmpty: _t("Is not empty"),
  ContainsText: _t("Contains"),
  NotContains: _t("Does not contain"),
  BeginsWith: _t("Starts with"),
  EndsWith: _t("Ends with"),
  Equal: _t("Is equal to"),
  NotEqual: _t("Is not equal to"),
  GreaterThan: _t("Is greater than"),
  GreaterThanOrEqual: _t("Is greater than or equal to"),
  LessThan: _t("Is less than"),
  LessThanOrEqual: _t("Is less than or equal to"),
  Between: _t("Is between"),
  NotBetween: _t("Is not between"),
};

export const ChartTerms = {
  Series: _t("Series"),
  Errors: {
    Unexpected: _t("The chart definition is invalid for an unknown reason"),
    // BASIC CHART ERRORS (LINE | BAR | PIE)
    [CommandResult.InvalidDataSet]: _t("The dataset is invalid"),
    [CommandResult.InvalidLabelRange]: _t("Labels are invalid"),
    // SCORECARD CHART ERRORS
    [CommandResult.InvalidScorecardKeyValue]: _t("The key value is invalid"),
    [CommandResult.InvalidScorecardBaseline]: _t("The baseline value is invalid"),
    // GAUGE CHART ERRORS
    [CommandResult.InvalidGaugeDataRange]: _t("The data range is invalid"),
    [CommandResult.EmptyGaugeRangeMin]: _t("A minimum range limit value is needed"),
    [CommandResult.GaugeRangeMinNaN]: _t("The minimum range limit value must be a number"),
    [CommandResult.EmptyGaugeRangeMax]: _t("A maximum range limit value is needed"),
    [CommandResult.GaugeRangeMaxNaN]: _t("The maximum range limit value must be a number"),
    [CommandResult.GaugeRangeMinBiggerThanRangeMax]: _t(
      "Minimum range limit must be smaller than maximum range limit"
    ),
    [CommandResult.GaugeLowerInflectionPointNaN]: _t(
      "The lower inflection point value must be a number"
    ),
    [CommandResult.GaugeUpperInflectionPointNaN]: _t(
      "The upper inflection point value must be a number"
    ),
  },
};

export const CustomCurrencyTerms = {
  Custom: _t("Custom"),
};

export const MergeErrorMessage = _t(
  "Merged cells are preventing this operation. Unmerge those cells and try again."
);

export const SplitToColumnsTerms = {
  Errors: {
    Unexpected: _t("Cannot split the selection for an unknown reason"),
    [CommandResult.NoSplitSeparatorInSelection]: _t(
      "There is no match for the selected separator in the selection"
    ),
    [CommandResult.MoreThanOneColumnSelected]: _t(
      "Only a selection from a single column can be split"
    ),
    [CommandResult.SplitWillOverwriteContent]: _t("Splitting will overwrite existing content"),
  },
};
