import test from "node:test";
import assert from "node:assert/strict";
import apiModule from "../../electron/services/bridge-api-client.cjs";

const { normalizeReferenceCode, validateDispatch } = apiModule;

test("normaliza códigos Renascer aceitos pela API", () => {
  assert.equal(normalizeReferenceCode(" c105 "), "C105");
  assert.equal(normalizeReferenceCode("dv7k3m9q2x"), "DV7K3M9Q2X");
});

test("rejeita EAN e código numérico comum", () => {
  assert.throws(() => normalizeReferenceCode("7891234567890"));
  assert.throws(() => normalizeReferenceCode("105"));
});

test("valida snapshot retornado pelo backend", () => {
  const payload = {
    dispatch_id: "0f06f286-6b10-4ea5-bec6-67963ca47316",
    reference_code: "C105",
    items: [{ product_name: "Café", external_code: "221", quantity: 1 }],
  };
  assert.equal(validateDispatch(payload, "C105"), payload);
});

test("rejeita snapshot sem mapeamento GeMaster", () => {
  assert.throws(() => validateDispatch({
    dispatch_id: "0f06f286-6b10-4ea5-bec6-67963ca47316",
    reference_code: "C105",
    items: [{ product_name: "Café", external_code: "" }],
  }, "C105"));
});
