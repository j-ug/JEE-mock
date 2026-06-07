import React, { useState, useEffect, useRef } from 'react';
import { Pencil, X, Check, RotateCcw } from 'lucide-react';

export const ManualEditor = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);
  const originalContents = useRef<Map<HTMLElement, string>>(new Map());

  useEffect(() => {
    if (isEditing) {
      document.body.style.cursor = 'crosshair';
      
      const handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Don't edit the editor buttons themselves
        if (target.closest('#manual-editor-controls')) return;
        
        e.preventDefault();
        e.stopPropagation();

        // If this is the first time editing this element, save original content
        if (!originalContents.current.has(target)) {
          originalContents.current.set(target, target.innerHTML);
        }

        // Disable previous
        if (activeElement && activeElement !== target) {
          activeElement.contentEditable = 'false';
          activeElement.style.outline = 'none';
        }

        // Enable current
        target.contentEditable = 'true';
        target.style.outline = '2px solid #10b981'; // Emerald/Green border
        target.focus();
        setActiveElement(target);
      };

      document.addEventListener('click', handler, true);
      return () => {
        document.removeEventListener('click', handler, true);
        if (activeElement) {
          activeElement.contentEditable = 'false';
          activeElement.style.outline = 'none';
        }
        document.body.style.cursor = 'default';
      };
    }
  }, [isEditing, activeElement]);

  const getCssSelector = (element: HTMLElement): string => {
    if (element.id) return `#${element.id}`;
    let path = element.tagName.toLowerCase();
    let parent = element.parentElement;
    while (parent && parent.className !== 'root-container' && parent.tagName !== 'BODY') {
      const index = Array.from(parent.children).indexOf(element) + 1;
      path = `${parent.tagName.toLowerCase()}:nth-child(${index}) > ${path}`;
      element = parent;
      parent = element.parentElement;
    }
    return path;
  };

  useEffect(() => {
    // Apply persisted overrides
    const applyOverrides = () => {
      const overrides = JSON.parse(localStorage.getItem('ui_overrides') || '{}');
      Object.entries(overrides).forEach(([selector, content]) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.innerHTML !== content) {
            (el as HTMLElement).innerHTML = content as string;
          }
        });
      });
    };

    applyOverrides();
    // Re-apply on DOM changes to handle SPA route changes/lazy loading
    const observer = new MutationObserver(applyOverrides);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => observer.disconnect();
  }, []);

  const handleSave = () => {
    if (activeElement) {
      activeElement.contentEditable = 'false';
      activeElement.style.outline = 'none';
    }
    
    // Persist all modified elements
    const overrides = JSON.parse(localStorage.getItem('ui_overrides') || '{}');
    originalContents.current.forEach((_, element) => {
      const selector = getCssSelector(element);
      overrides[selector] = element.innerHTML;
    });
    localStorage.setItem('ui_overrides', JSON.stringify(overrides));
    
    setActiveElement(null);
    setIsEditing(false);
    originalContents.current.clear();
  };

  const handleAbort = () => {
    // Restore all
    originalContents.current.forEach((originalContent, element) => {
      element.innerHTML = originalContent;
      element.contentEditable = 'false';
      element.style.outline = 'none';
    });
    originalContents.current.clear();
    setActiveElement(null);
    setIsEditing(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex gap-2" id="manual-editor-controls">
      {isEditing && (
        <>
          <button 
            onClick={handleSave}
            title="Save Changes"
            className="p-4 rounded-full shadow-lg bg-emerald-600 text-white transition-all hover:scale-110"
          >
            <Check size={24} />
          </button>
          <button 
            onClick={handleAbort}
            title="Discard Changes"
            className="p-4 rounded-full shadow-lg bg-yellow-600 text-white transition-all hover:scale-110"
          >
            <RotateCcw size={24} />
          </button>
        </>
      )}
      <button 
        onClick={() => setIsEditing(!isEditing)}
        className={`p-4 rounded-full shadow-lg ${isEditing ? 'bg-red-500' : 'bg-emerald-600'} text-white transition-all hover:scale-110`}
      >
        {isEditing ? <X size={24} /> : <Pencil size={24} />}
      </button>
    </div>
  );
};
