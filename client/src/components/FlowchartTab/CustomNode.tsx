// client/src/components/FlowchartTab/CustomNode.tsx
import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Edit, Check, X, Trash2 } from 'lucide-react';

interface CustomNodeData {
  label: string;
  stepId: string;
  text: string;
  order: number;
  isEditing?: boolean;
}

const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ data, selected, isConnectable, id }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLabel, setEditedLabel] = useState(data.label || '');
  const [editedText, setEditedText] = useState(data.text || '');
  const [showFullText, setShowFullText] = useState(false);

  useEffect(() => {
    setEditedLabel(data.label || '');
    setEditedText(data.text || '');
  }, [data.label, data.text]);

  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleEditSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Update the node data in the parent component
    const event = new CustomEvent('nodedatachage', {
      detail: {
        id,
        label: editedLabel,
        text: editedText
      }
    });
    window.dispatchEvent(event);
    
    setIsEditing(false);
  };

  const handleEditCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedLabel(data.label || '');
    setEditedText(data.text || '');
    setIsEditing(false);
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
    // Only toggle if not editing
    if (!isEditing) {
      e.stopPropagation(); // Don't propagate to prevent drag start
      setShowFullText(!showFullText);
    }
  };

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

  return (
    <div 
      className={`custom-node ${selected ? 'border-primary border-2' : ''}`}
      style={{
        padding: '10px',
        borderRadius: '5px',
        background: '#eef6ff',
        border: selected ? '2px solid #25c2a0' : '1px solid #c8e1ff',
        width: '100%',
        cursor: isEditing ? 'default' : 'move',
      }}
    >
      {/* Top Handle */}
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
      
      {/* Left Handle */}
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
      
      {/* Right Handle */}
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
      
      <div className="p-2 relative">
        {isEditing ? (
          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <label className="text-xs text-gray-600 font-medium">Title:</label>
            <input
              type="text"
              value={editedLabel}
              onChange={(e) => setEditedLabel(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 w-full text-sm mb-2"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            
            <label className="text-xs text-gray-600 font-medium">Description:</label>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 w-full text-sm h-24 resize-none"
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={handleEditCancel}
                className="p-1 bg-gray-200 rounded hover:bg-gray-300 text-xs flex items-center"
              >
                <X size={12} className="mr-1" />
                Cancel
              </button>
              <button 
                onClick={handleEditSave}
                className="p-1 bg-primary text-white rounded hover:bg-primary-dark text-xs flex items-center"
              >
                <Check size={12} className="mr-1" />
                Save
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center relative group">
              <div className="font-medium text-center w-full flex flex-col items-center">
                {/* Step number with edit pencil */}
                <div className="text-sm text-primary flex items-center">
                  Step {getStepNumber()}
                  <button 
                    onClick={handleEditStart}
                    className="ml-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-opacity"
                  >
                    <Edit size={12} />
                  </button>
                </div>
                
                {/* Custom title if available */}
                {getCustomTitle() && (
                  <div className="text-xs mt-1 text-gray-700">{getCustomTitle()}</div>
                )}
              </div>
              
              {/* Delete button - shown on hover */}
              <button 
                onClick={handleDeleteNode}
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 transition-opacity"
                title="Delete node"
              >
                <Trash2 size={12} />
              </button>
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
        )}
      </div>
      
      {/* Bottom Handle */}
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
    </div>
  );
};

export default CustomNode;