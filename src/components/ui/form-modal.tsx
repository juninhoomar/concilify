import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

// Componente FormModal reutilizável
// Seguindo os princípios DRY e Single Responsibility

type FieldType = 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox';

interface SelectOption {
  value: string;
  label: string;
}

interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: SelectOption[]; // Para campos select
  rows?: number; // Para textarea
  min?: number; // Para number
  max?: number; // Para number
  validation?: {
    pattern?: RegExp;
    message?: string;
  };
  className?: string;
}

interface FormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FormField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  loading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  errors?: Record<string, string>;
  className?: string;
}

export function FormModal({
  open,
  onOpenChange,
  title,
  description,
  fields,
  values,
  onChange,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  errors = {},
  className
}: FormModalProps) {
  const [showPasswords, setShowPasswords] = React.useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = values[field.name] || '';
    const error = errors[field.name];
    const fieldId = `field-${field.name}`;

    const baseProps = {
      id: fieldId,
      name: field.name,
      placeholder: field.placeholder,
      required: field.required,
      disabled: loading,
      className: cn(
        error && 'border-red-500 focus:border-red-500',
        field.className
      )
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <Input
            {...baseProps}
            type={field.type}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            min={field.min}
            max={field.max}
          />
        );

      case 'password':
        return (
          <div className="relative">
            <Input
              {...baseProps}
              type={showPasswords[field.name] ? 'text' : 'password'}
              value={value}
              onChange={(e) => onChange(field.name, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => togglePasswordVisibility(field.name)}
              disabled={loading}
            >
              {showPasswords[field.name] ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        );

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(newValue) => onChange(field.name, newValue)}
            disabled={loading}
          >
            <SelectTrigger className={baseProps.className}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'textarea':
        return (
          <Textarea
            {...baseProps}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            rows={field.rows || 3}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={value}
              onCheckedChange={(checked) => onChange(field.name, checked)}
              disabled={loading}
            />
            <Label
              htmlFor={fieldId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.label}
            </Label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-[425px]', className)}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {fields.map((field) => (
              <div key={field.name} className="grid gap-2">
                {field.type !== 'checkbox' && (
                  <Label htmlFor={`field-${field.name}`}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                )}
                
                {renderField(field)}
                
                {errors[field.name] && (
                  <span className="text-sm text-red-500">
                    {errors[field.name]}
                  </span>
                )}
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Hook para gerenciar estado do formulário
export function useFormModal<T extends Record<string, any>>(initialValues: T) {
  const [open, setOpen] = React.useState(false);
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  const onChange = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Limpa o erro do campo quando o usuário começa a digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const setError = (name: string, message: string) => {
    setErrors(prev => ({ ...prev, [name]: message }));
  };

  const clearErrors = () => {
    setErrors({});
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setLoading(false);
  };

  const openModal = (initialData?: Partial<T>) => {
    if (initialData) {
      setValues({ ...initialValues, ...initialData });
    } else {
      reset();
    }
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    // Reset após um pequeno delay para evitar flash de conteúdo
    setTimeout(reset, 150);
  };

  return {
    open,
    setOpen,
    values,
    setValues,
    errors,
    setErrors,
    loading,
    setLoading,
    onChange,
    setError,
    clearErrors,
    reset,
    openModal,
    closeModal
  };
}

// Utilitário para validação de campos
export function validateField(field: FormField, value: any): string | null {
  if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return `${field.label} é obrigatório`;
  }

  if (field.type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Email inválido';
    }
  }

  if (field.validation?.pattern && value) {
    if (!field.validation.pattern.test(value)) {
      return field.validation.message || `${field.label} inválido`;
    }
  }

  if (field.type === 'number' && value !== undefined && value !== '') {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return `${field.label} deve ser um número`;
    }
    if (field.min !== undefined && numValue < field.min) {
      return `${field.label} deve ser maior ou igual a ${field.min}`;
    }
    if (field.max !== undefined && numValue > field.max) {
      return `${field.label} deve ser menor ou igual a ${field.max}`;
    }
  }

  return null;
}

// Utilitário para validar todos os campos
export function validateForm(fields: FormField[], values: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};
  
  fields.forEach(field => {
    const error = validateField(field, values[field.name]);
    if (error) {
      errors[field.name] = error;
    }
  });
  
  return errors;
}