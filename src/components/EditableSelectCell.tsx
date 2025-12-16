import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface EditableSelectCellProps {
  value: string;
  options: { value: string; label: string }[];
  onSave: (newValue: string) => void;
  className?: string;
  editable?: boolean;
  renderValue?: (value: string) => React.ReactNode;
}

export function EditableSelectCell({ 
  value, 
  options,
  onSave, 
  className,
  editable = true,
  renderValue
}: EditableSelectCellProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleValueChange = (newValue: string) => {
    if (newValue !== value) {
      onSave(newValue);
    }
    setIsEditing(false);
  };

  if (!editable) {
    return (
      <span className={className}>
        {renderValue ? renderValue(value) : value}
      </span>
    );
  }

  if (isEditing) {
    return (
      <Select 
        value={value} 
        onValueChange={handleValueChange}
        onOpenChange={(open) => {
          if (!open) setIsEditing(false);
        }}
        open={true}
      >
        <SelectTrigger className={cn("h-8 w-[140px]", className)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-accent/50 px-2 py-1 rounded inline-block",
        className
      )}
      title="Clique para editar"
    >
      {renderValue ? renderValue(value) : value}
    </span>
  );
}
