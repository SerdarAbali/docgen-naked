import React, { useState, useEffect } from 'react';
import { Folder, Plus, Check, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface CategorySelectorProps {
  selectedCategoryId: string | null;
  onChange: (categoryId: string | null) => void;
  className?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ 
  selectedCategoryId,
  onChange,
  className = ''
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://10.0.0.59:3001/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://10.0.0.59:3001/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      
      if (!response.ok) throw new Error('Failed to create category');
      const newCategory = await response.json();
      
      setCategories([...categories, newCategory]);
      onChange(newCategory.id);
      setNewCategoryName('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Error creating category:', err);
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCategoryName = () => {
    if (!selectedCategoryId) return 'Uncategorized';
    const category = categories.find(c => c.id === selectedCategoryId);
    return category ? category.name : 'Uncategorized';
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Folder size={18} className="text-gray-500" />
        <span className="flex-1 text-sm truncate">{getSelectedCategoryName()}</span>
        <span className="text-gray-500">{expanded ? '▲' : '▼'}</span>
      </div>
      
      {expanded && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
          <div className="p-1">
            <div 
              className={`px-3 py-2 rounded-md text-sm cursor-pointer flex items-center ${!selectedCategoryId ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
              onClick={() => {
                onChange(null);
                setExpanded(false);
              }}
            >
              <span className="flex-1">Uncategorized</span>
              {!selectedCategoryId && <Check size={16} />}
            </div>
            
            {categories.map(category => (
              <div 
                key={category.id}
                className={`px-3 py-2 rounded-md text-sm cursor-pointer flex items-center ${selectedCategoryId === category.id ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
                onClick={() => {
                  onChange(category.id);
                  setExpanded(false);
                }}
              >
                <span className="flex-1 truncate">{category.name}</span>
                {selectedCategoryId === category.id && <Check size={16} />}
              </div>
            ))}

            {!showAddForm ? (
              <div 
                className="px-3 py-2 text-sm text-primary hover:bg-gray-100 rounded-md cursor-pointer flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddForm(true);
                }}
              >
                <Plus size={16} className="mr-2" />
                Add New Category
              </div>
            ) : (
              <div className="p-2 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') createCategory();
                      if (e.key === 'Escape') {
                        setShowAddForm(false);
                        setNewCategoryName('');
                      }
                    }}
                  />
                  <button
                    onClick={createCategory}
                    className="p-1 bg-primary text-white rounded-md hover:bg-primary-dark"
                    disabled={!newCategoryName.trim() || loading}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewCategoryName('');
                    }}
                    className="p-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    <X size={16} />
                  </button>
                </div>
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;