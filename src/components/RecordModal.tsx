import React, { useState } from 'react';
import { PlusCircle, Edit3, X, Check, Code } from 'lucide-react';
import { useToast } from './Toast';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  initialData?: Record<string, any> | null;
  onSave: (data: Record<string, any>) => Promise<void>;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  tableName,
  initialData,
  onSave,
}) => {
  const isEditing = Boolean(initialData && initialData.id);
  const [jsonString, setJsonString] = useState(
    JSON.stringify(
      initialData || getDefaultTemplate(tableName),
      null,
      2
    )
  );
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  function getDefaultTemplate(table: string) {
    if (table === 'C_BPartner') {
      return {
        Value: 'BP_NEW_' + Math.floor(Math.random() * 1000),
        Name: 'Nuevo Socio Comercial',
        IsCustomer: true,
        IsVendor: false,
        IsActive: true,
      };
    }
    if (table === 'M_Product') {
      return {
        Value: 'PROD_' + Math.floor(Math.random() * 1000),
        Name: 'Nuevo Producto iDempiere',
        C_UOM_ID: 100, // Each
        M_Product_Category_ID: 105,
        IsActive: true,
      };
    }
    if (table === 'C_Order') {
      return {
        C_DocTypeTarget_ID: 1000030, // Standard Order
        C_BPartner_ID: 114,
        Description: 'Pedido creado desde PWA Client',
        IsActive: true,
      };
    }
    return {
      Name: 'Registro Nuevo',
      IsActive: true,
    };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      showToast({
        type: 'error',
        title: 'JSON Inválido',
        message: 'Por favor verifica la sintaxis del JSON antes de guardar.',
      });
      return;
    }

    setSaving(true);
    try {
      await onSave(parsed);
      onClose();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error al procesar registro',
        message: err.message || 'No se pudo guardar el registro.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isEditing ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {isEditing ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? `Editar Registro #${initialData?.id} en ${tableName}` : `Nuevo Registro en ${tableName}`}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {isEditing ? `PUT /api/v1/models/${tableName}/${initialData?.id}` : `POST /api/v1/models/${tableName}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Code className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cuerpo del Registro (JSON)</span>
            </span>
            <span className="text-[11px]">iDempiere PO Fields Schema</span>
          </div>

          <textarea
            required
            rows={12}
            value={jsonString}
            onChange={(e) => setJsonString(e.target.value)}
            className="w-full flex-1 rounded-xl bg-slate-950 border border-slate-800 p-3.5 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 transition resize-none shadow-inner"
          />

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs text-slate-950 flex items-center gap-2 shadow-lg transition ${
                isEditing
                  ? 'bg-amber-400 hover:bg-amber-300'
                  : 'bg-emerald-400 hover:bg-emerald-300'
              } disabled:opacity-50`}
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEditing ? 'Guardar Cambios' : 'Crear Registro'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
