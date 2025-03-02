// client/src/components/FlowchartTab/index.tsx
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
  ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Edit, Save, PlusCircle, Trash2 } from 'lucide-react';
import config from '../../config';

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

// Import custom node component
import CustomNode from './CustomNode';

// Custom node types
const nodeTypes = {
  customNode: CustomNode,
};

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
  
  // Load or initialize flowchart
  useEffect(() => {
    const loadFlowchart = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`${config.apiUrl}/api/docs/${jobId}/flowchart`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.nodes && data.edges) {
            setNodes(data.nodes);
            setEdges(data.edges);
          } else {
            // If the data structure doesn't match, generate from steps
            generateFlowchartFromSteps();
          }
        } else if (response.status === 404) {
          // Create a default flowchart based on steps
          generateFlowchartFromSteps();
        } else {
          throw new Error(`Failed to load flowchart: ${response.statusText}`);
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

  // Generate initial flowchart from steps
  const generateFlowchartFromSteps = () => {
    if (steps.length === 0) {
      setNodes([
        {
          id: 'start',
          type: 'input',
          data: { label: 'Start' },
          position: { x: 350, y: 0 },
          style: {
            background: '#f0ecfe',
            border: '1px solid #b8a6fe',
            borderRadius: '50px',
            width: 100,
            textAlign: 'center'
          },
        },
        {
          id: 'end',
          type: 'output',
          data: { label: 'End' },
          position: { x: 350, y: 250 },
          style: {
            background: '#f0ecfe',
            border: '1px solid #b8a6fe',
            borderRadius: '50px',
            width: 100,
            textAlign: 'center'
          },
        },
      ]);
      
      setEdges([
        { id: 'start-end', source: 'start', target: 'end', markerEnd: { type: MarkerType.ArrowClosed } },
      ]);
      return;
    }

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    // Center position for all nodes
    const centerX = 350;
    
    // Add start node
    newNodes.push({
      id: 'start',
      type: 'input',
      data: { label: 'Start' },
      position: { x: centerX, y: 0 },
      style: {
        background: '#f0ecfe',
        border: '1px solid #b8a6fe',
        borderRadius: '50px',
        width: 100,
        textAlign: 'center'
      },
    });
    
    // Add step nodes
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
        position: { x: centerX, y: (index + 1) * 100 },
        draggable: true, // Always make nodes draggable
      });
      
      // Connect to previous node
      if (index === 0) {
        newEdges.push({
          id: `start-${step.id}`,
          source: 'start',
          target: step.id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'straight',
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      } else {
        newEdges.push({
          id: `${steps[index - 1].id}-${step.id}`,
          source: steps[index - 1].id,
          target: step.id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'straight',
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
    });
    
    // Add end node
    newNodes.push({
      id: 'end',
      type: 'output',
      data: { label: 'End' },
      position: { x: centerX, y: (steps.length + 1) * 100 },
      style: {
        background: '#f0ecfe',
        border: '1px solid #b8a6fe',
        borderRadius: '50px',
        width: 100,
        textAlign: 'center'
      },
    });
    
    // Connect last step to end
    if (steps.length > 0) {
      newEdges.push({
        id: `${steps[steps.length - 1].id}-end`,
        source: steps[steps.length - 1].id,
        target: 'end',
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    }
    
    setNodes(newNodes);
    setEdges(newEdges);
  };

  // Handle connecting nodes
  const onConnect = useCallback((params: Connection) => {
    // Create a unique ID for the new edge
    const edgeId = `${params.source}-${params.sourceHandle || ''}-${params.target}-${params.targetHandle || ''}`;
    
    setEdges((eds) => addEdge({ 
      ...params, 
      id: edgeId,
      markerEnd: { type: MarkerType.ArrowClosed } 
    }, eds));
  }, [setEdges]);

  // Add a new node (step)
  const addNode = () => {
    if (!editMode) return;
    
    const newStepText = "New step";
    onAddStep(newStepText);
    
    // The step will be added to the steps array and the flow will be regenerated
    // when the steps prop updates
  };

  // Save the flowchart
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Update step order based on node positions
      // Sort nodes by y-position (top to bottom, excluding start/end)
      const stepNodes = nodes.filter(node => 
        node.id !== 'start' && node.id !== 'end'
      ).sort((a, b) => a.position.y - b.position.y);
      
      // Update steps with new order
      const updatedSteps = steps.map(step => {
        const nodeIndex = stepNodes.findIndex(node => node.id === step.id);
        return {
          ...step,
          order: nodeIndex !== -1 ? nodeIndex : step.order
        };
      });
      
      // Update steps in parent component
      onUpdateSteps(updatedSteps);
      
      // Prepare nodes for saving (remove circular references and internal data)
      const sanitizedNodes = nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          label: node.data.label,
          stepId: node.data.stepId,
          text: node.data.text,
          order: node.data.order
        },
        draggable: node.draggable,
        style: node.style ? JSON.stringify(node.style) : null
      }));
      
      // Prepare edges for saving
      const sanitizedEdges = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        markerEnd: edge.markerEnd ? { type: edge.markerEnd.type } : null
      }));
      
      // Save flowchart to backend
      const response = await fetch(`${config.apiUrl}/api/docs/${jobId}/flowchart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes: sanitizedNodes,
          edges: sanitizedEdges
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

  // Handle node changes better
  const handleNodesChange = useCallback((changes) => {
    if (!editMode) return;
    
    setNodes((nds) => {
      // Apply all changes
      const updatedNodes = changes.reduce((acc, change) => {
        if (change.type === 'position' && change.dragging && change.id) {
          // Handle position changes during dragging
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
  
  // Listen for node data changes from CustomNode
  useEffect(() => {
    const handleNodeDataChange = (event: CustomEvent) => {
      if (!editMode) return;
      
      const { id, label, text } = event.detail;
      
      // Update the node data
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
      
      // Find the corresponding step and update its title and text
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
      
      // Don't allow deleting Start or End nodes
      if (id === 'start' || id === 'end') {
        alert('Cannot delete Start or End nodes');
        return;
      }
      
      // Remove the node from the nodes state
      setNodes((nds) => nds.filter((node) => node.id !== id));
      
      // Remove associated edges
      setEdges((eds) => eds.filter(
        (edge) => edge.source !== id && edge.target !== id
      ));
      
      // Find and create a new direct connection for deleted node
      const incomingEdges = edges.filter(edge => edge.target === id);
      const outgoingEdges = edges.filter(edge => edge.source === id);
      
      incomingEdges.forEach(inEdge => {
        outgoingEdges.forEach(outEdge => {
          // Create a new edge that connects the source of incoming edge to target of outgoing edge
          const newEdge = {
            id: `${inEdge.source}-${outEdge.target}`,
            source: inEdge.source,
            target: outEdge.target,
            markerEnd: { type: MarkerType.ArrowClosed }
          };
          setEdges(eds => [...eds, newEdge]);
        });
      });
      
      // Find the corresponding step and remove it
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
              </ReactFlow>
            </div>
          </ReactFlowProvider>
        )}
        
        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex items-center">
              <Trash2 className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowchartTab;