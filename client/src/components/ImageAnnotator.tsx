// ImageAnnotator.tsx - Fixed version
import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image, Rect, Circle, Line, Text, Transformer } from 'react-konva';
import { Circle as LucideCircle, Square, Type, Highlighter, MousePointer, X, Save } from 'lucide-react';
import Konva from 'konva';

// Fix issues with SSR rendering
const isClient = typeof window !== 'undefined';
if (!isClient) {
  // @ts-ignore
  global.window = {};
}

// Define annotation types
export type AnnotationType = 'rectangle' | 'circle' | 'text' | 'highlight' | 'arrow';
export type Annotation = {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  points?: number[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
};

interface ImageAnnotatorProps {
  imageUrl: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({ imageUrl, onSave, onCancel }) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<AnnotationType | 'select'>('select');
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState<Partial<Annotation> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeColor, setStrokeColor] = useState('#00A0FF');
  const [fillColor, setFillColor] = useState('#FFCC00');
  const [textColor, setTextColor] = useState('#333333');
  const [fontSize, setFontSize] = useState(18);
  const [showStyleOptions, setShowStyleOptions] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  
  // Load the image when component mounts
  useEffect(() => {
    console.log('Loading image from URL:', imageUrl);
    const img = new window.Image();
    img.crossOrigin = "anonymous";  // Important for CORS if images are on a different domain
    img.src = imageUrl;
    img.onload = () => {
      console.log('Image loaded successfully:', img.width, 'x', img.height);
      setImage(img);
    };
    img.onerror = (err) => {
      console.error('Error loading image:', err);
    };
  }, [imageUrl]);

  // Track changes
  useEffect(() => {
    if (annotations.length > 0) {
      setHasChanges(true);
    }
  }, [annotations]);

  // Handle transformer for selected shape
  useEffect(() => {
    if (!transformerRef.current) return;
    
    const node = layerRef.current?.findOne('#' + selectedId);
    if (node) {
      transformerRef.current.nodes([node as Konva.Node]);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts when a textarea is active
      if (document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Don't trigger shortcuts if Ctrl/Cmd or Alt are pressed
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
  
      switch (e.key) {
        case 'v':
        case 'V':
          e.preventDefault();
          setTool('select');
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          setTool('rectangle');
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          setTool('circle');
          break;
        case 'h':
        case 'H':
          e.preventDefault();
          setTool('highlight');
          break;
        case 't':
        case 'T':
          e.preventDefault();
          setTool('text');
          break;
        case 'a':
        case 'A':
          e.preventDefault();
          setTool('arrow');
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedId) {
            e.preventDefault();
            setAnnotations(annotations.filter(ann => ann.id !== selectedId));
            setSelectedId(null);
            setHasChanges(true);
          }
          break;
        case 'Escape':
          if (selectedId) {
            e.preventDefault();
            setSelectedId(null);
          } else if (newAnnotation) {
            e.preventDefault();
            setNewAnnotation(null);
            setIsDrawing(false);
          } else if (showExitConfirm) {
            e.preventDefault();
            setShowExitConfirm(false);
          } else {
            handleCancel();
          }
          break;
        case 's':
        case 'S':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (!isSaving) {
              handleSave();
            }
          }
          break;
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [annotations, selectedId, newAnnotation, tool, isSaving, showExitConfirm]);

  // Generate a unique ID for new annotations
  const generateId = () => {
    return '_' + Math.random().toString(36).substr(2, 9);
  };

  // Handle mouse down event on the stage with improved text tool handling
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
        return;
      }
      return;
    }

    setIsDrawing(true);
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    let newShape: Partial<Annotation> = {
      id: generateId(),
      type: tool,
      x: pos.x,
      y: pos.y,
    };

    switch (tool) {
      case 'rectangle':
        newShape = {
          ...newShape,
          width: 0,
          height: 0,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
        };
        break;
      
      case 'circle':
        newShape = {
          ...newShape,
          radius: 0,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
        };
        break;
      
      case 'highlight':
        newShape = {
          ...newShape,
          width: 0,
          height: 0,
          fill: fillColor,
          opacity: 0.3,
        };
        break;
      
      case 'text':
        newShape = {
          ...newShape,
          text: 'Double click to edit',
          fontSize: fontSize,
          fontFamily: 'Arial',
          fill: textColor,
        };
        
        // Check if we're clicking on an existing text node
        const stage = e.target.getStage();
        if (stage) {
          const textNodes = stage.find('Text');
          let clickedOnText = false;
          
          for (let i = 0; i < textNodes.length; i++) {
            const textNode = textNodes[i];
            // Skip if the node is being created (not yet in annotations)
            if (!annotations.find(ann => ann.id === textNode.id())) continue;
            
            if (textNode.intersects({x: pos.x, y: pos.y})) {
              clickedOnText = true;
              // If in text mode, we want to edit the existing text
              if (tool === 'text') {
                // Simulate double-click to edit
                handleTextDblClick({
                  target: textNode,
                  cancelBubble: true,
                  evt: e.evt
                } as unknown as Konva.KonvaEventObject<MouseEvent>, textNode.id());
              }
              break;
            }
          }
          
          // Only add new text if not clicking on existing text
          if (!clickedOnText) {
            setAnnotations([...annotations, newShape as Annotation]);
            setHasChanges(true);
          }
        } else {
          setAnnotations([...annotations, newShape as Annotation]);
          setHasChanges(true);
        }
        
        setIsDrawing(false);
        return;
      
      case 'arrow':
        newShape = {
          ...newShape,
          points: [pos.x, pos.y, pos.x, pos.y],
          stroke: strokeColor,
          strokeWidth: strokeWidth,
        };
        break;
    }

    setNewAnnotation(newShape);
  };

  // Handle mouse move event on the stage
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !newAnnotation) return;
    
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    let updatedAnnotation = { ...newAnnotation };

    switch (newAnnotation.type) {
      case 'rectangle':
      case 'highlight':
        updatedAnnotation.width = pos.x - newAnnotation.x;
        updatedAnnotation.height = pos.y - newAnnotation.y;
        break;
      
      case 'circle':
        const dx = pos.x - newAnnotation.x;
        const dy = pos.y - newAnnotation.y;
        updatedAnnotation.radius = Math.sqrt(dx * dx + dy * dy);
        break;
      
      case 'arrow':
        updatedAnnotation.points = [
          newAnnotation.x,
          newAnnotation.y,
          pos.x,
          pos.y
        ];
        break;
    }

    setNewAnnotation(updatedAnnotation);
  };

  // Handle mouse up event on the stage
  const handleMouseUp = () => {
    if (!isDrawing || !newAnnotation) return;
    
    setIsDrawing(false);
    
    // Don't add tiny shapes (likely accidental clicks)
    if (
      (newAnnotation.type === 'rectangle' && 
       (Math.abs(newAnnotation.width || 0) < 5 || Math.abs(newAnnotation.height || 0) < 5)) ||
      (newAnnotation.type === 'circle' && (newAnnotation.radius || 0) < 5) ||
      (newAnnotation.type === 'arrow' && 
       Math.abs((newAnnotation.points?.[2] || 0) - (newAnnotation.points?.[0] || 0)) < 5 && 
       Math.abs((newAnnotation.points?.[3] || 0) - (newAnnotation.points?.[1] || 0)) < 5)
    ) {
      setNewAnnotation(null);
      return;
    }

    setAnnotations([...annotations, newAnnotation as Annotation]);
    setNewAnnotation(null);
    setHasChanges(true);
  };

  // Fixed text editing on double click
  const handleTextDblClick = (e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
    console.log('Text double-click handler triggered for ID:', id);
    
    // Stop event propagation to prevent adding new text
    e.cancelBubble = true;
    if (e.evt) {
      e.evt.preventDefault();
      e.evt.stopPropagation();
    }
    
    const textNode = e.target as Konva.Text;
    console.log('Text node found:', textNode.text());
    
    // Check if the text can be found in annotations array
    const annotation = annotations.find(ann => ann.id === id);
    if (!annotation) {
      console.error('Text annotation not found in annotations array:', id);
      return;
    }
    
    // Get accurate position
    const stageBox = stageRef.current?.container().getBoundingClientRect() || { top: 0, left: 0 };
    const textPosition = textNode.absolutePosition();
    
    // Calculate absolute position in viewport
    const areaPosition = {
      x: stageBox.left + textPosition.x,
      y: stageBox.top + textPosition.y
    };
    
    console.log('Creating textarea at position:', areaPosition);
    
    // Create a uniquely identified textarea
    const textarea = document.createElement('textarea');
    textarea.id = 'annotation-text-editor-' + id;
    textarea.name = 'annotation-text-editor';
    textarea.value = textNode.text();
    textarea.style.position = 'absolute';
    textarea.style.top = `${areaPosition.y}px`;
    textarea.style.left = `${areaPosition.x}px`;
    textarea.style.width = `${Math.max(100, textNode.width() * 1.2)}px`;
    textarea.style.height = `${Math.max(40, textNode.height() * 1.2)}px`;
    textarea.style.fontSize = `${textNode.fontSize()}px`;
    textarea.style.fontFamily = textNode.fontFamily();
    textarea.style.padding = '2px';
    textarea.style.border = '1px solid #0078d7';
    textarea.style.borderRadius = '2px';
    textarea.style.boxShadow = '0 0 5px rgba(0,120,215,0.3)';
    textarea.style.background = 'white';
    textarea.style.color = '#333';
    textarea.style.zIndex = '10000';
    textarea.style.outline = 'none';
    
    // Remove any existing text editor
    const existingTextarea = document.getElementById('annotation-text-editor-' + id);
    if (existingTextarea) {
      document.body.removeChild(existingTextarea);
    }
    
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    const saveText = (newText: string) => {
      console.log('Saving text:', newText);
      const updatedAnnotations = annotations.map(ann => {
        if (ann.id === id) {
          return { ...ann, text: newText };
        }
        return ann;
      });
      
      setAnnotations(updatedAnnotations);
      setHasChanges(true);
      if (layerRef.current) {
        layerRef.current.batchDraw();
      }
    };
    
    const removeTextarea = () => {
      if (textarea.parentNode) {
        document.body.removeChild(textarea);
      }
    };
    
    // Save on blur
    textarea.addEventListener('blur', () => {
      saveText(textarea.value);
      removeTextarea();
    });
    
    // Save on Enter, cancel on Escape
    textarea.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveText(textarea.value);
        removeTextarea();
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        removeTextarea();
      }
    });
  };

  // Fixed save button implementation
  const handleSave = () => {
    console.log("Save button clicked, image dimensions:", image?.width, "x", image?.height);
    console.log("Annotations count:", annotations.length);
    setIsSaving(true);
    
    if (!stageRef.current || !image) {
      console.error("No stage reference or image not loaded");
      setIsSaving(false);
      return;
    }
    
    try {
      // Hide transformer before saving
      if (transformerRef.current) {
        transformerRef.current.nodes([]);
      }
      
      // Make sure stage is properly sized
      if (stageRef.current) {
        stageRef.current.width(image.width);
        stageRef.current.height(image.height);
      }
      
      // Force layer redraw to ensure all elements are rendered
      if (layerRef.current) {
        layerRef.current.batchDraw();
      }
      
      // Wait for rendering to complete
      setTimeout(() => {
        try {
          // Generate optimized image with reduced quality
          const dataUrl = stageRef.current!.toDataURL({
            pixelRatio: 1, // Reduced from 2
            mimeType: 'image/jpeg', // Changed from image/png
            quality: 0.8 // Added quality parameter (0.8 = 80%)
          });
          
          console.log("Generated dataURL successfully, length:", dataUrl.length);
          
          // Call the onSave callback provided by parent component
          onSave(dataUrl);
          setHasChanges(false);
          setIsSaving(false);
        } catch (error) {
          console.error("Error generating dataURL:", error);
          setIsSaving(false);
        }
      }, 100);
    } catch (error) {
      console.error("Error in save process:", error);
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      onCancel();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-900 bg-opacity-80 z-50 flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full"
        style={{
          width: '95%',
          maxWidth: '1200px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Image Annotation</h2>
          <button 
            onClick={handleCancel}
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Tools panel */}
          <div 
            className="p-4 border-r flex flex-col items-center gap-4"
            style={{
              borderRight: '1px solid #e5e7eb', 
              width: '60px',
              backgroundColor: '#f9fafb'
            }}
          >
            <button 
              className={`p-2 rounded-lg ${tool === 'select' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              onClick={() => setTool('select')}
              title="Select (V)"
            >
              <MousePointer size={20} />
            </button>
            <button 
              className={`p-2 rounded-lg ${tool === 'rectangle' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              onClick={() => setTool('rectangle')}
              title="Rectangle (R)"
            >
              <Square size={20} />
            </button>
            <button 
              className={`p-2 rounded-lg ${tool === 'circle' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              onClick={() => setTool('circle')}
              title="Circle (C)"
            >
              <LucideCircle size={20} />
            </button>
            <button 
              className={`p-2 rounded-lg ${tool === 'highlight' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              onClick={() => setTool('highlight')}
              title="Highlight (H)"
            >
              <Highlighter size={20} />
            </button>
            <button 
              className={`p-2 rounded-lg ${tool === 'text' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              onClick={() => setTool('text')}
              title="Text (T)"
            >
              <Type size={20} />
            </button>
            <button 
              className={`p-2 rounded-lg ${tool === 'arrow' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              onClick={() => setTool('arrow')}
              title="Arrow (A)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            {/* Style options button */}
            <button
              className="p-2 rounded-lg hover:bg-gray-100 mt-4"
              onClick={() => setShowStyleOptions(prev => !prev)}
              title="Style Options"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </button>

            {/* Keyboard shortcuts help button */}
            <button
              className="p-2 rounded-lg hover:bg-gray-100 mt-4"
              onClick={() => setShowShortcutsHelp(prev => !prev)}
              title="Keyboard Shortcuts"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                <line x1="6" y1="8" x2="18" y2="8" />
                <line x1="6" y1="12" x2="18" y2="12" />
                <line x1="6" y1="16" x2="18" y2="16" />
              </svg>
            </button>
          </div>
          
          {/* Canvas area */}
          <div className="flex-1 overflow-auto p-4">
            {image && (
              <Stage
                width={image.width}
                height={image.height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                ref={stageRef}
                style={{ margin: '0 auto' }}
              >
                <Layer ref={layerRef}>
                  <Image image={image} />
                  
                  {/* Render existing annotations */}
                  {annotations.map((ann) => {
                    if (ann.type === 'rectangle' || ann.type === 'highlight') {
                      return (
                        <Rect
                          key={ann.id}
                          id={ann.id}
                          x={ann.x}
                          y={ann.y}
                          width={ann.width || 0}
                          height={ann.height || 0}
                          fill={ann.fill}
                          stroke={ann.stroke}
                          strokeWidth={ann.strokeWidth}
                          opacity={ann.opacity}
                          draggable={tool === 'select'}
                          onClick={() => tool === 'select' && setSelectedId(ann.id)}
                        />
                      );
                    } else if (ann.type === 'circle') {
                      return (
                        <Circle
                          key={ann.id}
                          id={ann.id}
                          x={ann.x}
                          y={ann.y}
                          radius={ann.radius || 0}
                          stroke={ann.stroke}
                          strokeWidth={ann.strokeWidth}
                          opacity={ann.opacity}
                          draggable={tool === 'select'}
                          onClick={() => tool === 'select' && setSelectedId(ann.id)}
                        />
                      );
                    } else if (ann.type === 'text') {
                      return (
                        <Text
                          key={ann.id}
                          id={ann.id}
                          x={ann.x}
                          y={ann.y}
                          text={ann.text || ''}
                          fontSize={ann.fontSize}
                          fontFamily={ann.fontFamily}
                          fill={ann.fill}
                          draggable={tool === 'select'}
                          onClick={() => tool === 'select' && setSelectedId(ann.id)}
                          onDblClick={(e) => handleTextDblClick(e, ann.id)}
                          onDblTap={(e) => handleTextDblClick(e, ann.id)}
                        />
                      );
                    } else if (ann.type === 'arrow') {
                      return (
                        <Line
                          key={ann.id}
                          id={ann.id}
                          points={ann.points || []}
                          stroke={ann.stroke}
                          strokeWidth={ann.strokeWidth}
                          draggable={tool === 'select'}
                          onClick={() => tool === 'select' && setSelectedId(ann.id)}
                          // Arrow properties
                          lineCap="round"
                          lineJoin="round"
                          pointerLength={10}
                          pointerWidth={10}
                          pointerAtEnding={true}
                        />
                      );
                    }
                    return null;
                  })}
                  
                  {/* Render new annotation being created */}
                  {newAnnotation && (
                    <>
                      {newAnnotation.type === 'rectangle' && (
                        <Rect
                          x={newAnnotation.x}
                          y={newAnnotation.y}
                          width={newAnnotation.width || 0}
                          height={newAnnotation.height || 0}
                          stroke={newAnnotation.stroke}
                          strokeWidth={newAnnotation.strokeWidth}
                        />
                      )}
                      {newAnnotation.type === 'circle' && (
                        <Circle
                          x={newAnnotation.x}
                          y={newAnnotation.y}
                          radius={newAnnotation.radius || 0}
                          stroke={newAnnotation.stroke}
                          strokeWidth={newAnnotation.strokeWidth}
                        />
                      )}
                      {newAnnotation.type === 'highlight' && (
                        <Rect
                          x={newAnnotation.x}
                          y={newAnnotation.y}
                          width={newAnnotation.width || 0}
                          height={newAnnotation.height || 0}
                          fill={newAnnotation.fill}
                          opacity={newAnnotation.opacity}
                        />
                      )}
                      {newAnnotation.type === 'arrow' && (
                        <Line
                          points={newAnnotation.points || []}
                          stroke={newAnnotation.stroke}
                          strokeWidth={newAnnotation.strokeWidth}
                          lineCap="round"
                          lineJoin="round"
                          pointerLength={10}
                          pointerWidth={10}
                          pointerAtEnding={true}
                        />
                      )}
                    </>
                  )}
                  
                  {/* Transformer for resizing objects */}
                  <Transformer
                    ref={transformerRef}
                    boundBoxFunc={(oldBox, newBox) => {
                      // Limit minimum size
                      if (newBox.width < 5 || newBox.height < 5) {
                        return oldBox;
                      }
                      return newBox;
                    }}
                  />
                </Layer>
              </Stage>
            )}
          </div>

          {/* Style options panel */}
          {showStyleOptions && (
            <div 
              className="absolute top-16 right-16 bg-white p-4 rounded-lg shadow-lg z-30"
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 30,
                border: '1px solid #e5e7eb',
                width: '260px'
              }}
            >
              <h3 className="font-bold mb-3">Style Options</h3>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Line Thickness</label>
                <div className="flex items-center">
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={strokeWidth} 
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="w-full mr-2"
                  />
                  <span className="text-sm">{strokeWidth}px</span>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Line Color</label>
                <div className="flex flex-wrap gap-2">
                  {['#00A0FF', '#FF3B30', '#4CD964', '#FF9500', '#000000'].map(color => (
                    <button 
                      key={color}
                      onClick={() => setStrokeColor(color)}
                      style={{
                        backgroundColor: color,
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: strokeColor === color ? '2px solid #0070f3' : '1px solid #ddd'
                      }}
                      aria-label={`Set color to ${color}`}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    style={{ width: '24px', height: '24px' }}
                  />
                </div>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Fill Color</label>
                <div className="flex flex-wrap gap-2">
                  {['#FFCC00', '#FF9500', '#4CD964', '#FF3B30', '#00A0FF'].map(color => (
                    <button 
                      key={color}
                      onClick={() => setFillColor(color)}
                      style={{
                        backgroundColor: color,
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: fillColor === color ? '2px solid #0070f3' : '1px solid #ddd'
                      }}
                      aria-label={`Set color to ${color}`}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    style={{ width: '24px', height: '24px' }}
                  />
                </div>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Text Color</label>
                <div className="flex flex-wrap gap-2">
                  {['#333333', '#000000', '#FF3B30', '#00A0FF', '#FFFFFF'].map(color => (
                    <button 
                      key={color}
                      onClick={() => setTextColor(color)}
                      style={{
                        backgroundColor: color,
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: textColor === color ? '2px solid #0070f3' : '1px solid #ddd'
                      }}
                      aria-label={`Set color to ${color}`}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    style={{ width: '24px', height: '24px' }}
                  />
                </div>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Font Size</label>
                <div className="flex items-center">
                  <input 
                    type="range" 
                    min="10" 
                    max="36" 
                    value={fontSize} 
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full mr-2"
                  />
                  <span className="text-sm">{fontSize}px</span>
                </div>
              </div>
              
              <button
                className="mt-2 text-blue-600 text-sm"
                onClick={() => setShowStyleOptions(false)}
              >
                Close
              </button>
            </div>
          )}

          {/* Keyboard shortcuts help */}
          {showShortcutsHelp && (
            <div 
              className="absolute top-16 left-16 bg-white p-4 rounded-lg shadow-lg z-30"
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 30,
                border: '1px solid #e5e7eb'
              }}
            >
              <h3 className="font-bold mb-2">Keyboard Shortcuts</h3>
              <ul className="space-y-1 text-sm">
                <li><strong>V</strong> - Select tool</li>
                <li><strong>R</strong> - Rectangle tool</li>
                <li><strong>C</strong> - Circle tool</li>
                <li><strong>H</strong> - Highlight tool</li>
                <li><strong>T</strong> - Text tool</li>
                <li><strong>A</strong> - Arrow tool</li>
                <li><strong>Delete</strong> - Delete selected annotation</li>
                <li><strong>Esc</strong> - Cancel/Exit</li>
                <li><strong>Ctrl+S</strong> - Save changes</li>
              </ul>
              <button
                className="mt-3 text-blue-600 text-sm"
                onClick={() => setShowShortcutsHelp(false)}
              >
                Close
              </button>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg mr-2 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            disabled={isSaving}
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Exit confirmation dialog */}
      {showExitConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1100,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div 
            className="bg-white p-6 rounded-lg shadow-xl max-w-md"
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%'
            }}
          >
            <h3 className="text-lg font-bold mb-4">Unsaved Changes</h3>
            <p className="mb-6">You have unsaved changes. Are you sure you want to exit without saving?</p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 border rounded-lg"
                onClick={() => setShowExitConfirm(false)}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '8px 16px'
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
                onClick={() => {
                  setShowExitConfirm(false);
                  onCancel();
                }}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderRadius: '6px',
                  padding: '8px 16px'
                }}
              >
                Exit Without Saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageAnnotator;