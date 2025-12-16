import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';

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
  const [dateOpen, setDateOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(String(value));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current && type !== 'date') {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, type]);

  const handleDoubleClick = () => {
    if (editable && type !== 'percent') {
      if (type === 'date') {
        setDateOpen(true);
      } else {
        setIsEditing(true);
      }
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

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const isoDate = format(date, 'yyyy-MM-dd');
      onSave(isoDate);
      setDateOpen(false);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr || dateStr === '-') return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr || dateStr === '-') return undefined;
    try {
      return parseISO(dateStr);
    } catch {
      return undefined;
    }
  };

  // Date type with calendar popover
  if (type === 'date' && editable) {
    return (
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <span
            onDoubleClick={handleDoubleClick}
            className={cn(
              "cursor-pointer hover:bg-accent/50 px-2 py-1 rounded inline-flex items-center gap-1",
              className
            )}
            title="Duplo clique para editar"
          >
            {formatDisplayDate(String(value))}
            <CalendarIcon className="h-3 w-3 text-muted-foreground" />
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parseDate(String(value))}
            onSelect={handleDateSelect}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    );
  }

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
    : type === 'date'
      ? formatDisplayDate(String(value))
      : value === '-' 
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
