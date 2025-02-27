//This file is located at /docgen/src/pages/edit/[id].tsx
import React from 'react';
import Layout from '@theme/Layout';
import DocEditor from '@site/src/components/DocEditor';
import { useLocation } from '@docusaurus/router';

export default function EditPage(): JSX.Element {
  const location = useLocation();
  const documentId = location.pathname.split('/edit/')[1];

  if (!documentId) {
    return (
      <Layout title="Edit Documentation">
        <main className="container margin-vert--lg">
          <div className="alert alert--danger">
            <p>Invalid document ID</p>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Edit Documentation"
      noFooter
    >
      <div style={{ 
        backgroundColor: '#1B1B1D',
        minHeight: 'calc(100vh - 60px)',
        paddingTop: '1rem'
      }}>
        <DocEditor documentId={documentId} />
      </div>
    </Layout>
  );
}