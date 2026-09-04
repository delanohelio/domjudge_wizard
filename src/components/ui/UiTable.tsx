import React, { ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { UiCheckbox } from "./UiCheckbox";
import { UiButton } from "./UiButton";
import "./ui.css";

export interface Column<T> {
  key: string;
  title: ReactNode;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface UiTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T | ((row: T) => string);
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  selectable?: boolean;
  selectedKeys?: Set<string> | string[];
  onSelectRow?: (key: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  loading?: boolean;
  emptyMessage?: ReactNode;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (newPage: number) => void;
    onPageSizeChange?: (newPageSize: number) => void;
    pageSizeOptions?: number[];
  };
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
}

export function UiTable<T>({
  columns,
  data = [],
  keyField,
  sortKey,
  sortDir = "asc",
  onSort,
  selectable = false,
  selectedKeys,
  onSelectRow,
  onSelectAll,
  loading = false,
  emptyMessage = "Nenhum registro encontrado.",
  pagination,
  rowClassName,
  onRowClick,
  className = "",
}: UiTableProps<T>) {
  const getKey = (row: T): string => {
    if (typeof keyField === "function") return keyField(row);
    return String(row[keyField] ?? "");
  };

  const selectedSet = selectedKeys instanceof Set ? selectedKeys : new Set(selectedKeys || []);
  const allSelected = data.length > 0 && data.every((row) => selectedSet.has(getKey(row)));
  const someSelected = data.some((row) => selectedSet.has(getKey(row))) && !allSelected;

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div className={`ui-table-container ${className}`}>
      <div className="ui-table-scroll-wrapper">
        <table className="ui-table">
          <thead className="ui-table-thead">
            <tr>
              {selectable && (
                <th className="ui-table-th ui-table-th-select" style={{ width: "42px" }}>
                  <UiCheckbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                    aria-label="Selecionar todos os itens da página"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width, textAlign: col.align || "left" }}
                    className={`ui-table-th ${col.sortable ? "ui-th-sortable" : ""} ${col.className || ""}`}
                    onClick={() => col.sortable && onSort && onSort(col.key)}
                  >
                    <div className="ui-th-content" style={{ justifyContent: col.align === "center" ? "center" : col.align === "right" ? "flex-end" : "flex-start" }}>
                      <span>{col.title}</span>
                      {col.sortable && (
                        <span className="ui-th-sort-icon">
                          {isSorted ? (
                            sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                          ) : (
                            <ChevronsUpDown size={14} className="ui-th-sort-idle" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="ui-table-tbody">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="ui-table-loading-td">
                  <div className="ui-table-loading-content">
                    <span className="ui-btn-spinner" />
                    <span>Carregando dados...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="ui-table-empty-td">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const rowKey = getKey(row);
                const isSelected = selectedSet.has(rowKey);
                const customCls = rowClassName ? rowClassName(row, idx) : "";

                return (
                  <tr
                    key={rowKey || idx}
                    className={`ui-table-row ${isSelected ? "ui-table-row-selected" : ""} ${customCls}`}
                    onClick={() => onRowClick && onRowClick(row, idx)}
                  >
                    {selectable && (
                      <td
                        className="ui-table-td ui-table-td-select"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <UiCheckbox
                          checked={isSelected}
                          onChange={(e) => onSelectRow && onSelectRow(rowKey, e.target.checked)}
                          aria-label={`Selecionar linha ${idx + 1}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const content = col.render ? col.render(row, idx) : (row as any)[col.key];
                      return (
                        <td
                          key={col.key}
                          style={{ textAlign: col.align || "left" }}
                          className={`ui-table-td ${col.className || ""}`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="ui-table-pagination">
          <div className="ui-pagination-stats">
            Mostrando {data.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total} registros
          </div>

          <div className="ui-pagination-controls">
            {pagination.onPageSizeChange && (
              <div className="ui-pagination-size-select">
                <span>Por página:</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => pagination.onPageSizeChange!(Number(e.target.value))}
                  className="ui-pagination-select-native"
                >
                  {(pagination.pageSizeOptions || [25, 50, 100, 250]).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <span className="ui-pagination-page-label">
              Página {pagination.page} de {totalPages}
            </span>

            <div className="ui-pagination-btn-group">
              <UiButton
                size="sm"
                variant="dim"
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                icon={<ChevronLeft size={16} />}
                title="Página Anterior"
              />
              <UiButton
                size="sm"
                variant="dim"
                disabled={pagination.page >= totalPages}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                icon={<ChevronRight size={16} />}
                title="Próxima Página"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
