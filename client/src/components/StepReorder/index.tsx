// dont remove this comment. file located at /src/components/StepReorder/index.tsx
import React, { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ArrowUp, ArrowDown, Save } from 'lucide-react';

interface Step {
  id: string;
  timestamp: string;
  text: string;
  imageUrl?: string;
  order: number;
}

interface StepItemProps {
  step: Step;
  index: number;
  moveStep: (dragIndex: number, hoverIndex: number) => void;
}

const StepItem: React.FC<StepItemProps> = ({ step, index, moveStep }) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: 'STEP',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, dropRef] = useDrop({
    accept: 'STEP',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveStep(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div 
      ref={(node) => dragRef(dropRef(node))}
      className={`p-4 mb-2 rounded-lg shadow-md ${isDragging ? 'bg-gray-200' : 'bg-white'}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex items-center">
        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded mr-2">
          {step.timestamp}
        </span>
        <p className="flex-1 truncate">{step.text}</p>
        <span className="text-gray-400 cursor-move ml-2">☰</span>
      </div>
    </div>
  );
};

interface StepReorderProps {
  steps: Step[];
  onSaveOrder: (steps: Step[]) => void;
}

const StepReorder: React.FC<StepReorderProps> = ({ steps, onSaveOrder }) => {
  const [items, setItems] = useState(steps);

  const moveStep = (dragIndex: number, hoverIndex: number) => {
    const draggedItem = items[dragIndex];
    const newItems = [...items];
    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, draggedItem);
    
    // Update order property
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      order: index
    }));
    
    setItems(updatedItems);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Reorder Steps</h3>
        <div className="mb-4">
          {items.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              index={index}
              moveStep={moveStep}
            />
          ))}
        </div>
        <button
          onClick={() => onSaveOrder(items)}
          className="button button--primary flex items-center gap-2"
        >
          <Save size={16} />
          Save Order
        </button>
      </div>
    </DndProvider>
  );
};

export default StepReorder;