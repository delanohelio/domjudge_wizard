import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { UiTable, UiBadge, Column } from "@/components/ui";
import { UserAccount } from "@/types/domjudge";
import "./domain.css";

export interface ParsedBatchUser extends UserAccount {
  rowNumber: number;
  errors: string[];
  isValid: boolean;
}

export interface UiBatchUserPreviewProps {
  users: ParsedBatchUser[];
  className?: string;
}

export const UiBatchUserPreview: React.FC<UiBatchUserPreviewProps> = ({ users = [], className = "" }) => {
  const columns: Column<ParsedBatchUser>[] = [
    {
      key: "rowNumber",
      title: "#",
      width: "48px",
      align: "center",
      render: (row) => <span className="text-muted text-xs">#{row.rowNumber}</span>,
    },
    {
      key: "username",
      title: "Usuário",
      render: (row) => (
        <span className="font-mono font-bold text-brand">{row.username}</span>
      ),
    },
    {
      key: "name",
      title: "Nome Completo",
      render: (row) => <span>{row.name || "-"}</span>,
    },
    {
      key: "email",
      title: "Email",
      render: (row) => <span className="text-muted text-xs">{row.email || "-"}</span>,
    },
    {
      key: "team_id",
      title: "Time",
      render: (row) => <span>{row.team_id || "-"}</span>,
    },
    {
      key: "category_id",
      title: "Categoria",
      render: (row) => (
        <UiBadge variant="neutral" size="sm">
          {row.category_id || "Geral"}
        </UiBadge>
      ),
    },
    {
      key: "roles",
      title: "Papéis",
      render: (row) => (
        <div className="flex gap-1 flex-wrap">
          {row.roles.map((r) => (
            <UiBadge key={r} variant={r === "admin" ? "danger" : r === "jury" ? "warning" : "info"} size="sm">
              {r}
            </UiBadge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      title: "Validação",
      render: (row) => {
        if (row.isValid) {
          return (
            <UiBadge variant="success" size="sm" dot>
              Pronto
            </UiBadge>
          );
        }
        return (
          <div className="flex flex-col gap-1">
            {row.errors.map((err, i) => (
              <span key={i} className="text-danger text-xs flex items-center gap-1">
                <AlertTriangle size={12} /> {err}
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  const validCount = users.filter((u) => u.isValid).length;
  const invalidCount = users.length - validCount;

  return (
    <div className={`ui-batch-preview ${className}`}>
      <div className="ui-batch-preview-header">
        <div className="flex items-center gap-3">
          <span className="font-bold">Pré-visualização do Lote</span>
          <UiBadge variant="info" size="sm">
            {users.length} detectados
          </UiBadge>
          {validCount > 0 && (
            <UiBadge variant="success" size="sm">
              <CheckCircle2 size={12} /> {validCount} válidos
            </UiBadge>
          )}
          {invalidCount > 0 && (
            <UiBadge variant="danger" size="sm">
              <AlertTriangle size={12} /> {invalidCount} com erros
            </UiBadge>
          )}
        </div>
      </div>

      <UiTable
        columns={columns}
        data={users}
        keyField="rowNumber"
        emptyMessage="Cole os dados CSV ou TSV acima para visualizar o lote..."
      />
    </div>
  );
};
