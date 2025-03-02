import React, { useEffect, useState } from 'react';

interface BrowserOnlyProps {
  children: () => React.ReactNode;
}

const BrowserOnly: React.FC<BrowserOnlyProps> = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <>{children()}</>;
};

export default BrowserOnly; 