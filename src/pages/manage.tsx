// /docgen/src/pages/manage.tsx
import React from 'react';
import Layout from '@theme/Layout';
import DocumentManager from '../components/DocumentManager';

export default function Manage(): JSX.Element {
  return (
    <Layout
      title="Document Manager"
      description="Manage generated documentation"
      wrapperClassName="pt-0" // Remove default Layout top padding
      className="bg-[var(--ifm-background-color)]" // Ensure full background
    >
      <div className="min-h-screen">
        <DocumentManager />
      </div>
    </Layout>
  );
}