import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: string | number;
  type?: 'number' | 'text' | 'percent' | 'date';
  onSave: (newValue: string | number) => void;
  className?: string;
  editable?: boolean;
}

export function EditableCell({ 
  value, 
  type = 'number', 
  onSave, 
  className,
  editable = true 
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(String(value));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (editable && type !== 'percent') {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    saveValue();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      saveValue();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(String(value));
    }
  };

  const saveValue = () => {
    let newValue: string | number = editValue;
    
    if (type === 'number') {
      const parsed = parseFloat(editValue);
      newValue = isNaN(parsed) ? 0 : parsed;
    }
    
    if (newValue !== value) {
      onSave(newValue);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type === 'number' ? 'number' : 'text'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-7 w-20 text-center p-1 text-xs",
          className
        )}
      />
    );
  }

  const displayValue = type === 'percent' 
    ? `${value}%` 
    : type === 'date' && value === '-' 
      ? '-' 
      : value;

  return (
    <span
      onDoubleClick={handleDoubleClick}
      className={cn(
        "cursor-default",
        editable && type !== 'percent' && "hover:bg-accent/50 px-2 py-1 rounded cursor-pointer",
        className
      )}
      title={editable && type !== 'percent' ? "Duplo clique para editar" : undefined}
    >
      {displayValue}
    </span>
  );
}
