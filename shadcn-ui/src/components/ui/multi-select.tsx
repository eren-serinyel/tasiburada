import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  label: string;
  placeholder: string;
  options: string[] | Record<string, string>;
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  maxHeight?: string;
  icon?: React.ReactNode;
}

export default function MultiSelect({
  label,
  placeholder,
  options,
  selectedValues,
  onSelectionChange,
  maxHeight = "max-h-48",
  icon
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert options to array format
  const optionsArray = Array.isArray(options) 
    ? options.map(opt => ({ key: opt, value: opt }))
    : Object.entries(options).map(([key, value]) => ({ key, value }));

  // Filter options based on search term
  const filteredOptions = optionsArray.filter(option =>
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = dropdownRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (inTrigger || inPanel) return; // panel veya trigger içinde tıklama: kapatma yok
      setIsOpen(false);
      setSearchTerm('');
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (optionKey: string) => {
    const newSelection = selectedValues.includes(optionKey)
      ? selectedValues.filter(val => val !== optionKey)
      : [...selectedValues, optionKey];
    
    onSelectionChange(newSelection);
  };

  const handleRemoveSelection = (optionKey: string) => {
    onSelectionChange(selectedValues.filter(val => val !== optionKey));
  };

  const getDisplayValue = (key: string) => {
    const option = optionsArray.find(opt => opt.key === key);
    return option?.value || key;
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <Label className="text-base font-medium text-gray-700 flex items-center gap-2">
        {icon}
        {label}
      </Label>
      
      {/* Selected Items Display */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
          {selectedValues.map((selectedKey) => (
            <Badge
              key={selectedKey}
              variant="secondary"
              className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 transform hover:scale-105 shadow-sm"
            >
              {getDisplayValue(selectedKey)}
              <button
                type="button"
                onClick={() => handleRemoveSelection(selectedKey)}
                className="ml-2 hover:bg-blue-300 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown Trigger */}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-between h-12 text-left font-normal"
        >
          <span className="text-gray-500">
            {selectedValues.length > 0 
              ? `${selectedValues.length} seçildi` 
              : placeholder
            }
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "transform rotate-180"
          )} />
        </Button>

        {/* Dropdown Panel - Portal üzerinden body seviyesinde */}
        {isOpen && ReactDOM.createPortal(
          <div ref={panelRef} className="absolute z-[9999] w-[var(--multi-select-width,100%)] mt-1 bg-white border border-gray-200 rounded-lg shadow-xl animate-in slide-in-from-top-2 duration-200" style={{
            position: 'absolute',
            top: (dropdownRef.current?.getBoundingClientRect().bottom || 0) + window.scrollY,
            left: (dropdownRef.current?.getBoundingClientRect().left || 0) + window.scrollX,
            width: dropdownRef.current ? `${dropdownRef.current.getBoundingClientRect().width}px` : 'auto'
          }}>
            {/* Search Input */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                  autoFocus
                />
              </div>
            </div>

            {/* Options List */}
            <div className={cn("overflow-y-auto", maxHeight)}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleToggleOption(option.key)}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between",
                        isSelected && "bg-blue-50 text-blue-700"
                      )}
                    >
                      <span className="font-medium">{option.value}</span>
                      {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>Sonuç bulunamadı</p>
                  <p className="text-sm">"{searchTerm}" için arama yapıldı</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {selectedValues.length > 0 
                  ? `${selectedValues.length} öğe seçildi`
                  : `${filteredOptions.length} seçenek`
                }
              </span>
              {selectedValues.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectionChange([])}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Tümünü Temizle
                </Button>
              )}
            </div>
          </div>, document.body)
        }
      </div>
    </div>
  );
}