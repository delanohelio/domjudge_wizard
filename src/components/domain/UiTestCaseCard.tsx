import React from "react";
import { Copy, Trash2, Shield, Eye } from "lucide-react";
import { UiCard, UiFlex, UiBadge, UiButton, UiTextarea, UiTextInput } from "@/components/ui";
import { TestCase } from "@/types/domjudge";
import "./domain.css";

export interface UiTestCaseCardProps {
  index: number;
  testCase: TestCase;
  onUpdate: (updated: TestCase) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export const UiTestCaseCard: React.FC<UiTestCaseCardProps> = ({
  index,
  testCase,
  onUpdate,
  onDuplicate,
  onRemove,
}) => {
  const isSample = testCase.type === "sample";

  const toggleType = () => {
    onUpdate({
      ...testCase,
      type: isSample ? "secret" : "sample",
    });
  };

  return (
    <UiCard variant="subtle" className="ui-test-card animate-fade-in">
      <div className="ui-test-header">
        <UiFlex gap={8} align="center">
          <span className="ui-test-index">#{index + 1}</span>
          <UiBadge
            variant={isSample ? "info" : "neutral"}
            dot
            onClick={toggleType}
            className="cursor-pointer"
          >
            {isSample ? (
              <UiFlex gap={4} align="center">
                <Eye size={12} />
                <span>Sample (Público)</span>
              </UiFlex>
            ) : (
              <UiFlex gap={4} align="center">
                <Shield size={12} />
                <span>Secret (Oculto)</span>
              </UiFlex>
            )}
          </UiBadge>
        </UiFlex>

        <UiFlex gap={4}>
          <UiButton
            size="sm"
            variant="dim"
            onClick={onDuplicate}
            icon={<Copy size={14} />}
            title="Duplicar este teste"
          />
          <UiButton
            size="sm"
            variant="danger"
            onClick={onRemove}
            icon={<Trash2 size={14} />}
            title="Excluir este teste"
          />
        </UiFlex>
      </div>

      <div className="ui-test-io-grid">
        <UiTextarea
          label="Entrada (Input)"
          mono
          rows={3}
          value={testCase.input}
          onChange={(e) => onUpdate({ ...testCase, input: e.target.value })}
          placeholder="Exemplo de entrada..."
        />

        <UiTextarea
          label="Saída Esperada (Output)"
          mono
          rows={3}
          value={testCase.output}
          onChange={(e) => onUpdate({ ...testCase, output: e.target.value })}
          placeholder="Exemplo de saída esperada..."
        />
      </div>

      <div className="ui-test-desc">
        <UiTextInput
          size="sm"
          placeholder="Descrição opcional do caso de teste (ex: Teste de borda N=0)..."
          value={testCase.description || ""}
          onChange={(e) => onUpdate({ ...testCase, description: e.target.value })}
        />
      </div>
    </UiCard>
  );
};
