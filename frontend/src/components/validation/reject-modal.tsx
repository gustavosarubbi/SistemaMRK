'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { validationApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  table: string;
  recordId: string;
  onSuccess: () => void;
}

export function RejectModal({ open, onClose, table, recordId, onSuccess }: RejectModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Atenção',
        description: 'Por favor, informe o motivo da rejeição',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      await validationApi.rejectRecord(table, recordId, rejectionReason);
      toast({
        title: 'Sucesso',
        description: 'Registro rejeitado com sucesso',
        type: 'success',
      });
      setRejectionReason('');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.detail || 'Erro ao rejeitar registro',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar Registro</DialogTitle>
          <DialogDescription>
            Informe o motivo da rejeição para o registro {recordId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Motivo da Rejeição *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Descreva o motivo da rejeição..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              disabled={loading}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Rejeitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

