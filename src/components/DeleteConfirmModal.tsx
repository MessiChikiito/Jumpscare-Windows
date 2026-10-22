import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  videoName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  videoName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#121927] p-6 shadow-2xl">
        <div className="flex items-center gap-3 text-rose-500 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100">Confirmar Eliminación</h3>
        </div>

        <p className="text-sm text-slate-300 mb-2">
          ¿Estás seguro de que deseas eliminar este vídeo de la biblioteca?
        </p>
        <p className="text-xs font-mono bg-slate-900/60 p-2.5 rounded border border-slate-800 text-rose-300 break-all mb-6">
          {videoName}
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar Vídeo
          </button>
        </div>
      </div>
    </div>
  );
};
