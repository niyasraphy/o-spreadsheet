import { Model, Spreadsheet } from "../../src";
import { setCellContent } from "../test_helpers/commands_helpers";
import { click, focusAndKeyDown, setInputValueAndTrigger } from "../test_helpers/dom_helper";
import { mountSpreadsheet, nextTick, spyDispatch } from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

let model: Model;

const selectors = {
  closeSidepanel: ".o-sidePanel .o-sidePanelClose",
  inputSearch:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-input-search-container input",
  inputReplace: ".o-sidePanel .o-find-and-replace .o-section:nth-child(3) input",
  previousButton:
    ".o-sidePanel .o-find-and-replace .o-sidePanelButtons:nth-of-type(2) .o-sidePanelButton:nth-child(1)",
  nextButton:
    ".o-sidePanel .o-find-and-replace .o-sidePanelButtons:nth-of-type(2) .o-sidePanelButton:nth-child(2)",
  replaceButton:
    ".o-sidePanel .o-find-and-replace .o-sidePanelButtons:nth-of-type(4) .o-sidePanelButton:nth-child(1)",
  replaceAllButton:
    ".o-sidePanel .o-find-and-replace .o-sidePanelButtons:nth-of-type(4) .o-sidePanelButton:nth-child(2)",
  checkBoxMatchingCase:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-far-item:nth-child(1) input",
  checkBoxExactMatch:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-far-item:nth-child(2) input",
  checkBoxSearchFormulas:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-far-item:nth-child(3) input",
  checkBoxReplaceFormulas:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(3) .o-far-item:nth-child(3) input",
};

describe("find and replace sidePanel component", () => {
  let fixture: HTMLElement;
  let parent: Spreadsheet;

  describe("Sidepanel", () => {
    beforeEach(async () => {
      ({ parent, model, fixture } = await mountSpreadsheet());
      parent.env.openSidePanel("FindAndReplace");
      await nextTick();
    });
    test("Can close the find and replace side panel", async () => {
      expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
      await click(fixture, selectors.closeSidepanel);
      expect(document.querySelectorAll(".o-sidePanel").length).toBe(0);
    });

    test("When opening sidepanel, focus will be on search input", async () => {
      expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
      await nextTick();
      expect(document.activeElement).toBe(document.querySelector(selectors.inputSearch));
    });

    test("disable next/previous/replace/replaceAll if searching on empty string", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "", "input");
      await nextTick();
      expect((document.querySelector(selectors.previousButton) as HTMLButtonElement).disabled).toBe(
        true
      );
      expect((document.querySelector(selectors.nextButton) as HTMLButtonElement).disabled).toBe(
        true
      );
      expect((document.querySelector(selectors.replaceButton) as HTMLButtonElement).disabled).toBe(
        true
      );
      expect(
        (document.querySelector(selectors.replaceAllButton) as HTMLButtonElement).disabled
      ).toBe(true);
    });
  });
  describe("basic search", () => {
    let dispatch;

    beforeEach(async () => {
      jest.useFakeTimers();
      ({ parent, model, fixture } = await mountSpreadsheet());
      parent.env.openSidePanel("FindAndReplace");
      await nextTick();
      dispatch = spyDispatch(parent);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("simple search", async () => {
      /** Fake timers use to control debounceSearch in Find and Replace */
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      jest.runOnlyPendingTimers();
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("UPDATE_SEARCH", {
        searchOptions: { exactMatch: false, matchCase: false, searchFormulas: false },
        toSearch: "1",
      });
    });

    test("clicking on next", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      await click(fixture, selectors.nextButton);
      expect(dispatch).toHaveBeenCalledWith("SELECT_SEARCH_NEXT_MATCH");
    });

    test("Going to next with Enter key", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      await focusAndKeyDown(selectors.inputSearch, { key: "Enter" });
      expect(dispatch).toHaveBeenCalledWith("SELECT_SEARCH_NEXT_MATCH");
    });

    test("clicking on previous", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      await click(fixture, selectors.previousButton);
      expect(dispatch).toHaveBeenCalledWith("SELECT_SEARCH_PREVIOUS_MATCH");
    });

    test("search on empty string", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "", "input");
      jest.runOnlyPendingTimers();
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("UPDATE_SEARCH", {
        searchOptions: { exactMatch: false, matchCase: false, searchFormulas: false },
        toSearch: "",
      });
    });
  });

  describe("search count match", () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      ({ parent, model, fixture } = await mountSpreadsheet());
      parent.env.openSidePanel("FindAndReplace");
      await nextTick();
    });

    afterEach(() => {
      jest.useRealTimers();
    });
    test("search match count is displayed", async () => {
      setCellContent(model, "A1", "Hello");
      expect(fixture.querySelector(".o-input-count")).toBeNull();
      setInputValueAndTrigger(selectors.inputSearch, "Hel", "input");
      jest.runOnlyPendingTimers();
      await nextTick();
      expect(fixture.querySelector(".o-input-count")?.innerHTML).toBe("1 / 1");
    });

    test("search match count is removed when input is cleared", async () => {
      setCellContent(model, "A1", "Hello");
      setInputValueAndTrigger(selectors.inputSearch, "Hel", "input");
      expect(fixture.querySelector(".o-input-count")).toBeNull();
      await nextTick();
      expect(fixture.querySelector(".o-input-count")?.innerHTML).toBe("0 / 0");

      jest.runOnlyPendingTimers();
      await nextTick();
      expect(fixture.querySelector(".o-input-count")?.innerHTML).toBe("1 / 1");
      setInputValueAndTrigger(selectors.inputSearch, "", "input");
      jest.runOnlyPendingTimers();
      await nextTick();
      expect(fixture.querySelector(".o-input-count")).toBeNull();
    });

    test("search without match displays no match count", async () => {
      expect(fixture.querySelector(".o-input-count")).toBeNull();
      setInputValueAndTrigger(selectors.inputSearch, "a search term", "input");
      jest.runOnlyPendingTimers();
      await nextTick();
      expect(fixture.querySelector(".o-input-count")?.innerHTML).toBe("0 / 0");
    });
  });

  describe("search options", () => {
    beforeEach(async () => {
      ({ parent, model, fixture } = await mountSpreadsheet());
      parent.env.openSidePanel("FindAndReplace");
      await nextTick();
    });
    test("Can search matching case", async () => {
      const dispatch = spyDispatch(parent);

      setInputValueAndTrigger(selectors.inputSearch, "Hell", "input");
      await click(fixture, selectors.checkBoxMatchingCase);
      expect(dispatch).toHaveBeenCalledWith("UPDATE_SEARCH", {
        searchOptions: { exactMatch: false, matchCase: true, searchFormulas: false },
        toSearch: "Hell",
      });
    });

    test("Can search matching entire cell", async () => {
      const dispatch = spyDispatch(parent);

      setInputValueAndTrigger(selectors.inputSearch, "Hell", "input");
      await click(fixture, selectors.checkBoxExactMatch);
      expect(dispatch).toHaveBeenCalledWith("UPDATE_SEARCH", {
        searchOptions: { exactMatch: true, matchCase: false, searchFormulas: false },
        toSearch: "Hell",
      });
    });

    test("can search in formulas", async () => {
      const dispatch = spyDispatch(parent);

      setInputValueAndTrigger(selectors.inputSearch, "Hell", "input");
      await click(fixture, selectors.checkBoxSearchFormulas);
      expect(dispatch).toHaveBeenCalledWith("UPDATE_SEARCH", {
        searchOptions: { exactMatch: false, matchCase: false, searchFormulas: true },
        toSearch: "Hell",
      });
    });

    test("search in formulas shows formulas", async () => {
      await click(document.querySelector(selectors.checkBoxSearchFormulas)!);
      expect(model.getters.shouldShowFormulas()).toBe(true);
    });

    test("search in formulas should not show formula after closing the sidepanel", async () => {
      await click(fixture, selectors.checkBoxSearchFormulas);
      await click(fixture, selectors.closeSidepanel);
      expect(model.getters.shouldShowFormulas()).toBe(false);
    });

    test("Setting show formula from f&r should retain its state even it's changed via topbar", async () => {
      model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
      await nextTick();
      expect(model.getters.shouldShowFormulas()).toBe(true);
      expect(
        (document.querySelector(selectors.checkBoxSearchFormulas) as HTMLInputElement).checked
      ).toBe(true);
      await click(fixture, selectors.checkBoxSearchFormulas);
      expect(model.getters.shouldShowFormulas()).toBe(false);
      expect(
        (document.querySelector(selectors.checkBoxSearchFormulas) as HTMLInputElement).checked
      ).toBe(false);
    });
  });
  describe("replace options", () => {
    beforeEach(async () => {
      ({ parent, model, fixture } = await mountSpreadsheet());
      parent.env.openSidePanel("FindAndReplace");
      await nextTick();
    });
    test("Can replace a simple text value", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch), "hello", "input");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "kikou", "input");
      const dispatch = spyDispatch(parent);
      await click(fixture, selectors.replaceButton);
      expect(dispatch).toHaveBeenCalledWith("REPLACE_SEARCH", { replaceWith: "kikou" });
    });

    test("Can replace a value in a formula", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch), "2", "input");
      await click(fixture, selectors.checkBoxSearchFormulas);
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "4", "input");
      const dispatch = spyDispatch(parent);
      await click(fixture, selectors.replaceButton);
      expect(dispatch).toHaveBeenCalledWith("REPLACE_SEARCH", { replaceWith: "4" });
    });

    test("formulas wont be modified if not looking in formulas or not modifying formulas", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch), "4", "input");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "2", "input");
      const dispatch = spyDispatch(parent);
      await click(fixture, selectors.replaceButton);
      expect(dispatch).toHaveBeenCalledWith("REPLACE_SEARCH", { replaceWith: "2" });
    });

    test("can replace all", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch), "hell", "input");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "kikou", "input");
      const dispatch = spyDispatch(parent);
      await click(fixture, selectors.replaceAllButton);
      expect(dispatch).toHaveBeenCalledWith("REPLACE_ALL_SEARCH", { replaceWith: "kikou" });
    });

    test("Can replace with Enter key", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "hell", "input");
      setInputValueAndTrigger(selectors.inputReplace, "kikou", "input");
      const dispatch = spyDispatch(parent);
      await focusAndKeyDown(selectors.inputReplace, { key: "Enter" });
      expect(dispatch).toHaveBeenCalledWith("REPLACE_SEARCH", { replaceWith: "kikou" });
    });
  });
});
