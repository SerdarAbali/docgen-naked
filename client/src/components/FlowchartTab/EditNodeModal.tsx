// client/src/components/FlowchartTab/EditNodeModal.tsx
import React, { useState, useEffect } from 'react';

interface EditNodeModalProps {
  isOpen: boolean;
  nodeId: string | null;
  initialLabel: string;
  initialText: string;
  onSave: (nodeId: string, label: string, text: string) => void;
  onCancel: () => void;
}

const EditNodeModal: React.FC<EditNodeModalProps> = ({
  isOpen,
  nodeId,
  initialLabel,
  initialText,
  onSave,
  onCancel
}) => {
  const [label, setLabel] = useState(initialLabel);
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setLabel(initialLabel);
    setText(initialText);
  }, [initialLabel, initialText, isOpen]);

  if (!isOpen || !nodeId) return null;

  // Create portal to render outside of ReactFlow
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000 // Extremely high z-index
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          zIndex: 100001, // Even higher
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>Edit Step</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Title:</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Description:</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              resize: 'vertical'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              backgroundColor: '#e5e7eb',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(nodeId, label, text)}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditNodeModal;