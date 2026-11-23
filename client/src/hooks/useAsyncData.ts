import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { ApiError } from '../lib/api';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export function useAsyncData<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: true,
  });
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    let active = true;

    setState((current) => ({ ...current, isLoading: true, error: null }));

    loader()
      .then((data) => {
        if (active) {
          setState({ data, error: null, isLoading: false });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            data: null,
            error: error instanceof ApiError ? error.message : 'Unable to load data',
            isLoading: false,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [...deps, reloadToken]);

  return { ...state, reload };
}
