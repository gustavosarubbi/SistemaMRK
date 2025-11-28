'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validationApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface EditModalProps {
  open: boolean;
  onClose: () => void;
  table: string;
  record: any;
  onSuccess: () => void;
}

export function EditModal({ open, onClose, table, record, onSuccess }: EditModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (record) {
      setFormData(record);
    }
  }, [record]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!record) return;

    setLoading(true);
    try {
      const recordId = record.CTT_CUSTO || record.R_E_C_N_O_;
      const actualTable = record._table || table;
      const updates = { ...formData };
      delete updates.validation_status;
      delete updates.CTT_CUSTO;
      delete updates.R_E_C_N_O_;
      delete updates._table;

      await validationApi.updateRecord(actualTable, recordId, updates);
      toast({
        title: 'Sucesso',
        description: 'Registro atualizado com sucesso',
        type: 'success',
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.detail || 'Erro ao atualizar registro',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndApprove = async () => {
    if (!record) return;

    setLoading(true);
    try {
      const recordId = record.CTT_CUSTO || record.R_E_C_N_O_;
      const actualTable = record._table || table;
      const updates = { ...formData };
      delete updates.validation_status;
      delete updates.CTT_CUSTO;
      delete updates.R_E_C_N_O_;
      delete updates._table;

      await validationApi.updateRecord(actualTable, recordId, updates);
      await validationApi.approveRecord(actualTable, recordId);
      
      toast({
        title: 'Sucesso',
        description: 'Registro atualizado e aprovado com sucesso',
        type: 'success',
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.detail || 'Erro ao atualizar e aprovar registro',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  const getPrimaryKey = () => {
    if (table === 'CTT010') return record.CTT_CUSTO;
    return record.R_E_C_N_O_;
  };

  const getEditableFields = () => {
    const excludeFields = ['validation_status', 'D_E_L_E_T_', 'R_E_C_N_O_'];
    return Object.keys(record).filter(key => !excludeFields.includes(key));
  };

  const formatFieldLabel = (field: string) => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Registro - {table}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            ID: {getPrimaryKey()}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getEditableFields().map((field) => {
              const value = formData[field];
              const isDate = field.includes('DT') || field.includes('DATA');
              const isNumber = typeof value === 'number';
              
              return (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>{formatFieldLabel(field)}</Label>
                  {isDate && typeof value === 'string' && value.length === 8 ? (
                    <Input
                      id={field}
                      type="date"
                      value={`${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}`}
                      onChange={(e) => {
                        const date = e.target.value.replace(/-/g, '');
                        handleChange(field, date);
                      }}
                      disabled={loading}
                    />
                  ) : isNumber ? (
                    <Input
                      id={field}
                      type="number"
                      step="0.01"
                      value={value || ''}
                      onChange={(e) => handleChange(field, parseFloat(e.target.value) || 0)}
                      disabled={loading}
                    />
                  ) : (
                    <Input
                      id={field}
                      value={value || ''}
                      onChange={(e) => handleChange(field, e.target.value)}
                      disabled={loading}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
          <Button onClick={handleSaveAndApprove} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar e Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

