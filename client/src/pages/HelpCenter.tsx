import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Video, Edit, Download, HelpCircle, Image, Folder } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
  category: string;
}

const HelpCenter: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const faqItems: FAQItem[] = [
    {
      question: "What is documentit?",
      answer: (
        <div>
          <p>documentit is a documentation generation tool that automatically transforms video content into structured documentation. It uses AI to transcribe your videos, segment them into logical steps, and generate documentation with screenshots and timestamps.</p>
          <p>Key features include:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Automatic transcription and segmentation</li>
            <li>Screenshot capture and annotation</li>
            <li>Rich text editing</li>
            <li>Step categorization and organization</li>
            <li>Multiple export formats (Markdown, HTML, PDF)</li>
            <li>GitHub publishing</li>
          </ul>
        </div>
      ),
      category: "General"
    },
    {
      question: "How do I upload a video?",
      answer: (
        <div>
          <p>To upload a video:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Navigate to the documentit homepage</li>
            <li>Drag and drop your video file onto the upload area, or click "Select Video" to browse for a file</li>
            <li>Enter an optional title for your documentation (if left blank, the filename will be used)</li>
            <li>Select a category for your documentation (optional)</li>
            <li>Click "Start Processing" to begin the automatic transcription and documentation generation</li>
          </ol>
          <p className="mt-2">Supported video formats include MP4, MOV, AVI, and most other common formats. Maximum file size is 100MB.</p>
        </div>
      ),
      category: "Getting Started"
    },
    {
      question: "What happens after I upload a video?",
      answer: (
        <div>
          <p>After uploading a video, documentit processes it in several steps:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Extracting audio from the video</li>
            <li>Transcribing the audio using AI</li>
            <li>Segmenting the transcription into logical steps</li>
            <li>Generating screenshots for each segment</li>
            <li>Creating an editable draft document</li>
          </ol>
          <p className="mt-2">You'll see a progress indicator during this process. When completed, you'll be presented with the segmented transcription for review.</p>
        </div>
      ),
      category: "Getting Started"
    },
    {
      question: "How do I review and edit segments?",
      answer: (
        <div>
          <p>After your video is processed, you'll be presented with the Segment Review screen:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Review each automatically generated segment</li>
            <li>Play segments to verify accuracy</li>
            <li>Select segments to merge if needed</li>
            <li>Once satisfied, click "Finalize and Generate Documentation"</li>
          </ol>
          <p className="mt-2">You can always make further edits after the documentation is generated.</p>
        </div>
      ),
      category: "Editing"
    },
    {
      question: "How do I add a title to steps?",
      answer: (
        <div>
          <p>To add a title to a step:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Open your document in edit mode by clicking the "Edit" button</li>
            <li>Click the edit button (pencil icon) next to the step you want to modify</li>
            <li>Enter a title in the "Step Title" field at the top of the editor</li>
            <li>Click "Save Changes" to apply your edits</li>
          </ol>
          <p className="mt-2">Step titles are optional but help organize your documentation and make it more readable.</p>
        </div>
      ),
      category: "Editing"
    },
    {
      question: "How do I organize my documents with categories?",
      answer: (
        <div>
          <p>documentit allows you to organize your documentation using categories:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>When uploading a new video, you can select an existing category or create a new one</li>
            <li>To change a document's category after creation, open it in edit mode and select a category from the dropdown in the Overview section</li>
            <li>In the Documents List, you can filter by category to find related documentation quickly</li>
          </ol>
          <p className="mt-2">Categories help you organize your documentation library, especially as it grows.</p>
        </div>
      ),
      category: "Organization"
    },
    {
      question: "How do I add or change screenshots?",
      answer: (
        <div>
          <p>To add or modify screenshots in your documentation:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Open your document in edit mode</li>
            <li>Click the edit button (pencil icon) next to the step</li>
            <li>For steps without screenshots, click "Upload Screenshot"</li>
            <li>For steps with existing screenshots, click "Change Screenshot"</li>
            <li>Select an image file from your computer</li>
            <li>Click "Save Changes" to update the step</li>
          </ol>
          <p className="mt-2">Supported image formats include PNG, JPG, and GIF. Maximum file size is 20MB.</p>
        </div>
      ),
      category: "Media"
    },
    {
      question: "How do I annotate screenshots?",
      answer: (
        <div>
          <p>documentit includes a powerful annotation tool for your screenshots:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Edit a step with an existing screenshot</li>
            <li>Click the "Annotate" button</li>
            <li>Use the annotation tools on the left sidebar:</li>
            <ul className="list-disc pl-5 mt-1 mb-1">
              <li>Rectangle (R): Draw rectangles to highlight areas</li>
              <li>Circle (C): Draw circles around important elements</li>
              <li>Text (T): Add text labels</li>
              <li>Highlight (H): Create translucent highlights</li>
              <li>Arrow (A): Draw arrows pointing to features</li>
            </ul>
            <li>Use the Style options to change colors and line thickness</li>
            <li>Click "Save" to apply your annotations</li>
          </ol>
          <p className="mt-2">You can use keyboard shortcuts (shown in parentheses above) for faster annotation.</p>
        </div>
      ),
      category: "Media"
    },
    {
      question: "How do I reorder steps in my documentation?",
      answer: (
        <div>
          <p>To reorder the steps in your documentation:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Open your document in edit mode</li>
            <li>Click and drag a step by its handle (the dots icon) to move it</li>
            <li>Drop the step at the desired position</li>
            <li>Click "Save Order" to apply your changes</li>
          </ol>
          <p className="mt-2">You can also use the up and down arrow buttons to move steps one position at a time.</p>
        </div>
      ),
      category: "Organization"
    },
    {
      question: "How do I add a new step?",
      answer: (
        <div>
          <p>To add a new step to your documentation:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Open your document in edit mode</li>
            <li>Click the "Add Step" button at the top of the page</li>
            <li>A new blank step will be added at the end of your document</li>
            <li>Edit the step to add content, title, and screenshots as needed</li>
            <li>Click "Save Changes" to complete the addition</li>
          </ol>
          <p className="mt-2">You can also add steps directly from video segments by clicking "Add Step from Video" and selecting a timestamp.</p>
        </div>
      ),
      category: "Editing"
    },
    {
      question: "How do I export my documentation?",
      answer: (
        <div>
          <p>documentit supports multiple export formats:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Open your documentation in view mode</li>
            <li>Click the "Export" button</li>
            <li>Select your desired format:</li>
            <ul className="list-disc pl-5 mt-1 mb-1">
              <li>Markdown: For version control systems and plain text</li>
              <li>HTML: For web publication</li>
              <li>PDF: For sharing and printing</li>
            </ul>
            <li>Your browser will download the exported file</li>
          </ol>
          <p className="mt-2">All exported formats include your step titles, content, and screenshots.</p>
        </div>
      ),
      category: "Publishing"
    },
    {
      question: "How do I publish documentation to GitHub?",
      answer: (
        <div>
          <p>To publish your documentation directly to GitHub:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Open your documentation in view mode</li>
            <li>Navigate to the "Publish Documentation" section</li>
            <li>Enter your GitHub repository in the format "username/repo"</li>
            <li>Provide a personal access token with write permissions</li>
            <li>Specify the directory path where you want the documentation to be saved</li>
            <li>Click "Publish to GitHub"</li>
          </ol>
          <p className="mt-2">The documentation will be published as a Markdown file, including all images and formatting.</p>
        </div>
      ),
      category: "Publishing"
    }
  ];

  const categories = Array.from(new Set(faqItems.map(item => item.category)));

  const toggleItem = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const filteredItems = faqItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !activeCategory || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">documentit Help Center</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Find answers to common questions about documentit's features and functionality
        </p>
      </div>
      
      <div className="mb-8">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search for answers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>
      
      <div className="mb-8 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm ${
            activeCategory === null
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1.5 rounded-full text-sm flex items-center ${
              activeCategory === category
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category === 'General' && <HelpCircle size={14} className="mr-1" />}
            {category === 'Getting Started' && <Video size={14} className="mr-1" />}
            {category === 'Editing' && <Edit size={14} className="mr-1" />}
            {category === 'Media' && <Image size={14} className="mr-1" />}
            {category === 'Organization' && <Folder size={14} className="mr-1" />}
            {category === 'Publishing' && <Download size={14} className="mr-1" />}
            {category}
          </button>
        ))}
      </div>
      
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-10">
            <HelpCircle size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">No results found</h3>
            <p className="text-gray-500">
              Try using different keywords or browse all categories
            </p>
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white transition-all duration-200"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50"
              >
                <h3 className="font-medium text-gray-800">{item.question}</h3>
                {activeIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
              
              {activeIndex === index && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <div className="prose prose-sm max-w-none text-gray-600">
                    {item.answer}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="mt-12 bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Still need help?</h3>
        <p className="text-gray-600 mb-4">
          If you couldn't find the answer you were looking for, please contact our support team.
        </p>
        <a
          href="mailto:support@documentit.example.com"
          className="btn-primary inline-flex items-center px-4 py-2"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
};

export default HelpCenter;