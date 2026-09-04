import React, { useRef, useMemo } from "react";
import { marked } from "marked";
import katex from "katex";
import {
  Bold,
  Italic,
  Code,
  Sigma,
  Table,
  FileSpreadsheet,
  FileText,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react";
import { UiButton, UiFlex } from "@/components/ui";
import { TestCase } from "@/types/domjudge";
import "./domain.css";

export interface UiMarkdownStudioProps {
  value: string;
  onChange: (val: string) => void;
  testCases?: TestCase[];
  className?: string;
}

export const UiMarkdownStudio: React.FC<UiMarkdownStudioProps> = ({
  value = "",
  onChange,
  testCases = [],
  className = "",
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper para inserir marcação no cursor
  const insertTextAtCursor = (prefix: string, suffix: string = "", defaultText: string = "") => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = el.value;
    const selected = current.slice(start, end) || defaultText;

    const updated = current.slice(0, start) + prefix + selected + suffix + current.slice(end);
    onChange(updated);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  // Atalhos de teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      insertTextAtCursor("**", "**", "texto em negrito");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      insertTextAtCursor("*", "*", "texto em itálico");
    } else if (e.key === "Tab") {
      e.preventDefault();
      insertTextAtCursor("  ");
    }
  };

  // Inserir Tabela de Exemplos baseada nos Casos de Teste Sample
  const handleInsertSampleTable = () => {
    const sampleTests = testCases.filter((t) => t.type === "sample");
    if (sampleTests.length === 0) {
      insertTextAtCursor(
        "\n### Exemplo de Entrada e Saída\n\n| Exemplo de Entrada | Exemplo de Saída |\n| :--- | :--- |\n| `4 2` | `6` |\n\n"
      );
      return;
    }

    let tableMd = "\n### Exemplo de Entrada e Saída\n\n| Exemplo de Entrada | Exemplo de Saída |\n| :--- | :--- |\n";
    sampleTests.forEach((t) => {
      const inEscaped = t.input.trim().replace(/\n/g, "<br>").replace(/\|/g, "\\|");
      const outEscaped = t.output.trim().replace(/\n/g, "<br>").replace(/\|/g, "\\|");
      tableMd += `| \`${inEscaped}\` | \`${outEscaped}\` |\n`;
    });
    tableMd += "\n";

    insertTextAtCursor(tableMd);
  };

  // Inserir Template Padrão ICPC / Maratona
  const handleInsertTemplate = () => {
    const template = `# Nome do Problema

Escreva aqui o enunciado detalhado do problema. Contextualize a história, os desafios e os objetivos que o participante deve solucionar.

## Entrada

A primeira linha da entrada contém um número inteiro $N$ ($1 \\le N \\le 10^5$), representando a quantidade de elementos. A segunda linha contém $N$ inteiros $A_i$ ($1 \\le A_i \\le 10^9$).

## Saída

Imprima uma única linha contendo a resposta do problema.

### Exemplo de Entrada e Saída

| Exemplo de Entrada | Exemplo de Saída |
| :--- | :--- |
| \`4\`<br>\`1 2 3 4\` | \`10\` |
`;
    onChange(template);
  };

  // Parser KaTeX + Markdown seguro
  const htmlPreview = useMemo(() => {
    if (!value) return "<p class='text-muted'>O preview da questão aparecerá aqui em tempo real...</p>";

    const placeholders: Array<{ id: string; html: string }> = [];
    let text = value;

    // 1. Equações em bloco $$...$$
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
      const id = `MATHBLOCK${placeholders.length}END`;
      try {
        const rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
        placeholders.push({ id, html: rendered });
      } catch (err) {
        placeholders.push({ id, html: `<span class="katex-error">${math}</span>` });
      }
      return id;
    });

    // 2. Equações inline $...$
    text = text.replace(/(?<!\\)\$([^\$\n]+?)\$/g, (_, math) => {
      const id = `MATHINLINE${placeholders.length}END`;
      try {
        const rendered = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
        placeholders.push({ id, html: rendered });
      } catch (err) {
        placeholders.push({ id, html: `<span class="katex-error">${math}</span>` });
      }
      return id;
    });

    // 3. Renderizar Markdown com marked
    let parsedHtml = marked.parse(text) as string;

    // 4. Restaurar placeholders KaTeX
    placeholders.forEach((p) => {
      parsedHtml = parsedHtml.replace(p.id, p.html);
    });

    return parsedHtml;
  }, [value]);

  return (
    <div className={`ui-md-studio ${className}`}>
      {/* Toolbar */}
      <div className="ui-md-toolbar">
        <UiFlex gap={4} wrap align="center">
          <UiButton
            size="sm"
            variant="dim"
            onClick={() => insertTextAtCursor("# ", "", "Título 1")}
            icon={<Heading1 size={15} />}
            title="Título 1"
          />
          <UiButton
            size="sm"
            variant="dim"
            onClick={() => insertTextAtCursor("## ", "", "Título 2")}
            icon={<Heading2 size={15} />}
            title="Título 2"
          />
          <UiButton
            size="sm"
            variant="dim"
            onClick={() => insertTextAtCursor("### ", "", "Título 3")}
            icon={<Heading3 size={15} />}
            title="Título 3"
          />

          <div className="ui-md-toolbar-sep" />

          <UiButton
            size="sm"
            variant="dim"
            onClick={() => insertTextAtCursor("**", "**", "negrito")}
            icon={<Bold size={15} />}
            title="Negrito (Ctrl+B)"
          />
          <UiButton
            size="sm"
            variant="dim"
            onClick={() => insertTextAtCursor("*", "*", "itálico")}
            icon={<Italic size={15} />}
            title="Itálico (Ctrl+I)"
          />
          <UiButton
            size="sm"
            variant="dim"
            onClick={() => insertTextAtCursor("`", "`", "código")}
            icon={<Code size={15} />}
            title="Código Inline"
          />

          <div className="ui-md-toolbar-sep" />

          <UiButton
            size="sm"
            variant="dim"
            onClick={() => insertTextAtCursor("$", "$", "O(N)")}
            icon={<Sigma size={15} />}
            title="Fórmula KaTeX Inline ($...$)"
          >
            $..$
          </UiButton>
          <UiButton
            size="sm"
            variant="dim"
            onClick={() => insertTextAtCursor("$$\n", "\n$$", "\\sum_{i=1}^n i")}
            icon={<Sigma size={15} />}
            title="Fórmula KaTeX Centralizada ($$...$$)"
          >
            $$..$$
          </UiButton>

          <div className="ui-md-toolbar-sep" />

          <UiButton
            size="sm"
            variant="dim"
            onClick={() =>
              insertTextAtCursor(
                "\n| Coluna 1 | Coluna 2 |\n| :--- | :--- |\n| Dado A | Dado B |\n\n"
              )
            }
            icon={<Table size={15} />}
            title="Inserir Tabela"
          />
          <UiButton
            size="sm"
            variant="secondary"
            onClick={handleInsertSampleTable}
            icon={<FileSpreadsheet size={15} />}
            title="Gera tabela de Entrada/Saída com base nos Samples cadastrados"
          >
            Tabela de Exemplos
          </UiButton>
          <UiButton
            size="sm"
            variant="dim"
            onClick={handleInsertTemplate}
            icon={<FileText size={15} />}
            title="Inserir Template Modelo ICPC/OBI"
          >
            Template ICPC
          </UiButton>
        </UiFlex>
      </div>

      {/* Split Workspace */}
      <div className="ui-md-split-pane">
        <div className="ui-md-pane ui-md-pane-editor">
          <div className="ui-md-pane-header">
            <span>Editor Markdown</span>
            <span className="text-muted text-xs">Suporta KaTeX $ e $$</span>
          </div>
          <textarea
            ref={textareaRef}
            className="ui-md-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite o enunciado do problema em Markdown..."
            spellCheck={false}
          />
        </div>

        <div className="ui-md-pane ui-md-pane-preview">
          <div className="ui-md-pane-header">
            <span>Preview Renderizado</span>
            <span className="text-muted text-xs">Visualização final</span>
          </div>
          <div
            className="ui-md-preview-body"
            dangerouslySetInnerHTML={{ __html: htmlPreview }}
          />
        </div>
      </div>
    </div>
  );
};
