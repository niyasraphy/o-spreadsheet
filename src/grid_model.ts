import { numberToLetters, toCartesian, toXC } from "./helpers";
import { compileExpression, applyOffset } from "./expressions";
import { functions } from "./functions";
import * as owl from "@odoo/owl";

const DEFAULT_CELL_WIDTH = 96;
const DEFAULT_CELL_HEIGHT = 26;
export const HEADER_HEIGHT = 26;
export const HEADER_WIDTH = 60;

const numberRegexp = /^-?\d+(,\d+)*(\.\d+(e\d+)?)?$/;

const fns = Object.fromEntries(Object.entries(functions).map(([k, v]) => [k, v.compute]));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Zone {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Style {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  align?: "left" | "right";
}

interface CellData {
  content: string;
  style?: number;
}

interface HeaderData {
  size?: number;
}

export interface GridData {
  colNumber: number;
  rowNumber: number;
  cells?: { [key: string]: CellData };
  styles?: { [key: number]: Style };
  merges?: string[];
  cols?: { [key: number]: HeaderData };
  rows?: { [key: number]: HeaderData };
}

export interface Cell extends CellData {
  col: number;
  row: number;
  error?: boolean;
  value: any;
  formula?: any;
  type: "formula" | "text" | "number";
}

export interface Row {
  cells: { [col: number]: Cell };
  bottom: number;
  top: number;
  name: string;
  size: number;
}

export interface Col {
  left: number;
  right: number;
  name: string;
  size: number;
}

export interface Merge extends Zone {
  id: number;
  topLeft: string;
}

// ---------------------------------------------------------------------------
// GridModel
// ---------------------------------------------------------------------------
export class GridModel extends owl.core.EventBus {
  // each row is described by: { top: ..., bottom: ..., name: '5', size: ... }
  rows: Row[] = [];
  // each col is described by: { left: ..., right: ..., name: 'B', size: ... }
  cols: Col[] = [];

  cells: { [key: string]: Cell } = {};

  styles: { [key: number]: Style } = {};

  merges: { [key: number]: Merge } = {};

  // width and height of the sheet zone (not just the visible part, and excluding
  // the row and col headers)
  width: number = 0;
  height: number = 0;
  clientWidth: number = 0;

  // offset between the visible zone and the full zone (take into account
  // headers)
  offsetX = 0;
  offsetY = 0;

  // coordinates of the visible and selected zone
  viewport: Zone = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0
  };
  selection: Zone = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0
  };
  activeCol = 0;
  activeRow = 0;

  isEditing = false;
  currentContent = "";

  clipBoard: any = {
    type: "empty"
  };
  nextId = 1;

  get selectedCell(): Cell {
    return this.getCell(this.activeCol, this.activeRow);
  }
  getCell(col: number, row: number): Cell {
    return this.rows[row].cells[col] || null;
  }

  getStyle(): Style {
    const cell = this.selectedCell;
    return cell && cell.style ? this.styles[cell.style] : {};
  }
  // ---------------------------------------------------------------------------
  // Constructor and private methods
  // ---------------------------------------------------------------------------
  constructor(data: GridData) {
    super();

    // setting up rows and columns
    this.addRowsCols(data);

    // styles
    this.styles = data.styles || {};
    for (let k in this.styles) {
      this.nextId = Math.max(k as any, this.nextId);
    }
    this.nextId++;

    // merges
    this.processMerges(data.merges || []);

    // cells
    for (let xc in data.cells) {
      this.addCell(xc, data.cells[xc]);
    }
    this.evaluateCells();
  }

  addRowsCols(data: GridData) {
    let current = 0;
    const rows = data.rows || {};
    const cols = data.cols || {};
    for (let i = 0; i < data.rowNumber; i++) {
      const size = rows[i] ? rows[i].size || 0 : DEFAULT_CELL_HEIGHT;
      const row = {
        top: current,
        bottom: current + size,
        size: size,
        name: String(i + 1),
        cells: {}
      };
      this.rows.push(row);
      current = row.bottom;
    }
    this.height = this.rows[this.rows.length - 1].bottom + 20; // 10 to have some space at the end

    current = 0;
    for (let i = 0; i < data.colNumber; i++) {
      const size = cols[i] ? cols[i].size || 0 : DEFAULT_CELL_WIDTH;
      const col = {
        left: current,
        right: current + size,
        size: size,
        name: numberToLetters(i)
      };
      this.cols.push(col);
      current = col.right;
    }
    this.width = this.cols[this.cols.length - 1].right + 10;
  }

  addCell(xc: string, cell) {
    const [col, row] = toCartesian(xc);
    const currentCell = this.cells[xc] || {};
    cell = Object.assign(currentCell, { col: col, row: row, content: "" }, cell);
    const content = cell.content;
    cell.type = content[0] === "=" ? "formula" : content.match(numberRegexp) ? "number" : "text";
    cell.error = false;
    if (cell.type === "formula") {
      try {
        cell.formula = compileExpression(cell.content.slice(1));
        cell.value = null;
      } catch (e) {
        cell.value = "#BAD_EXPR";
        cell.error = true;
      }
    } else if (cell.type === "text") {
      cell.value = cell.content;
    } else if (cell.type === "number") {
      // todo: move formatting in grid and formatters.js
      cell.value = +parseFloat(cell.content).toFixed(4);
    }
    this.cells[xc] = cell;
    this.rows[row].cells[col] = cell;
  }

  evaluateCells() {
    const cells = this.cells;
    const visited = {};
    const functions = Object.assign({ range }, fns);

    function computeValue(xc, cell: Cell) {
      if (cell.type !== "formula" || !cell.formula) {
        return;
      }
      if (xc in visited) {
        if (visited[xc] === null) {
          cell.value = "#CYCLE";
          cell.error = true;
        }
        return;
      }
      visited[xc] = null;
      try {
        // todo: move formatting in grid and formatters.js
        cell.value = +cell.formula(getValue, functions).toFixed(4);
        cell.error = false;
      } catch (e) {
        cell.value = cell.value || "#ERROR";
        cell.error = true;
      }
      visited[xc] = true;
    }

    function getValue(xc: string): any {
      const cell = cells[xc];
      if (!cell) {
        return 0;
      }
      computeValue(xc, cell);
      if (cell.error) {
        throw new Error("boom");
      }
      return cells[xc].value;
    }

    function range(v1: string, v2: string): any[] {
      const [c1, r1] = toCartesian(v1);
      const [c2, r2] = toCartesian(v2);
      const result: any[] = [];
      for (let c = c1; c <= c2; c++) {
        for (let r = r1; r <= r2; r++) {
          result.push(getValue(toXC(c, r)));
        }
      }
      return result;
    }

    for (let xc in cells) {
      computeValue(xc, cells[xc]);
    }
  }

  processMerges(mergeList: string[]) {
    for (let m of mergeList) {
      let id = this.nextId++;
      const [tl, br] = m.split(":");
      const [left, top] = toCartesian(tl);
      const [right, bottom] = toCartesian(br);
      this.merges[id] = {
        id,
        left,
        top,
        right,
        bottom,
        topLeft: tl
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  updateVisibleZone(width: number, height: number, offsetX: number, offsetY: number) {
    const { rows, cols, viewport } = this;
    this.clientWidth = width;

    viewport.bottom = rows.length - 1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].top <= offsetY) {
        viewport.top = i;
      }
      if (offsetY + height < rows[i].bottom) {
        viewport.bottom = i;
        break;
      }
    }
    viewport.right = cols.length - 1;
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].left <= offsetX) {
        viewport.left = i;
      }
      if (offsetX + width < cols[i].right) {
        viewport.right = i;
        break;
      }
    }
    this.offsetX = cols[viewport.left].left - HEADER_WIDTH;
    this.offsetY = rows[viewport.top].top - HEADER_HEIGHT;
  }

  selectCell(col: number, row: number) {
    this.stopEditing();
    this.selection.left = col;
    this.selection.right = col;
    this.selection.top = row;
    this.selection.bottom = row;
    this.activeCol = col;
    this.activeRow = row;
    this.trigger("update");
  }

  moveSelection(deltaX, deltaY, withShift = false) {
    const { activeCol, activeRow, selection } = this;
    if ((deltaY < 0 && activeRow === 0) || (deltaX < 0 && activeCol === 0)) {
      return;
    }
    if (withShift) {
      const { left, right, top, bottom } = selection;
      this.selection.left =
        left < activeCol || (left === right && deltaX < 0) ? left + deltaX : activeCol;
      this.selection.right =
        right > activeCol || (left === right && deltaX > 0) ? right + deltaX : activeCol;
      this.selection.top =
        top < activeRow || (top === bottom && deltaY < 0) ? top + deltaY : activeRow;
      this.selection.bottom =
        bottom > activeRow || (top === bottom && deltaY > 0) ? bottom + deltaY : activeRow;
    } else {
      this.selectCell(this.activeCol + deltaX, this.activeRow + deltaY);
    }
    this.trigger("update");
  }

  startEditing(str?: string) {
    if (!str) {
      str = this.selectedCell ? this.selectedCell.content : "";
    }
    this.isEditing = true;
    this.currentContent = str;
    this.trigger("update");
  }

  cancelEdition() {
    this.isEditing = false;
    this.trigger("update");
  }

  stopEditing() {
    if (this.isEditing) {
      const xc = toXC(this.selection.left, this.selection.top);
      this.addCell(xc, { content: this.currentContent });
      this.evaluateCells();
      this.currentContent = "";
      this.isEditing = false;
    }
  }

  deleteSelection() {
    for (let i = this.selection.left; i <= this.selection.right; i++) {
      for (let j = this.selection.top; j <= this.selection.bottom; j++) {
        const xc = toXC(i, j);
        if (xc in this.cells) {
          delete this.cells[xc];
          delete this.rows[j].cells[i];
        }
      }
    }
    this.evaluateCells();
    this.trigger("update");
  }

  updateSelection(col, row) {
    const { activeCol, activeRow } = this;
    this.selection.left = Math.min(activeCol, col);
    this.selection.top = Math.min(activeRow, row);
    this.selection.right = Math.max(activeCol, col);
    this.selection.bottom = Math.max(activeRow, row);
    this.trigger("update");
  }

  copySelection() {
    let { left, right, top, bottom } = this.selection;
    this.clipBoard = {
      type: "copy",
      left,
      right,
      top,
      bottom,
      cells: []
    };
    for (let i = left; i <= right; i++) {
      const vals: any[] = [];
      this.clipBoard.cells.push(vals);
      for (let j = top; j <= bottom; j++) {
        const cell = this.getCell(i, j);
        vals.push(cell ? Object.assign({}, cell) : null);
      }
    }
  }
  pasteSelection() {
    if (this.clipBoard.type === "empty") {
      return;
    }
    let col = this.selection.left;
    let row = this.selection.top;
    let { left, right, top, bottom } = this.clipBoard;
    const offsetX = col - left;
    const offsetY = row - top;
    for (let i = 0; i <= right - left; i++) {
      for (let j = 0; j <= bottom - top; j++) {
        const xc = toXC(col + i, row + j);
        const originCell = this.clipBoard.cells[i][j];
        const targetCell = this.getCell(col + i, row + j);
        if (originCell) {
          let content = originCell.content;
          if (originCell.type === "formula") {
            content = applyOffset(content, offsetX, offsetY);
          }
          this.addCell(xc, { content });
        }
        if (!originCell && targetCell) {
          this.addCell(xc, { content: "" });
        }
      }
    }

    this.evaluateCells();
    this.trigger("update");
  }

  setStyle(style) {
    for (let col = this.selection.left; col <= this.selection.right; col++) {
      for (let row = this.selection.top; row <= this.selection.bottom; row++) {
        this.setStyleToCell(col, row, style);
      }
    }
    this.trigger("update");
  }
  setStyleToCell(col, row, style) {
    const xc = toXC(col, row);
    const cell = this.getCell(col, row);
    const currentStyle = cell && cell.style ? this.styles[cell.style] : {};
    const nextStyle = Object.assign({}, currentStyle, style);
    const id = this.registerStyle(nextStyle);
    if (cell) {
      cell.style = id;
    } else {
      this.addCell(xc, { style: id });
    }
    this.trigger("update");
  }

  registerStyle(style) {
    const strStyle = stringify(style);
    for (let k in this.styles) {
      if (stringify(this.styles[k]) === strStyle) {
        return parseInt(k, 10);
      }
    }
    const id = this.nextId++;
    this.styles[id] = style;
    return id;
  }
}

function stringify(obj): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}
