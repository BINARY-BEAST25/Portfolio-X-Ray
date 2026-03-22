import { createContext, useContext, useState, useCallback } from "react";
import { portfolioAPI } from "../services/api";

const PortfolioContext = createContext(null);

export const PortfolioProvider = ({ children }) => {
  const [portfolio, setPortfolio] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const fetchPortfolio = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await portfolioAPI.get();
      setPortfolio(res.data.portfolio);
    } catch (e) {
      setError(e.message || "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshNAVs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await portfolioAPI.refresh();
      setPortfolio(res.data.portfolio);
      return res.data.message;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addFund = useCallback(async (data) => {
    const res = await portfolioAPI.addFund(data);
    setPortfolio(res.data.portfolio);
    return res.data.portfolio;
  }, []);

  const updateFund = useCallback(async (id, data) => {
    const res = await portfolioAPI.updateFund(id, data);
    setPortfolio(res.data.portfolio);
  }, []);

  const deleteFund = useCallback(async (id) => {
    const res = await portfolioAPI.deleteFund(id);
    setPortfolio(res.data.portfolio);
  }, []);

  return (
    <PortfolioContext.Provider value={{
      portfolio, loading, error,
      fetchPortfolio, refreshNAVs, addFund, updateFund, deleteFund,
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used inside PortfolioProvider");
  return ctx;
};
