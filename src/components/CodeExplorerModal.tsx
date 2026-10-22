import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode, Folder, Terminal } from 'lucide-react';
import { PYTHON_PROJECT_FILES, downloadProjectZip } from '../services/pythonProjectGenerator';

interface CodeExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeExplorerModal: React.FC<CodeExplorerModalProps> = ({ isOpen, onClose }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const currentFile = PYTHON_PROJECT_FILES[selectedFileIndex] || PYTHON_PROJECT_FILES[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadProjectZip();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 sm:p-6">
      <div className="w-full max-w-5xl h-[85vh] rounded-xl border border-slate-800 bg-[#0f172a] shadow-2xl flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b0f17]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Código Fuente Windows 11 · PySide6 + python-vlc
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Proyecto de escritorio modular y empaquetador .exe (PyInstaller)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isDownloading ? 'Generando ZIP...' : 'Descargar Proyecto (.zip)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Workspace: File Tree on left + Code Viewer on right */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* File sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-[#0a0f18] p-3 overflow-y-auto">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Folder className="h-3.5 w-3.5 text-indigo-400" />
              <span>Archivos del Proyecto</span>
            </div>

            <div className="space-y-1">
              {PYTHON_PROJECT_FILES.map((file, idx) => {
                const isSelected = idx === selectedFileIndex;
                return (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 text-sky-300 font-semibold border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <FileCode className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                    <span className="truncate">{file.path}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-200 block mb-1">Para compilar a .exe:</strong>
              1. Descomprime el .ZIP en Windows.<br />
              2. Ejecuta <code className="text-sky-300">build_exe.bat</code>.<br />
              3. El ejecutable se creará en <code className="text-emerald-300">dist/</code>.
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-[#0b0f17] overflow-hidden">
            {/* Code header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#0e1422] text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sky-400 font-medium">{currentFile.path}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400 text-[11px]">{currentFile.description}</span>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 p-4 overflow-auto">
              <pre className="font-mono text-xs text-slate-200 leading-relaxed tab-size-4 selection:bg-sky-900 selection:text-white">
                {currentFile.content}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
