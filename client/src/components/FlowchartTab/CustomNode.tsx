// client/src/components/FlowchartTab/CustomNode.tsx
import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Edit, Trash2 } from 'lucide-react';

interface CustomNodeData {
  label: string;
  stepId: string;
  text: string;
  order: number;
  isEditing?: boolean;
}

const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ data, selected, isConnectable, id }) => {
  const [showFullText, setShowFullText] = useState(false);

  // Truncate text to a certain length
  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
  };

  // Extract step number from label
  const getStepNumber = () => {
    const match = data.label?.match(/Step\s+(\d+)/i);
    return match ? match[1] : '';
  };

  // Extract custom title from label (if any)
  const getCustomTitle = () => {
    if (!data.label) return '';
    
    const stepMatch = data.label.match(/Step\s+\d+/i);
    if (!stepMatch) return data.label;
    
    const stepPart = stepMatch[0];
    const remainingTitle = data.label.replace(stepPart, '').trim();
    return remainingTitle ? remainingTitle : '';
  };

  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Dispatch event to parent component to trigger edit mode
    const event = new CustomEvent('nodeeditstart', {
      detail: {
        id,
        label: data.label,
        text: data.text
      }
    });
    window.dispatchEvent(event);
  };

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this node?')) {
      // Send event to parent component
      const event = new CustomEvent('nodedelete', {
        detail: { id }
      });
      window.dispatchEvent(event);
    }
  };

  // Handle showing the full step text on hover
  const toggleFullText = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't propagate to prevent drag start
    setShowFullText(!showFullText);
  };

  return (
    <div 
      className={`custom-node ${selected ? 'border-primary border-2' : ''}`}
      style={{
        padding: '16px',
        borderRadius: '8px',
        background: '#eef6ff',
        border: selected ? '2px solid #25c2a0' : '1px solid #c8e1ff',
        width: '240px',
        cursor: 'move',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        position: 'relative',
        left: '-70px'  // Offset to center the node since default position is at the left edge
      }}
    >
      {/* Top Handle */}
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ background: '#555', width: '8px', height: '8px' }}
      />
      
      {/* Left Handle */}
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: '#555', width: '8px', height: '8px' }}
      />
      
      {/* Right Handle */}
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: '#555', width: '8px', height: '8px' }}
      />
      
      <div className="p-2 relative">
        <div>
          <div className="flex justify-between items-center relative group">
            <div className="font-medium text-center w-full flex flex-col items-center">
              {/* Step number */}
              <div className="text-sm text-primary">
                Step {getStepNumber()}
              </div>
              
              {/* Custom title if available */}
              {getCustomTitle() && (
                <div className="text-xs mt-1 text-gray-700">{getCustomTitle()}</div>
              )}
            </div>
            
            {/* Edit and Delete buttons - grouped together on the right */}
            <div className="absolute top-0 right-0 flex opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={handleEditStart}
                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-primary transition-colors"
                title="Edit node"
              >
                <Edit size={12} />
              </button>
              <button 
                onClick={handleDeleteNode}
                className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-500 transition-colors"
                title="Delete node"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          
          <div onClick={toggleFullText} className="mt-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
            {showFullText ? (
              <div className="text-xs text-gray-600 max-h-32 overflow-y-auto">
                {data.text || 'No description'}
              </div>
            ) : (
              <div className="text-xs text-gray-500 truncate">
                {truncateText(data.text, 50) || 'No description'}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Handle */}
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{ background: '#555', width: '8px', height: '8px' }}
      />
    </div>
  );
};

export default CustomNode;