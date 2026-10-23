import { useEffect, useMemo, useState } from "react";
import { formatCurrencyBRL } from "../lib/formatters";
import type { ItemOrcamento, PecaERP } from "../types/autoparts";

const STORAGE_KEY = "autoparts_orcamento_v1";

function loadInitialItems(): ItemOrcamento[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ItemOrcamento[]) : [];
  } catch {
    return [];
  }
}

export function useOrcamento() {
  const [itens, setItens] = useState<ItemOrcamento[]>(loadInitialItems);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
    } catch {
      // Ignora erro de quota do localStorage
    }
  }, [itens]);

  const adicionarPeca = (peca: PecaERP) => {
    if (!peca.em_estoque || peca.preco === null || peca.quantidade === null || peca.quantidade <= 0) {
      return;
    }
    const precoValido = peca.preco;
    const estoqueMax = peca.quantidade;

    setItens((atuais) => {
      const existente = atuais.find((item) => item.sku === peca.sku);
      if (existente) {
        return atuais.map((item) =>
          item.sku === peca.sku
            ? {
                ...item,
                quantidadeSelecionada: Math.min(item.quantidadeSelecionada + 1, estoqueMax),
                estoqueMaximo: estoqueMax,
              }
            : item
        );
      }
      return [
        ...atuais,
        {
          sku: peca.sku,
          nome_peca: peca.nome_peca,
          preco: precoValido,
          quantidadeSelecionada: 1,
          estoqueMaximo: estoqueMax,
        },
      ];
    });
  };

  const alterarQuantidade = (sku: string, delta: number) => {
    setItens((atuais) =>
      atuais
        .map((item) => {
          if (item.sku !== sku) return item;
          const novaQtd = Math.min(item.estoqueMaximo, item.quantidadeSelecionada + delta);
          return { ...item, quantidadeSelecionada: novaQtd };
        })
        .filter((item) => item.quantidadeSelecionada > 0)
    );
  };

  const removerItem = (sku: string) => {
    setItens((atuais) => atuais.filter((item) => item.sku !== sku));
  };

  const limparOrcamento = () => {
    setItens([]);
  };

  const totalUnidades = useMemo(
    () => itens.reduce((acc, item) => acc + item.quantidadeSelecionada, 0),
    [itens]
  );

  const valorTotal = useMemo(
    () => itens.reduce((acc, item) => acc + item.preco * item.quantidadeSelecionada, 0),
    [itens]
  );

  const gerarResumoTexto = (): string => {
    const linhas = itens.map(
      (i) =>
        `- ${i.quantidadeSelecionada}x [${i.sku}] ${i.nome_peca} (${formatCurrencyBRL(
          i.preco
        )} un.) = ${formatCurrencyBRL(i.preco * i.quantidadeSelecionada)}`
    );
    return [
      "ORÇAMENTO AUTOPARTS AI",
      ...linhas,
      `TOTAL: ${formatCurrencyBRL(valorTotal)}`,
    ].join("\n");
  };

  return {
    itens,
    totalUnidades,
    valorTotal,
    adicionarPeca,
    alterarQuantidade,
    removerItem,
    limparOrcamento,
    gerarResumoTexto,
  };
}
