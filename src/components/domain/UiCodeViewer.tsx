import React, { useEffect, useRef, useState } from "react";
import hljs from "highlight.js";
import { Copy, Check, FileCode, CheckCircle2 } from "lucide-react";
import { UiButton, UiBadge, UiFlex } from "@/components/ui";
import "./domain.css";

export interface UiCodeViewerProps {
  code: string;
  language?: string;
  filename?: string;
  judgementType?: string;
  title?: string;
  showLineNumbers?: boolean;
  copyable?: boolean;
  compareWithCode?: string;
  compareTitle?: string;
  className?: string;
}

export const UiCodeViewer: React.FC<UiCodeViewerProps> = ({
  code = "",
  language = "cpp",
  filename,
  judgementType,
  title,
  showLineNumbers = true,
  copyable = true,
  compareWithCode,
  compareTitle = "Solução Aceita (AC)",
  className = "",
}) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const compareRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
    if (compareRef.current) {
      hljs.highlightElement(compareRef.current);
    }
  }, [code, compareWithCode, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  const getJudgementBadge = (verdict?: string) => {
    if (!verdict) return null;
    const v = verdict.toUpperCase();
    if (v === "AC" || v === "CORRECT") return <UiBadge variant="success">Accepted (AC)</UiBadge>;
    if (v === "WA") return <UiBadge variant="danger">Wrong Answer (WA)</UiBadge>;
    if (v === "TLE") return <UiBadge variant="warning">Time Limit Exceeded (TLE)</UiBadge>;
    if (v === "RTE") return <UiBadge variant="danger">Run Time Error (RTE)</UiBadge>;
    if (v === "CE") return <UiBadge variant="neutral">Compile Error (CE)</UiBadge>;
    return <UiBadge variant="info">{verdict}</UiBadge>;
  };

  const renderSingleCode = (source: string, targetRef: React.RefObject<HTMLElement | null>) => (
    <div className="ui-code-pane">
      <div className="ui-code-content-wrapper">
        {showLineNumbers && (
          <div className="ui-code-line-numbers" aria-hidden="true">
            {source.split("\n").map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
        )}
        <pre className="ui-code-pre">
          <code ref={targetRef as any} className={`language-${language}`}>
            {source}
          </code>
        </pre>
      </div>
    </div>
  );

  return (
    <div className={`ui-code-viewer ${className}`}>
      <div className="ui-code-header">
        <UiFlex gap={8} align="center">
          <FileCode size={18} className="ui-code-file-icon" />
          <span className="ui-code-filename">{filename || title || "source_code"}</span>
          <span className="ui-code-lang-tag">{language}</span>
          {getJudgementBadge(judgementType)}
        </UiFlex>

        {copyable && (
          <UiButton
            size="sm"
            variant="dim"
            onClick={handleCopy}
            icon={copied ? <Check size={14} /> : <Copy size={14} />}
          >
            {copied ? "Copiado!" : "Copiar Código"}
          </UiButton>
        )}
      </div>

      {compareWithCode ? (
        <div className="ui-code-split-view">
          <div className="ui-code-split-col">
            <div className="ui-code-col-header">
              <span className="ui-code-col-title">{title || "Submissão do Aluno"}</span>
            </div>
            {renderSingleCode(code, codeRef)}
          </div>
          <div className="ui-code-split-col">
            <div className="ui-code-col-header ui-code-col-ac">
              <UiFlex gap={6} align="center">
                <CheckCircle2 size={16} className="text-success" />
                <span className="ui-code-col-title">{compareTitle}</span>
              </UiFlex>
            </div>
            {renderSingleCode(compareWithCode, compareRef)}
          </div>
        </div>
      ) : (
        renderSingleCode(code, codeRef)
      )}
    </div>
  );
};
