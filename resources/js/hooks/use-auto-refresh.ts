import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';

export function useAutoRefresh<T>(url: string, intervalMs: number = 60000) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const response = await axios.get(url);
            setData(response.data.data || response.data);
            setError(null);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message || 'Failed to fetch data');
            } else {
                setError('An unknown error occurred');
            }
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        fetchData();
        if (intervalMs > 0) {
            const id = setInterval(fetchData, intervalMs);
            return () => clearInterval(id);
        }
    }, [fetchData, intervalMs]);

    return { data, loading, error, refetch: fetchData };
}
