import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef } from "react";

interface XmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorOffsetChange?: (offset: number) => void;
}

interface Disposable {
  dispose: () => void;
}

export function XmlEditor({
  value,
  onChange,
  onCursorOffsetChange,
}: XmlEditorProps) {
  const cursorDisposableRef = useRef<Disposable | null>(null);

  useEffect(
    () => () => {
      cursorDisposableRef.current?.dispose();
    },
    [],
  );

  const handleMount = useCallback<OnMount>(
    (editor, monaco) => {
      monaco.editor.defineTheme("drs-light", {
        base: "vs",
        inherit: true,
        rules: [
          { token: "tag.xml", foreground: "3C7F75" },
          { token: "attribute.name.xml", foreground: "7B6B9B" },
          { token: "attribute.value.xml", foreground: "A36C39" },
          { token: "delimiter.xml", foreground: "8B9F93" },
        ],
        colors: {
          "editor.background": "#FFFFFF",
          "editor.foreground": "#40574A",
          "editorLineNumber.foreground": "#ABB9B0",
          "editorLineNumber.activeForeground": "#36806A",
          "editor.lineHighlightBackground": "#F7FAF8",
          "editor.selectionBackground": "#DCEEE5",
          "editorIndentGuide.background1": "#EEF2EF",
        },
      });
      monaco.editor.setTheme("drs-light");
      cursorDisposableRef.current?.dispose();
      if (!onCursorOffsetChange) return;

      const emitCursorOffset = () => {
        const model = editor.getModel();
        const position = editor.getPosition();
        if (!model || !position) return;
        onCursorOffsetChange(model.getOffsetAt(position));
      };

      emitCursorOffset();
      cursorDisposableRef.current =
        editor.onDidChangeCursorPosition(emitCursorOffset);
    },
    [onCursorOffsetChange],
  );

  return (
    <Editor
      height="100%"
      language="xml"
      theme="drs-light"
      value={value}
      onMount={handleMount}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      options={{
        minimap: { enabled: false },
        fontSize: 12,
        fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
        lineHeight: 23,
        padding: { top: 16, bottom: 16 },
        renderLineHighlight: "line",
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        folding: true,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        lineNumbersMinChars: 3,
        scrollBeyondLastLine: false,
        tabSize: 2,
        wordWrap: "on",
        automaticLayout: true,
      }}
    />
  );
}
