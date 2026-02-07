import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  return (
    <AppContext.Provider value={{ loading, setLoading, isDarkMode, setIsDarkMode }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
