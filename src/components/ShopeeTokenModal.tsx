import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ShopeeTokenForm } from '@/types';
import { generateShopeeSignature, generateShopeeAuthBaseString, getCurrentTimestamp, generateUUID } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';

import { Store } from "@/types";

interface ShopeeTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (storeData: Store) => void;
}

const INITIAL_FORM_VALUES: ShopeeTokenForm = {
  name: '',
  partner_id: '2010568',
  partner_key: '4c644b6d756a6155565456576b6c64446a46634a42455a65417052727a63616b',
  shop_id: '',
  authorization_code: ''
};

export function ShopeeTokenModal({ isOpen, onClose, onSuccess }: ShopeeTokenModalProps) {
  const [formData, setFormData] = useState<ShopeeTokenForm>(INITIAL_FORM_VALUES);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'instructions'>('form');
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof ShopeeTokenForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Nome da loja é obrigatório');
      return false;
    }
    if (!formData.partner_id.trim()) {
      setError('Partner ID é obrigatório');
      return false;
    }
    if (!formData.partner_key.trim()) {
      setError('Partner Key é obrigatória');
      return false;
    }
    if (!formData.shop_id.trim()) {
      setError('Shop ID é obrigatório');
      return false;
    }
    if (!formData.authorization_code.trim()) {
      setError('Authorization Code é obrigatório');
      return false;
    }
    return true;
  };

  const generateAuthUrl = async () => {
    if (!formData.partner_id.trim()) {
      toast.error('Preencha o Partner ID primeiro!');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/tokens/generate_auth_url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ partner_id: parseInt(formData.partner_id) }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao gerar URL de autenticação');
      }
      return data.auth_url;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erro inesperado ao gerar URL de autenticação';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const openAuthUrl = async () => {
    const url = await generateAuthUrl();
    if (url) {
      window.open(url, '_blank');
      setStep('instructions');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado para a área de transferência!');
    } catch (error) {
      toast.error('Erro ao copiar para a área de transferência');
    }
  };

  const generateTokens = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/tokens/generate_tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner_id: formData.partner_id,
          partner_key: formData.partner_key,
          shop_id: formData.shop_id,
          auth_code: formData.authorization_code,
          loja_nome: formData.name,
          empresa_id: "a3a6aa30-04f9-4954-aa0d-c5f8c53962eb" // ID da empresa Poofy
        }),
      });

      const data: { success: boolean; error?: string; message?: string; access_token?: string; refresh_token?: string; expire_in?: number; } = await response.json();

       if (!response.ok || !data.success) {
         throw new Error(data.error || data.message || 'Erro ao gerar tokens');
       }
       // Tokens já foram salvos no Supabase pelo backend
       // Criar registro da loja automaticamente
       const newStoreData: Store = {
         id: generateUUID(),
         name: formData.name,
         platform: 'shopee',
         api_key: data.access_token!,
         secret_key: data.refresh_token!,
         status: 'active',
         user_id: 'current-user-id',
         last_sync: new Date().toISOString(),
         created_at: new Date().toISOString()
       };

       onSuccess(newStoreData);
       onClose();
       toast.success('Loja Shopee conectada com sucesso!');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro inesperado ao gerar tokens';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };



  const resetModal = () => {
    setStep('form');
    setFormData(INITIAL_FORM_VALUES);
    setError(null);
  };

  const handleClose = () => {
      resetModal();
      onClose();
    };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🛍️ Conectar Loja Shopee
          </DialogTitle>
          <DialogDescription>
            {step === 'form' && 'Preencha os dados para gerar tokens de acesso da sua loja Shopee'}
            {step === 'instructions' && 'Siga as instruções para obter o código de autorização'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'form' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Loja</Label>
              <Input
                id="name"
                placeholder="Ex: Loja Principal Shopee"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partner_id">Partner ID</Label>
                <Input
                  id="partner_id"
                  value={formData.partner_id}
                  onChange={(e) => handleInputChange('partner_id', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop_id">Shop ID</Label>
                <Input
                  id="shop_id"
                  placeholder="ID da sua loja"
                  value={formData.shop_id}
                  onChange={(e) => handleInputChange('shop_id', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner_key">Partner Key</Label>
              <Input
                id="partner_key"
                type="password"
                value={formData.partner_key}
                onChange={(e) => handleInputChange('partner_key', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorization_code">Authorization Code</Label>
              <Input
                id="authorization_code"
                placeholder="Cole aqui o código obtido na autorização"
                value={formData.authorization_code}
                onChange={(e) => handleInputChange('authorization_code', e.target.value)}
              />
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={openAuthUrl}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Obter Authorization Code
              </Button>
              <Button
                onClick={generateTokens}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  '🚀'
                )}
                Gerar Tokens
              </Button>
            </div>
          </div>
        )}

        {step === 'instructions' && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Como obter o Authorization Code:</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                <span>Uma nova aba foi aberta com a URL de autorização do Shopee</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                <span>Faça login na sua conta Shopee Partner</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                <span>Autorize o acesso à sua loja</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">4</span>
                <span>Você será redirecionado para uma URL que contém o parâmetro 'code'</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">5</span>
                <span>Copie apenas o valor após 'code=' e cole no campo Authorization Code</span>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Exemplo de URL de retorno:</strong><br />
                <code className="text-xs">https://n8n.newwavestartup.com.br?code=SEU_CODIGO_AQUI&shop_id=123456</code>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
                Voltar
              </Button>
              <Button onClick={openAuthUrl} variant="outline" className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Novamente
              </Button>
            </div>
          </div>
        )}


      </DialogContent>
    </Dialog>
  );
}