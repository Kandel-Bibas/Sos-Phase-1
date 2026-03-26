import { useState, useCallback } from 'react';
import axios from 'axios';

interface PDFState {
  url: string | null;
  page: number;
  docName: string;
  isLoading: boolean;
  error: string | null;
  width: number;
}

export function usePDF(docsEndpoint: string, apiKey?: string) {
  const [state, setState] = useState<PDFState>({
    url: null,
    page: 1,
    docName: '',
    isLoading: false,
    error: null,
    width: 900,
  });

  const openPage = useCallback(async (document: string, page: number) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      url: null,
      docName: document,
      page,
    }));

    if (!docsEndpoint) {
      setState(prev => ({
        ...prev,
        error: 'Docs endpoint not configured.',
        isLoading: false,
      }));
      return;
    }

    try {
      const response = await axios.post(
        docsEndpoint,
        { filename: document },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'x-api-key': apiKey } : {}),
          },
          timeout: 30000,
        }
      );

      const data = response.data;
      const url = typeof data?.body === 'string'
        ? JSON.parse(data.body).url
        : data?.url;

      if (!url) throw new Error('No URL returned from docs API');

      setState(prev => ({ ...prev, url, isLoading: false }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to fetch PDF',
        isLoading: false,
      }));
    }
  }, [docsEndpoint, apiKey]);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, docName: '', url: null, error: null }));
  }, []);

  const setWidth = useCallback((width: number) => {
    setState(prev => {
      if (width > 0 && width !== prev.width) {
        return { ...prev, width };
      }
      return prev;
    });
  }, []);

  return { ...state, openPage, close, setWidth };
}
