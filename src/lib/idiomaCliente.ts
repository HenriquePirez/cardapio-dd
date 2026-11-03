/**
 * Aplicação do idioma no documento. Separado do componente de controles para
 * funcionar também em páginas sem os botões (login do painel, por exemplo).
 */
import { traduzir, type ChaveTexto, type Idioma } from './idioma';

export const idiomaDocumento = (): Idioma =>
  document.documentElement.dataset.idioma === 'en' ? 'en' : 'pt';

const valoresDe = (el: HTMLElement) => ({
  n: el.dataset.n ?? '',
  nome: el.dataset.nome ?? '',
  total: el.dataset.total ?? '',
});

export function aplicarIdioma(): void {
  const atual = idiomaDocumento();

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = traduzir(atual, el.dataset.i18n as ChaveTexto, valoresDe(el));
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute(
      'aria-label',
      traduzir(atual, el.dataset.i18nAria as ChaveTexto, valoresDe(el)),
    );
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-alt]').forEach((el) => {
    el.setAttribute('alt', traduzir(atual, el.dataset.i18nAlt as ChaveTexto, valoresDe(el)));
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-ph]').forEach((el) => {
    el.setAttribute(
      'placeholder',
      traduzir(atual, el.dataset.i18nPh as ChaveTexto, valoresDe(el)),
    );
  });

  document.documentElement.lang = atual === 'en' ? 'en' : 'pt-BR';
}
