import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Venda from 'App/Models/Venda'
import { paraBanco, periodo } from 'App/Services/datas'

const r2 = (n: number) => Math.round(n * 100) / 100

export default class RelatoriosController {
  /**
   * Resumo do período (substitui as telas Dia/Mês do Logico, que calculavam
   * lucro no navegador). Agrupamentos em JS para funcionar em SQLite e Postgres.
   */
  public async resumo({ auth, request }: HttpContextContract) {
    const { inicio, fim } = periodo(request.input('de'), request.input('ate'))
    const vendas = await Venda.query()
      .where('tenant_id', auth.user!.tenantId)
      .where('status', 'concluida')
      .whereBetween('created_at', [paraBanco(inicio), paraBanco(fim)])
      .preload('itens')

    const faturamento = vendas.reduce((s, v) => s + v.total, 0)
    const custo = vendas.reduce((s, v) => s + v.custo, 0)

    const porForma: Record<string, number> = { dinheiro: 0, cartao: 0, pix: 0 }
    const porDia = new Map<string, { data: string; faturamento: number; lucro: number; vendas: number }>()
    const porHora = Array.from({ length: 24 }, (_, hora) => ({ hora, faturamento: 0 }))
    const porProduto = new Map<string, { nome: string; quantidade: number; faturamento: number; lucro: number }>()

    for (const venda of vendas) {
      porForma[venda.formaPagamento] = (porForma[venda.formaPagamento] ?? 0) + venda.total
      const local = venda.createdAt.setZone('America/Sao_Paulo')
      const data = local.toISODate()!
      const dia = porDia.get(data) ?? { data, faturamento: 0, lucro: 0, vendas: 0 }
      dia.faturamento += venda.total
      dia.lucro += venda.lucro
      dia.vendas += 1
      porDia.set(data, dia)
      porHora[local.hour].faturamento += venda.total

      for (const item of venda.itens) {
        const p = porProduto.get(item.nome) ?? { nome: item.nome, quantidade: 0, faturamento: 0, lucro: 0 }
        p.quantidade += item.quantidade
        p.faturamento += item.precoUnitario * item.quantidade
        p.lucro += (item.precoUnitario - item.custoUnitario) * item.quantidade
        porProduto.set(item.nome, p)
      }
    }

    return {
      de: inicio.toISODate(),
      ate: fim.toISODate(),
      faturamento: r2(faturamento),
      custo: r2(custo),
      lucro: r2(faturamento - custo),
      margem: faturamento ? Math.round(((faturamento - custo) / faturamento) * 1000) / 10 : null,
      vendas: vendas.length,
      ticketMedio: vendas.length ? r2(faturamento / vendas.length) : 0,
      porForma: Object.fromEntries(Object.entries(porForma).map(([k, v]) => [k, r2(v)])),
      porDia: [...porDia.values()]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((d) => ({ ...d, faturamento: r2(d.faturamento), lucro: r2(d.lucro) })),
      porHora: porHora.map((h) => ({ ...h, faturamento: r2(h.faturamento) })),
      topProdutos: [...porProduto.values()]
        .sort((a, b) => b.faturamento - a.faturamento)
        .slice(0, 10)
        .map((p) => ({ ...p, faturamento: r2(p.faturamento), lucro: r2(p.lucro) })),
    }
  }
}
