import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WeeklyDetail {
  id?: string;
  weekStartDate: string;
  profileName: string;
  observacoes?: string;
  problemasTecnicos?: string;
  ajustesNaPesquisa?: string;
  analiseComparativa?: string;
}

interface UseWeeklyDetailsReturn {
  weeklyDetails: Record<string, WeeklyDetail>;
  isLoading: boolean;
  loadWeeklyDetails: (profileName: string) => Promise<void>;
  saveWeeklyDetail: (detail: WeeklyDetail) => Promise<void>;
  getDetailForWeek: (weekStartDate: string, field: string) => string;
}

export function useWeeklyDetails(): UseWeeklyDetailsReturn {
  const [weeklyDetails, setWeeklyDetails] = useState<Record<string, WeeklyDetail>>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadWeeklyDetails = useCallback(async (profileName: string) => {
    if (!profileName) return;
    
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('weekly_details')
        .select('*')
        .eq('user_id', user.id)
        .eq('profile_name', profileName);

      if (error) throw error;

      const detailsMap: Record<string, WeeklyDetail> = {};
      data?.forEach(item => {
        detailsMap[item.week_start_date] = {
          id: item.id,
          weekStartDate: item.week_start_date,
          profileName: item.profile_name,
          observacoes: item.observacoes || '',
          problemasTecnicos: item.problemas_tecnicos || '',
          ajustesNaPesquisa: item.ajustes_na_pesquisa || '',
          analiseComparativa: item.analise_comparativa || '',
        };
      });

      setWeeklyDetails(detailsMap);
    } catch (error) {
      console.error('Error loading weekly details:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveWeeklyDetail = useCallback(async (detail: WeeklyDetail) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { error } = await supabase
        .from('weekly_details')
        .upsert({
          user_id: user.id,
          profile_name: detail.profileName,
          week_start_date: detail.weekStartDate,
          observacoes: detail.observacoes || null,
          problemas_tecnicos: detail.problemasTecnicos || null,
          ajustes_na_pesquisa: detail.ajustesNaPesquisa || null,
          analise_comparativa: detail.analiseComparativa || null,
        }, {
          onConflict: 'user_id,profile_name,week_start_date'
        });

      if (error) throw error;

      // Update local state
      setWeeklyDetails(prev => ({
        ...prev,
        [detail.weekStartDate]: detail
      }));

      toast.success('Detalhamento salvo');
    } catch (error) {
      console.error('Error saving weekly detail:', error);
      toast.error('Erro ao salvar detalhamento');
    }
  }, []);

  const getDetailForWeek = useCallback((weekStartDate: string, field: string): string => {
    const detail = weeklyDetails[weekStartDate];
    if (!detail) return '';
    return (detail as any)[field] || '';
  }, [weeklyDetails]);

  return {
    weeklyDetails,
    isLoading,
    loadWeeklyDetails,
    saveWeeklyDetail,
    getDetailForWeek,
  };
}
