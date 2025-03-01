import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Mail, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-10 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">documentit</h3>
            <p className="text-gray-600 mb-4">
              Automatically generate professional documentation from video content with AI-powered transcription and customizable formatting.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="mailto:info@documentit.example.com" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Mail size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><Link to="/documentation" className="text-gray-600 hover:text-primary transition-colors">Documentation</Link></li>
              <li><Link to="/api-reference" className="text-gray-600 hover:text-primary transition-colors">API Reference</Link></li>
              <li><Link to="/tutorials" className="text-gray-600 hover:text-primary transition-colors">Tutorials</Link></li>
              <li><Link to="/help-center" className="text-gray-600 hover:text-primary transition-colors">Help Center</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link to="#" className="text-gray-600 hover:text-primary transition-colors">About</Link></li>
              <li><Link to="#" className="text-gray-600 hover:text-primary transition-colors">Blog</Link></li>
              <li><Link to="#" className="text-gray-600 hover:text-primary transition-colors">Careers</Link></li>
              <li><Link to="#" className="text-gray-600 hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} documentit. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 flex space-x-6">
            <Link to="#" className="text-gray-500 hover:text-gray-600 text-sm">
              Privacy Policy
            </Link>
            <Link to="#" className="text-gray-500 hover:text-gray-600 text-sm">
              Terms of Service
            </Link>
            <Link to="#" className="text-gray-500 hover:text-gray-600 text-sm">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;