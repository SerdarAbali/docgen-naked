import React from 'react';
import { Link } from 'react-router-dom';
import { Video, FileText, Edit, Plus, Download, Github, Folder, BookOpen } from 'lucide-react';

const Tutorials: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">documentit Tutorials</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Learn how to use documentit effectively with these step-by-step tutorials
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tutorials.map((tutorial, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-1 bg-primary/10">
              <div className="flex items-center justify-center h-48 bg-gray-50 text-primary">
                {tutorial.icon}
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{tutorial.title}</h3>
              <p className="text-gray-600 mb-4">{tutorial.description}</p>
              <span className="inline-flex items-center text-primary font-medium hover:underline cursor-pointer">
                <BookOpen className="w-4 h-4 mr-1" />
                Read Tutorial
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-primary/5 border border-primary/20 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Video Walkthroughs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="aspect-video bg-gray-100 mb-4 flex items-center justify-center">
              <Video className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Getting Started with documentit</h3>
            <p className="text-gray-600 mb-4">A comprehensive introduction to creating your first documentation project.</p>
            <span className="text-primary font-medium hover:underline cursor-pointer">Watch Now</span>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="aspect-video bg-gray-100 mb-4 flex items-center justify-center">
              <Video className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Advanced Editing Techniques</h3>
            <p className="text-gray-600 mb-4">Learn advanced editing and organization techniques for professional documentation.</p>
            <span className="text-primary font-medium hover:underline cursor-pointer">Watch Now</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const tutorials = [
  {
    title: "Creating Your First Documentation",
    description: "Learn how to upload a video and create your first automatically generated documentation.",
    icon: <Video size={64} />
  },
  {
    title: "Editing and Organizing Steps",
    description: "Master the techniques for editing, organizing, and enhancing your documentation steps.",
    icon: <Edit size={64} />
  },
  {
    title: "Working with Categories",
    description: "Learn how to use categories to organize and manage your documentation library effectively.",
    icon: <Folder size={64} />
  },
  {
    title: "Adding Custom Step Titles",
    description: "Enhance your documentation by adding descriptive titles to each step for better navigation.",
    icon: <Plus size={64} />
  },
  {
    title: "Exporting Documentation",
    description: "Export your documentation in various formats including Markdown, HTML, and PDF.",
    icon: <Download size={64} />
  },
  {
    title: "Publishing to GitHub",
    description: "Learn how to publish your documentation directly to GitHub repositories.",
    icon: <Github size={64} />
  }
];

export default Tutorials;