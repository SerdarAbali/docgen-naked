// client/src/components/NodeMapping/index.tsx
import React, { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

interface NodeMappingProps {
  nodeId: string;
  steps: Step[];
  selectedStepId: string | null;
  onSelect: (stepId: string) => void;
  onClear: () => void;
}

interface Step {
  id: string;
  title?: string;
  text: string;
  order: number;
}

const NodeMapping: React.FC<NodeMappingProps> = ({
  nodeId,
  steps,
  selectedStepId,
  onSelect,
  onClear
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedStep = selectedStepId ? steps.find(s => s.id === selectedStepId) : null;
  
  return (
    <div className="relative">
      <div 
        className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate">
          {selectedStep ? (
            <span className="font-medium">{selectedStep.title || `Step ${selectedStep.order + 1}`}</span>
          ) : (
            <span className="text-gray-400">Select a step...</span>
          )}
        </div>
        <div className="flex items-center">
          {selectedStepId && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1 text-gray-400 hover:text-red-500 mr-1"
            >
              <X size={16} />
            </button>
          )}
          <ChevronDown 
            size={18} 
            className={`text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          />
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
          {steps.map(step => (
            <div 
              key={step.id}
              className={`
                px-3 py-2 cursor-pointer flex items-center
                ${selectedStepId === step.id 
                  ? 'bg-primary text-white' 
                  : 'hover:bg-gray-100 text-gray-800'}
              `}
              onClick={() => {
                onSelect(step.id);
                setIsOpen(false);
              }}
            >
              <span className="flex-1 truncate">{step.title || `Step ${step.order + 1}`}</span>
              {selectedStepId === step.id && <Check size={16} />}
            </div>
          ))}
          
          {steps.length === 0 && (
            <div className="px-3 py-2 text-gray-500">
              No steps available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NodeMapping;