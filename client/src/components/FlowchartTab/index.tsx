import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Edit, Save, PlusCircle, AlertCircle } from 'lucide-react';
import config from '../../config';
import EditNodeModal from './EditNodeModal';
import CustomNode from './CustomNode';

interface FlowchartTabProps {
  documentId: string;
  jobId: string;
  steps: Step[];
  onAddStep: (text: string) => void;
  onUpdateSteps: (updatedSteps: Step[]) => void;
}

interface Step {
  id: string;
  title?: string;
  text: string;
  order: number;
}

interface FlowchartData {
  id: string;
  nodes: Node[];
  edges: Edge[];
}

const nodeTypes = {
  customNode: CustomNode,
};

const NODE_VERTICAL_SPACING = 150;
const NODE_CENTER_X = 400;

const FlowchartTab: React.FC<FlowchartTabProps> = ({ 
  documentId, 
  jobId, 
  steps, 
  onAddStep,
  onUpdateSteps
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeLabel, setEditingNodeLabel] = useState('');
  const [editingNodeText, setEditingNodeText] = useState('');

  // Updated createStandardEdge function with optional handles
  const createStandardEdge = (
    sourceId: string,
    targetId: string,
    sourceHandle?: string,
    targetHandle?: string
  ) => {
    return {
      id: `${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      sourceHandle: sourceHandle || 'bottom',  // Default to bottom, but allow override
      targetHandle: targetHandle || 'top',     // Default to top, but allow override
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed }
    };
  };

  useEffect(() => {
    const loadFlowchart = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`${config.apiUrl}/api/docs/${jobId}/flowchart`);
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.content) {
            try {
              const flowchartData = JSON.parse(data.content);
              if (flowchartData.nodes && flowchartData.edges) {
                setNodes(flowchartData.nodes);
                setEdges(flowchartData.edges);
                return;
              }
            } catch (parseError) {
              console.error("Error parsing flowchart JSON:", parseError);
            }
          }
          generateFlowchartFromSteps();
        } else if (response.status === 404) {
          generateFlowchartFromSteps();
        } else {
          console.error(`Server returned ${response.status}: ${response.statusText}`);
          generateFlowchartFromSteps();
        }
      } catch (err) {
        console.error('Error loading flowchart:', err);
        setError(err instanceof Error ? err.message : 'Failed to load flowchart');
        generateFlowchartFromSteps();
      } finally {
        setIsLoading(false);
      }
    };

    loadFlowchart();
  }, [jobId]);

  useEffect(() => {
    const handleNodeEditStart = (event: CustomEvent) => {
      const { id, label, text } = event.detail;
      setEditingNodeId(id);
      setEditingNodeLabel(label || '');
      setEditingNodeText(text || '');
    };
    
    window.addEventListener('nodeeditstart', handleNodeEditStart as EventListener);
    
    return () => {
      window.removeEventListener('nodeeditstart', handleNodeEditStart as EventListener);
    };
  }, []);

  const generateFlowchartFromSteps = () => {
    if (steps.length === 0) {
      setNodes([
        {
          id: 'start',
          type: 'input',
          data: { label: 'Start' },
          position: { x: NODE_CENTER_X, y: 0 },
          style: {
            background: '#f0ecfe',
            border: '1px solid #b8a6fe',
            borderRadius: '50px',
            width: 100,
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          },
        },
        {
          id: 'end',
          type: 'output',
          data: { label: 'End' },
          position: { x: NODE_CENTER_X, y: NODE_VERTICAL_SPACING },
          style: {
            background: '#f0ecfe',
            border: '1px solid #b8a6fe',
            borderRadius: '50px',
            width: 100,
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          },
        },
      ]);
      
      setEdges([createStandardEdge('start', 'end')]);
      return;
    }

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    newNodes.push({
      id: 'start',
      type: 'input',
      data: { label: 'Start' },
      position: { x: NODE_CENTER_X, y: 0 },
      style: {
        background: '#f0ecfe',
        border: '1px solid #b8a6fe',
        borderRadius: '50px',
        width: 100,
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      },
    });
    
    steps.forEach((step, index) => {
      newNodes.push({
        id: step.id,
        type: 'customNode',
        data: { 
          label: step.title || `Step ${index + 1}`,
          stepId: step.id,
          text: step.text,
          order: step.order
        },
        position: { x: NODE_CENTER_X, y: (index + 1) * NODE_VERTICAL_SPACING },
        draggable: true,
      });
      
      if (index === 0) {
        newEdges.push(createStandardEdge('start', step.id));
      } else {
        newEdges.push(createStandardEdge(steps[index - 1].id, step.id));
      }
    });
    
    newNodes.push({
      id: 'end',
      type: 'output',
      data: { label: 'End' },
      position: { x: NODE_CENTER_X, y: (steps.length + 1) * NODE_VERTICAL_SPACING },
      style: {
        background: '#f0ecfe',
        border: '1px solid #b8a6fe',
        borderRadius: '50px',
        width: 100,
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      },
    });
    
    if (steps.length > 0) {
      newEdges.push(createStandardEdge(steps[steps.length - 1].id, 'end'));
    }
    
    setNodes(newNodes);
    setEdges(newEdges);
  };

  // Updated onConnect function to preserve user-selected handles
  const onConnect = useCallback((params: Connection) => {
    const newEdge = createStandardEdge(
      params.source!,
      params.target!,
      params.sourceHandle,
      params.targetHandle
    );
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  const addNode = () => {
    if (!editMode) return;
    const newStepText = "New step";
    onAddStep(newStepText);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const stepNodes = nodes.filter(node => 
        node.id !== 'start' && node.id !== 'end'
      ).sort((a, b) => a.position.y - b.position.y);
      
      const updatedSteps = steps.map(step => {
        const nodeIndex = stepNodes.findIndex(node => node.id === step.id);
        return {
          ...step,
          order: nodeIndex !== -1 ? nodeIndex : step.order
        };
      });
      
      onUpdateSteps(updatedSteps);
      
      const flowchartData = {
        nodes: nodes,
        edges: edges
      };
      
      const response = await fetch(`${config.apiUrl}/api/docs/${jobId}/flowchart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: JSON.stringify(flowchartData),
          mappings: {}
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save flowchart: ${response.statusText}`);
      }
      
      setEditMode(false);
    } catch (err) {
      console.error('Error saving flowchart:', err);
      setError(err instanceof Error ? err.message : 'Failed to save flowchart');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNodesChange = useCallback((changes) => {
    if (!editMode) return;
    
    setNodes((nds) => {
      const updatedNodes = changes.reduce((acc, change) => {
        if (change.type === 'position' && change.dragging && change.id) {
          return acc.map(node => 
            node.id === change.id 
              ? { ...node, position: { x: change.position.x, y: change.position.y } }
              : node
          );
        }
        return acc;
      }, nds);
      return updatedNodes;
    });
  }, [editMode, setNodes]);

  const onEdgeDoubleClick = (event: React.MouseEvent, edge: Edge) => {
    if (!editMode) return;
    
    if (window.confirm('Remove this connection?')) {
      setEdges((eds) => eds.filter(e => e.id !== edge.id));
    }
  };

  useEffect(() => {
    const handleNodeDataChange = (event: CustomEvent) => {
      if (!editMode) return;
      
      const { id, label, text } = event.detail;
      
      setNodes((nds) => 
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                label,
                text
              },
            };
          }
          return node;
        })
      );
      
      const stepIndex = steps.findIndex(step => step.id === id);
      if (stepIndex !== -1) {
        const updatedSteps = [...steps];
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          title: label,
          text: text
        };
        onUpdateSteps(updatedSteps);
      }
    };
    
    const handleNodeDelete = (event: CustomEvent) => {
      if (!editMode) return;
      
      const { id } = event.detail;
      
      if (id === 'start' || id === 'end') {
        alert('Cannot delete Start or End nodes');
        return;
      }
      
      const incomingEdges = edges.filter(edge => edge.target === id);
      const outgoingEdges = edges.filter(edge => edge.source === id);
      
      setNodes((nds) => nds.filter((node) => node.id !== id));
      
      setEdges((eds) => eds.filter(
        (edge) => edge.source !== id && edge.target !== id
      ));
      
      if (incomingEdges.length > 0 && outgoingEdges.length > 0) {
        incomingEdges.forEach(inEdge => {
          outgoingEdges.forEach(outEdge => {
            const newEdge = createStandardEdge(inEdge.source, outEdge.target);
            setEdges(eds => [...eds, newEdge]);
          });
        });
      }
      
      const stepIndex = steps.findIndex(step => step.id === id);
      if (stepIndex !== -1) {
        const updatedSteps = steps.filter(step => step.id !== id);
        onUpdateSteps(updatedSteps);
      }
    };
    
    window.addEventListener('nodedatachage', handleNodeDataChange as EventListener);
    window.addEventListener('nodedelete', handleNodeDelete as EventListener);
    
    return () => {
      window.removeEventListener('nodedatachage', handleNodeDataChange as EventListener);
      window.removeEventListener('nodedelete', handleNodeDelete as EventListener);
    };
  }, [editMode, nodes, edges, steps, setNodes, setEdges, onUpdateSteps]);

  const handleSaveNodeEdit = (nodeId: string, label: string, text: string) => {
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              label,
              text
            },
          };
        }
        return node;
      })
    );
    
    const stepIndex = steps.findIndex(step => step.id === nodeId);
    if (stepIndex !== -1) {
      const updatedSteps = [...steps];
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        title: label,
        text: text
      };
      onUpdateSteps(updatedSteps);
    }
    
    setEditingNodeId(null);
  };

  return (
    <div className="mt-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Flowchart</h3>
          <div className="flex gap-2">
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Edit size={16} />
                Edit Flowchart
              </button>
            ) : (
              <>
                <button
                  onClick={addNode}
                  className="btn-secondary flex items-center gap-2"
                >
                  <PlusCircle size={16} />
                  Add Node
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary flex items-center gap-2"
                  disabled={isSaving}
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Flowchart'}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="btn-secondary flex items-center gap-2"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
        
        {error && (
          <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />
              <p className="text-yellow-700">
                {error}
                <span className="block text-sm text-yellow-600 mt-1">
                  Using automatically generated flowchart instead.
                </span>
              </p>
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ReactFlowProvider>
            <div 
              className="w-full" 
              style={{ height: '700px', position: 'relative' }} 
              ref={reactFlowWrapper}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={editMode ? onEdgesChange : undefined}
                onConnect={editMode ? onConnect : undefined}
                onInit={setReactFlowInstance}
                nodeTypes={nodeTypes}
                onEdgeDoubleClick={editMode ? onEdgeDoubleClick : undefined}
                fitView
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  markerEnd: { type: MarkerType.ArrowClosed },
                  style: { strokeWidth: 2 }
                }}
                connectionMode="loose"
              >
                <Controls />
                <Background color="#aaa" gap={16} />
                {editMode && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      bottom: 10, 
                      left: 10, 
                      padding: '6px 12px', 
                      background: 'rgba(0,0,0,0.6)', 
                      color: 'white', 
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    Double-click on a connection to remove it
                  </div>
                )}
              </ReactFlow>
            </div>
          </ReactFlowProvider>
        )}
        
        <EditNodeModal
          isOpen={editingNodeId !== null}
          nodeId={editingNodeId}
          initialLabel={editingNodeLabel}
          initialText={editingNodeText}
          onSave={handleSaveNodeEdit}
          onCancel={() => setEditingNodeId(null)}
        />
      </div>
    </div>
  );
};

export default FlowchartTab;