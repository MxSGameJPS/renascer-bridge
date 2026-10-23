import test from "node:test";
import assert from "node:assert/strict";
import sequenceModule from "../../electron/services/gemaster-sequence.cjs";
const { buildGemasterSequence } = sequenceModule;

test("lança produtos por unidade com código e Enter", () => {
  assert.deepEqual(buildGemasterSequence([{ product_name: "Pão", external_reference: "10", quantity: 2, subtotal: 4 }]), [
    { code: "10", variable: false }, { code: "10", variable: false },
  ]);
});
test("produto pesado envia subtotal uma única vez, não multiplica pelo peso", () => {
  assert.deepEqual(buildGemasterSequence([{ product_name: "Bolo kg", external_reference: "15", pricing_mode: "variable", requires_weight_handling: true, quantity: 0.325, weight_kg: 0.325, subtotal: 19.47 }]), [
    { code: "15", variable: true, value: "19,47" },
  ]);
});
test("personalizado aceita valor cadastrado sem subproduto", () => {
  assert.deepEqual(buildGemasterSequence([{ product_name: "Refrigerantes", external_reference: "179", pricing_mode: "variable", quantity: 1, subtotal: 12.5 }]), [
    { code: "179", variable: true, value: "12,50" },
  ]);
});
test("impede valor ausente, negativo e referência inválida", () => {
  assert.throws(() => buildGemasterSequence([{ external_reference: "179", pricing_mode: "variable", subtotal: null }]));
  assert.throws(() => buildGemasterSequence([{ external_reference: "179", pricing_mode: "variable", subtotal: -2 }]));
  assert.throws(() => buildGemasterSequence([{ external_reference: "ABC", pricing_mode: "variable", subtotal: 2 }]));
});
