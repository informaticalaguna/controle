import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export const AUTO_REFRESH_EVENT = 'app:auto-refresh';
export const AUTO_REFRESH_COMPLETED_EVENT = 'app:auto-refresh-completed';

// Tempo mínimo sem interação (mouse/teclado) para considerar o sistema ocioso (30 segundos)
export const IDLE_THRESHOLD_MS = 30 * 1000;

// Intervalo entre atualizações automáticas enquanto ocioso (60 segundos)
export const REFRESH_INTERVAL_MS = 60 * 1000;

/**
 * Verifica se há algum sinal no DOM de que alguém está digitando, com modal aberto ou salvando dados.
 */
export function isDomUserBusy(): boolean {
  if (typeof document === 'undefined') return false;

  // 1. Não atualizar se a aba estiver oculta em segundo plano
  if (document.visibilityState !== 'visible') return true;

  // 2. Verificar se o foco está em algum campo de digitação ou seleção
  const activeEl = document.activeElement;
  if (activeEl) {
    const tag = activeEl.tagName.toUpperCase();
    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      (activeEl as HTMLElement).isContentEditable
    ) {
      return true;
    }
  }

  // 3. Verificar se algum modal ou formulário em edição/salvamento está ativo
  if (document.querySelector('[data-modal-open="true"]')) return true;
  if (document.querySelector('[data-form-busy="true"]')) return true;
  if (document.querySelector('[data-submitting="true"]')) return true;

  return false;
}

/**
 * Hook utilizado nas páginas para escutar o disparo de atualização automática em segundo plano,
 * sem recarregar a página inteira e respeitando o estado local de edição/salvamento.
 */
export function useAutoRefresh(onRefresh: () => Promise<void> | void, isBusy: boolean = false) {
  const onRefreshRef = useRef(onRefresh);
  const isBusyRef = useRef(isBusy);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    isBusyRef.current = isBusy;
  }, [isBusy]);

  useEffect(() => {
    const handleRefresh = async (e: Event) => {
      const customEvent = e as CustomEvent<{ force?: boolean }>;
      const force = customEvent.detail?.force === true;

      // Nunca interromper caso o componente local esteja editando/salvando ou o DOM indique uso ativo
      if (!force && (isBusyRef.current || isDomUserBusy())) {
        return;
      }

      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;

      try {
        // Garante que a sessão do Supabase esteja válida/renovada antes de buscar os dados
        await supabase.auth.getSession();
        await onRefreshRef.current();
        window.dispatchEvent(new CustomEvent(AUTO_REFRESH_COMPLETED_EVENT, { detail: { timestamp: new Date() } }));
      } catch (err) {
        console.error('Erro na atualização automática:', err);
      } finally {
        isRefreshingRef.current = false;
      }
    };

    window.addEventListener(AUTO_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(AUTO_REFRESH_EVENT, handleRefresh);
    };
  }, []);
}

