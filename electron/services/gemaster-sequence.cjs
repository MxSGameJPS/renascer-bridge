function buildGemasterSequence(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Nenhum item disponível para envio.");
  const sequence = [];
  for (const item of items) {
    const label = item?.product_name || "produto";
    const code = String(item?.external_reference || "").trim();
    if (!/^[0-9]{1,20}$/.test(code)) throw new Error(`Referência GeMaster inválida para ${label}.`);
    const quantity = Number(item?.quantity);
    const variable = item?.requires_weight_handling === true || item?.pricing_mode === "variable";
    if (variable) {
      const amount = Number(item?.subtotal);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 999999.99 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) {
        throw new Error(`Valor inválido para ${label}. Verifique o total no Renascer.`);
      }
      // O subtotal do backend representa o valor TOTAL do item, inclusive produtos por peso.
      // Uma linha variável equivale a um lançamento no GeMaster. Nunca multiplicar pelo peso.
      sequence.push({ code, variable: true, value: amount.toFixed(2).replace(".", ",") });
      continue;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error(`Quantidade inválida para ${label}.`);
    for (let i = 0; i < quantity; i += 1) sequence.push({ code, variable: false });
  }
  if (sequence.length > 300) throw new Error("Comanda com itens demais para envio automático.");
  return sequence;
}
module.exports = { buildGemasterSequence };
